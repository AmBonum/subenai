// E44.7 — minimal raw-fetch Anthropic client for the precheck function.
//
// Why not `@anthropic-ai/sdk`: ~200 KB bundle, we use one endpoint
// (POST /v1/messages). Matches the codebase pattern (Resend in
// functions/_lib/email.ts is also raw fetch).
//
// What this module owns:
//   - the messages-create wire format (request shape, headers, version)
//   - retry-once-on-malformed-JSON loop
//   - prompt caching annotation (cache_control ephemeral on the system block)
//   - timeout via AbortController
//   - token-usage extraction for cost accounting
//
// What this module does NOT own:
//   - business validation (zod parsing) — that's in precheckSchema.ts
//   - cost ceilings, rate limits, persistence — those live in the CF function

import { z } from "zod";
import {
  PrecheckResult,
  type PrecheckEnvelope,
  derivePrecheckPassed,
} from "../../src/lib/templates/precheckSchema";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Per Appendix C § 7: Haiku 4.5 pricing as of 2026-05-20 ($ per MTok).
const PRICING = {
  input_per_mtok: 1.0,
  cache_write_per_mtok: 1.25,
  cache_read_per_mtok: 0.1,
  output_per_mtok: 5.0,
};

interface AnthropicUsage {
  input_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens: number;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: AnthropicUsage;
}

const AnthropicUsageSchema = z.object({
  input_tokens: z.number().min(0),
  cache_creation_input_tokens: z.number().min(0).optional(),
  cache_read_input_tokens: z.number().min(0).optional(),
  output_tokens: z.number().min(0),
});

const AnthropicResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })).min(1),
  model: z.string(),
  stop_reason: z.string().nullable(),
  usage: AnthropicUsageSchema,
});

export interface CallPrecheckOpts {
  apiKey: string;
  modelId: string;
  systemPrompt: string;
  userMessage: string;
  timeoutMs: number;
  maxOutputTokens?: number;
}

function costUsd(usage: AnthropicUsage): number {
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const freshInput = Math.max(0, usage.input_tokens - cacheWrite - cacheRead);
  return (
    (freshInput * PRICING.input_per_mtok +
      cacheWrite * PRICING.cache_write_per_mtok +
      cacheRead * PRICING.cache_read_per_mtok +
      usage.output_tokens * PRICING.output_per_mtok) /
    1_000_000
  );
}

// Single call to Anthropic. Returns the raw response text (the model's
// JSON) plus usage + timing. Throws on transport / 4xx / 5xx / timeout.
async function callOnce(
  opts: CallPrecheckOpts,
  retryReminder: string | null,
): Promise<{
  text: string;
  usage: AnthropicUsage;
  model: string;
  latencyMs: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const t0 = Date.now();
  try {
    // Cache the system prompt so 5-min-warm calls pay only ~$0.10/MTok
    // on the cached portion. Sent as a content-block array with
    // cache_control = ephemeral. Anthropic accepts string `system` too,
    // but only the array form supports cache_control.
    const systemBlock = retryReminder
      ? `${opts.systemPrompt}\n\n${retryReminder}`
      : opts.systemPrompt;
    const body = {
      model: opts.modelId,
      max_tokens: opts.maxOutputTokens ?? 800,
      system: [{ type: "text", text: systemBlock, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.userMessage }],
    };
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const latencyMs = Date.now() - t0;
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`anthropic_${response.status}: ${errText.slice(0, 200)}`);
    }
    const payload = (await response.json()) as AnthropicResponse;
    const parsed = AnthropicResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("anthropic_unexpected_response_shape");
    }
    const text = parsed.data.content
      .map((block) => block.text ?? "")
      .join("")
      .trim();
    return { text, usage: parsed.data.usage, model: parsed.data.model, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

function tryParseResult(
  text: string,
): { ok: true; value: PrecheckResult } | { ok: false; reason: "json" | "schema"; detail: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, reason: "json", detail: (err as Error).message };
  }
  const parsed = PrecheckResult.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "schema", detail: parsed.error.message.slice(0, 200) };
  }
  return { ok: true, value: parsed.data };
}

const RETRY_REMINDER =
  "Your previous response was not valid JSON matching the schema. Output ONLY the JSON object now, with no preamble, no markdown, and all required fields present.";

// Returns a successful envelope or throws. The caller wraps any thrown
// failure in the manual_review_required fallback envelope.
export async function callPrecheckWithRetry(opts: CallPrecheckOpts): Promise<PrecheckEnvelope> {
  const a = await callOnce(opts, null);
  const first = tryParseResult(a.text);
  if (first.ok) {
    return {
      precheck_passed: derivePrecheckPassed(first.value),
      result: first.value,
      raw_response: a.text,
      model_id: a.model,
      tokens_in: a.usage.input_tokens,
      tokens_out: a.usage.output_tokens,
      cost_usd: costUsd(a.usage),
      latency_ms: a.latencyMs,
      attempt: 1,
    };
  }

  // Retry once with stricter "JSON only" reminder appended.
  const b = await callOnce(opts, RETRY_REMINDER);
  const second = tryParseResult(b.text);
  if (second.ok) {
    return {
      precheck_passed: derivePrecheckPassed(second.value),
      result: second.value,
      raw_response: b.text,
      model_id: b.model,
      tokens_in: a.usage.input_tokens + b.usage.input_tokens,
      tokens_out: a.usage.output_tokens + b.usage.output_tokens,
      cost_usd: costUsd(a.usage) + costUsd(b.usage),
      latency_ms: a.latencyMs + b.latencyMs,
      attempt: 2,
    };
  }
  throw new Error(`precheck_malformed_after_retry: ${first.reason}/${second.reason}`);
}

export function manualReviewFallback(
  modelId: string,
  latencyMs: number,
  err: unknown,
): PrecheckEnvelope {
  const message = err instanceof Error ? err.message : String(err);
  return {
    precheck_passed: false,
    result: {
      safety: { score: 0, categories: [] },
      profanity: { score: 0, terms: [] },
      age_rating: "all",
      copyright_red_flags: [],
      summary: `manual_review_required: automatic precheck unavailable (${message.slice(0, 160)}), escalated to admin`,
    },
    raw_response: "",
    model_id: modelId,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    latency_ms: latencyMs,
    attempt: 2,
  };
}

export const __test__ = {
  costUsd,
  tryParseResult,
  RETRY_REMINDER,
};
