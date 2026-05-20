// E44.7 — AI precheck for user-submitted templates.
//
// POST /api/templates/precheck
//   Auth:    Authorization: Bearer <Supabase JWT>
//   Body:    { template_id, title, description, question_texts,
//              age_rating_self_declared, cc_by_consent: true }
//   Returns: { precheck_passed, age_rating, summary, held_for_admin_review }
//
// Pipeline:
//   1. JWT verify (anon Supabase client + auth.getUser)
//   2. Body validate (zod) — title ≤200, description ≤2000, questions ≤50×1000
//   3. Rate limits: per-IP/hr, per-user/day, global/hr
//   4. Budget ceiling (PRECHECK_DAILY_BUDGET_USD)
//   5. Template ownership check (must own template_id)
//   6. Insert pending template_submissions row via service-role (so the
//      row exists even if the AI call later fails / times out)
//   7. Call Claude Haiku 4.5 with cached system prompt + 1 retry on
//      malformed JSON. Fallback envelope on persistent failure.
//   8. UPDATE submissions row with precheck envelope (minus raw_response)
//   9. Audit log entry (template_precheck)
//  10. Return summarised verdict — never raw JSON or PII.

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  consumeDailyQuota,
  ipRateLimit,
  parsePositiveInt,
  readClientIp,
} from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";
import { callPrecheckWithRetry, manualReviewFallback } from "../../_lib/anthropic";
import { PRECHECK_SYSTEM_PROMPT } from "../../_lib/precheck-prompt";
import {
  stripRaw,
  toVerdict,
  type PrecheckEnvelope,
} from "../../../src/lib/templates/precheckSchema";

interface Env {
  ANTHROPIC_API_KEY: string;
  PRECHECK_MODEL_ID?: string;
  PRECHECK_DAILY_BUDGET_USD?: string;
  PRECHECK_PER_USER_PER_DAY?: string;
  PRECHECK_PER_HOUR_GLOBAL?: string;
  PRECHECK_PER_IP_PER_HOUR?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 10_000;
const MAX_OUTPUT_TOKENS = 800;
const DAILY_QUOTA_SCOPE = "precheck:budget_usd";

const RequestBody = z.object({
  template_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  question_texts: z.array(z.string().max(1000)).max(50),
  age_rating_self_declared: z.enum(["all", "13+", "16+", "18+"]),
  cc_by_consent: z.literal(true),
});

type RequestBodyT = z.infer<typeof RequestBody>;

// API/JSON speaks `13+` (Appendix C rubric); the DB enum is `thirteen_plus`
// (E44.1 migration). One mapping table, never inline string surgery.
const AGE_API_TO_DB: Record<RequestBodyT["age_rating_self_declared"], string> = {
  all: "all",
  "13+": "thirteen_plus",
  "16+": "sixteen_plus",
  "18+": "eighteen_plus",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function renderUserMessage(body: RequestBodyT): string {
  const q = body.question_texts.map((t) => `  <q>${escapeXmlTextOnly(t)}</q>`).join("\n");
  return [
    `<template_title>${escapeXmlTextOnly(body.title)}</template_title>`,
    `<template_description>${escapeXmlTextOnly(body.description)}</template_description>`,
    `<questions>`,
    q || "  ",
    `</questions>`,
  ].join("\n");
}

// Defensive XML escape — only the four chars that would break the tag
// boundary the model relies on. Slovak diacritics + emoji + RTL marks pass
// through unchanged so the model can flag them itself (e.g. injection A4).
function escapeXmlTextOnly(s: string): string {
  return s.replace(/[<>&]/g, (ch) => {
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    return "&amp;";
  });
}

interface VerifiedCaller {
  userId: string;
}

async function verifyCaller(token: string, env: Env): Promise<VerifiedCaller | null> {
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  return { userId: data.user.id };
}

interface TemplateRow {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  visibility: string;
}

async function loadTemplateForAuthor(
  service: ReturnType<typeof createClient>,
  templateId: string,
  userId: string,
): Promise<TemplateRow | null> {
  const { data, error } = await service
    .from("templates")
    .select("id, owner_id, title, description, visibility")
    .eq("id", templateId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TemplateRow;
}

interface RecentSubmission {
  id: string;
  status: string;
  submitted_at: string;
}

const REJECTION_COOLDOWN_HOURS = 24;

async function findCooldownBlocker(
  service: ReturnType<typeof createClient>,
  templateId: string,
  userId: string,
): Promise<RecentSubmission | null> {
  const since = new Date(Date.now() - REJECTION_COOLDOWN_HOURS * 3600 * 1000).toISOString();
  const { data, error } = await service
    .from("template_submissions")
    .select("id, status, submitted_at")
    .eq("template_id", templateId)
    .eq("author_id", userId)
    .eq("status", "rejected")
    .gt("submitted_at", since)
    .order("submitted_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as RecentSubmission;
}

async function readSpentTodayUsd(service: ReturnType<typeof createClient>): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await service
    .from("template_submissions")
    .select("precheck")
    .gte("precheck_at", `${today}T00:00:00Z`)
    .lt("precheck_at", `${today}T23:59:59.999Z`);
  if (error || !data) return 0;
  let sum = 0;
  for (const row of data) {
    const env = (row as { precheck: { cost_usd?: number } | null }).precheck;
    if (env && typeof env.cost_usd === "number") sum += env.cost_usd;
  }
  return sum;
}

async function getAuthorDisplayName(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data } = await service
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { display_name: string | null; email: string | null } | null;
  if (row?.display_name) return row.display_name;
  if (row?.email) return row.email.split("@")[0] || "Anonym";
  return "Anonym";
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.ANTHROPIC_API_KEY) return jsonResponse(500, { error: "anthropic_not_configured" });
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  // 1. Auth.
  const jwt = readBearer(request);
  if (!jwt) return jsonResponse(401, { error: "unauthorized" });
  const caller = await verifyCaller(jwt, env);
  if (!caller) return jsonResponse(401, { error: "invalid_token" });

  // 2. Validate body.
  let body: RequestBodyT;
  try {
    const raw = (await request.json()) as unknown;
    body = RequestBody.parse(raw);
  } catch {
    return jsonResponse(400, { error: "invalid_body" });
  }

  // 3. Rate limits — IP (anti-bot), per-user-day (anti-spam),
  //    global-per-hour (anti-storm). Order matters: IP first to drop
  //    bots cheaply.
  const ip = readClientIp(request);
  const perIpHour = parsePositiveInt(env.PRECHECK_PER_IP_PER_HOUR, 20);
  if (!ipRateLimit.consume(`precheck:ip:${ip}`, perIpHour, 3600)) {
    return jsonResponse(429, { error: "rate_limit_ip" });
  }
  const perUserDay = parsePositiveInt(env.PRECHECK_PER_USER_PER_DAY, 5);
  if (!consumeDailyQuota(`precheck:user:${caller.userId}`, perUserDay)) {
    return jsonResponse(429, { error: "rate_limit_user_daily" });
  }
  const globalHour = parsePositiveInt(env.PRECHECK_PER_HOUR_GLOBAL, 100);
  if (!ipRateLimit.consume("precheck:global", globalHour, 3600)) {
    return jsonResponse(429, { error: "rate_limit_global" });
  }

  const service = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Budget ceiling.
  const budget = Number(env.PRECHECK_DAILY_BUDGET_USD ?? "5.00");
  if (Number.isFinite(budget) && budget > 0) {
    const spent = await readSpentTodayUsd(service);
    if (spent >= budget) {
      return jsonResponse(503, { error: "budget_exhausted", scope: DAILY_QUOTA_SCOPE });
    }
  }

  // 5. Template ownership.
  const template = await loadTemplateForAuthor(service, body.template_id, caller.userId);
  if (!template) return jsonResponse(404, { error: "template_not_found_or_not_owned" });

  // 6. 24h cooldown after rejection.
  const cooldownRow = await findCooldownBlocker(service, body.template_id, caller.userId);
  if (cooldownRow) {
    return jsonResponse(429, {
      error: "rejected_cooldown_active",
      retry_after_hours: REJECTION_COOLDOWN_HOURS,
    });
  }

  // 7. Insert pending submission row (so it exists even if AI call fails).
  const authorDisplayName = await getAuthorDisplayName(service, caller.userId);
  const { data: subRow, error: subErr } = await service
    .from("template_submissions")
    .insert({
      template_id: body.template_id,
      author_id: caller.userId,
      author_display_name: authorDisplayName,
      age_rating_declared: AGE_API_TO_DB[body.age_rating_self_declared],
      status: "pending",
    } as never)
    .select("id")
    .single();
  if (subErr || !subRow) {
    return jsonResponse(500, { error: "submission_insert_failed" });
  }
  const submissionId = (subRow as { id: string }).id;

  // 8. Call Anthropic with retry on malformed JSON, fallback on hard failure.
  const modelId = env.PRECHECK_MODEL_ID ?? DEFAULT_MODEL;
  const userMessage = renderUserMessage(body);
  const t0 = Date.now();
  let envelope: PrecheckEnvelope;
  try {
    envelope = await callPrecheckWithRetry({
      apiKey: env.ANTHROPIC_API_KEY,
      modelId,
      systemPrompt: PRECHECK_SYSTEM_PROMPT,
      userMessage,
      timeoutMs: TIMEOUT_MS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
  } catch (err) {
    envelope = manualReviewFallback(modelId, Date.now() - t0, err);
  }

  // 9. Persist envelope (minus raw_response).
  await service
    .from("template_submissions")
    .update({
      precheck: stripRaw(envelope) as never,
      precheck_passed: envelope.precheck_passed,
      precheck_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  // 10. Server log (full envelope) + audit_log row.
  console.log("templates_precheck", {
    submission_id: submissionId,
    template_id: body.template_id,
    user_id: caller.userId,
    model_id: envelope.model_id,
    tokens_in: envelope.tokens_in,
    tokens_out: envelope.tokens_out,
    cost_usd: envelope.cost_usd,
    latency_ms: envelope.latency_ms,
    precheck_passed: envelope.precheck_passed,
    attempt: envelope.attempt,
  });

  await service.from("audit_log").insert({
    actor_id: caller.userId,
    action: "template_precheck",
    target_type: "template_submission",
    target_id: submissionId,
    pii_access: false,
    details: {
      precheck_passed: envelope.precheck_passed,
      cost_usd: envelope.cost_usd,
      template_id: body.template_id,
    },
  });

  // 11. Verdict to client — no raw JSON, no PII.
  return jsonResponse(200, {
    submission_id: submissionId,
    ...toVerdict(envelope),
  });
}

export const __test__ = {
  REJECTION_COOLDOWN_HOURS,
  DEFAULT_MODEL,
  MAX_OUTPUT_TOKENS,
  renderUserMessage,
  escapeXmlTextOnly,
};
