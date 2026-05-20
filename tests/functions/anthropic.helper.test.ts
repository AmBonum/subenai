// E44.9 Phase B — unit tests for the raw-fetch Anthropic helper.
//
// We import the helper, stub `globalThis.fetch`, and exercise:
//   - costUsd math against the Appendix C § 7 pricing constants
//   - tryParseResult (json + schema branches)
//   - manualReviewFallback envelope shape
//   - callPrecheckWithRetry behavior on success, retry, hard failure, 4xx, timeout

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  callPrecheckWithRetry,
  manualReviewFallback,
  __test__,
} from "../../functions/_lib/anthropic";

const { costUsd, tryParseResult, RETRY_REMINDER } = __test__;

const VALID_MODEL_RESPONSE = JSON.stringify({
  safety: { score: 0.1, categories: [] },
  profanity: { score: 0, terms: [] },
  age_rating: "all",
  copyright_red_flags: [],
  summary: "Looks fine.",
});

function anthropicEnvelope(text: string, usage: Partial<Record<string, number>> = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: "claude-haiku-4-5-20251001",
    stop_reason: "end_turn",
    usage: {
      input_tokens: usage.input_tokens ?? 100,
      output_tokens: usage.output_tokens ?? 50,
      ...(usage.cache_creation_input_tokens !== undefined && {
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
      }),
      ...(usage.cache_read_input_tokens !== undefined && {
        cache_read_input_tokens: usage.cache_read_input_tokens,
      }),
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const baseOpts = {
  apiKey: "test-key",
  modelId: "claude-haiku-4-5-20251001",
  systemPrompt: "system",
  userMessage: "user",
  timeoutMs: 5000,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("costUsd", () => {
  it("computes with cache_read + cache_write breakdown (Appendix C § 7 pricing)", () => {
    // Pricing per MTok: input 1.00, cache_write 1.25, cache_read 0.10, output 5.00.
    // Usage row: input_tokens=2000 split as 500 fresh + 1500 cache_read + 0 cache_write,
    //            output_tokens=200.
    // fresh = max(0, 2000 - 0 - 1500) = 500
    // cost = (500*1.00 + 0*1.25 + 1500*0.10 + 200*5.00) / 1_000_000
    //      = (500 + 0 + 150 + 1000) / 1_000_000 = 1650 / 1_000_000 = 0.00165
    const usage = {
      input_tokens: 2000,
      cache_read_input_tokens: 1500,
      output_tokens: 200,
    };
    expect(costUsd(usage)).toBeCloseTo(0.00165, 10);
  });

  it("computes with cache_write portion contributing the 1.25/MTok premium", () => {
    // input_tokens=1000 split as 200 fresh + 800 cache_write + 0 cache_read,
    // output_tokens=100.
    // fresh = max(0, 1000 - 800 - 0) = 200
    // cost = (200*1.00 + 800*1.25 + 0*0.10 + 100*5.00) / 1_000_000
    //      = (200 + 1000 + 0 + 500) / 1_000_000 = 0.0017
    const usage = {
      input_tokens: 1000,
      cache_creation_input_tokens: 800,
      output_tokens: 100,
    };
    expect(costUsd(usage)).toBeCloseTo(0.0017, 10);
  });

  it("handles a usage row with no cache breakdown (cold path)", () => {
    // cost = (3350*1.00 + 250*5.00) / 1_000_000 = (3350 + 1250) / 1_000_000 = 0.0046
    const usage = { input_tokens: 3350, output_tokens: 250 };
    expect(costUsd(usage)).toBeCloseTo(0.0046, 10);
  });
});

describe("tryParseResult", () => {
  it("happy path returns ok + parsed value", () => {
    const r = tryParseResult(VALID_MODEL_RESPONSE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.age_rating).toBe("all");
      expect(r.value.summary).toBe("Looks fine.");
    }
  });

  it("malformed JSON → { ok: false, reason: 'json' }", () => {
    const r = tryParseResult("this is not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("json");
  });

  it("valid JSON failing schema → { ok: false, reason: 'schema' }", () => {
    const r = tryParseResult('{"safety":{"score":5,"categories":[]}}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("schema");
  });
});

describe("manualReviewFallback", () => {
  it("returns envelope with precheck_passed = false", () => {
    const env = manualReviewFallback("model-x", 1234, new Error("boom"));
    expect(env.precheck_passed).toBe(false);
  });

  it("summary starts with 'manual_review_required:' and includes the error message", () => {
    const env = manualReviewFallback("model-x", 1234, new Error("anthropic_429: rate limit"));
    expect(env.result.summary.startsWith("manual_review_required:")).toBe(true);
    expect(env.result.summary).toContain("anthropic_429: rate limit");
  });

  it("error message is truncated to 160 chars inside the summary", () => {
    const long = "x".repeat(500);
    const env = manualReviewFallback("model-x", 1234, new Error(long));
    expect(env.result.summary).toContain("x".repeat(160));
    expect(env.result.summary).not.toContain("x".repeat(161));
  });

  it("zeroes cost + tokens and marks attempt = 2", () => {
    const env = manualReviewFallback("model-x", 1234, "string-error");
    expect(env.cost_usd).toBe(0);
    expect(env.tokens_in).toBe(0);
    expect(env.tokens_out).toBe(0);
    expect(env.attempt).toBe(2);
  });

  it("preserves model_id and latency_ms passed in", () => {
    const env = manualReviewFallback("model-y", 9876, new Error("x"));
    expect(env.model_id).toBe("model-y");
    expect(env.latency_ms).toBe(9876);
  });
});

describe("callPrecheckWithRetry", () => {
  it("happy path: returns envelope with attempt=1 and cost reflecting usage", async () => {
    const usage = { input_tokens: 3350, output_tokens: 250 };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(anthropicEnvelope(VALID_MODEL_RESPONSE, usage)) as never,
    );

    const env = await callPrecheckWithRetry(baseOpts);

    expect(env.attempt).toBe(1);
    expect(env.tokens_in).toBe(3350);
    expect(env.tokens_out).toBe(250);
    expect(env.cost_usd).toBeCloseTo(0.0046, 10);
    expect(env.result.summary).toBe("Looks fine.");
    expect(env.raw_response).toBe(VALID_MODEL_RESPONSE);
  });

  it("malformed-then-success: attempt=2, cumulative tokens + cost", async () => {
    const usage1 = { input_tokens: 100, output_tokens: 20 };
    const usage2 = { input_tokens: 110, output_tokens: 25 };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(anthropicEnvelope("not-json", usage1)) as never)
      .mockResolvedValueOnce(
        jsonResponse(anthropicEnvelope(VALID_MODEL_RESPONSE, usage2)) as never,
      );

    const env = await callPrecheckWithRetry(baseOpts);

    expect(env.attempt).toBe(2);
    expect(env.tokens_in).toBe(usage1.input_tokens + usage2.input_tokens);
    expect(env.tokens_out).toBe(usage1.output_tokens + usage2.output_tokens);
    expect(env.cost_usd).toBeCloseTo((100 * 1.0 + 20 * 5.0 + 110 * 1.0 + 25 * 5.0) / 1_000_000, 10);

    // Verify the retry call's system block carries the RETRY_REMINDER.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondCall = fetchSpy.mock.calls[1]!;
    const body = JSON.parse((secondCall[1] as RequestInit).body as string);
    const systemText = body.system[0].text as string;
    expect(systemText).toContain(RETRY_REMINDER);
  });

  it("always-malformed: throws precheck_malformed_after_retry", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(anthropicEnvelope("not json")) as never)
      .mockResolvedValueOnce(jsonResponse(anthropicEnvelope("still not json")) as never);

    await expect(callPrecheckWithRetry(baseOpts)).rejects.toThrow(/precheck_malformed_after_retry/);
  });

  it("Anthropic 429 → throws (no retry on 4xx)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }) as never);

    await expect(callPrecheckWithRetry(baseOpts)).rejects.toThrow(/anthropic_429/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("timeout (AbortController fires) → throws", async () => {
    // Real fetch wired up to honor AbortSignal: pending forever unless aborted.
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit | undefined)?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }
      });
    });

    await expect(callPrecheckWithRetry({ ...baseOpts, timeoutMs: 50 })).rejects.toThrow();
  });
});
