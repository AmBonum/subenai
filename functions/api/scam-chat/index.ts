// E53.2 + E53.7 — scam-chat gateway with layered guardrails + neuron
// budget ledger.
//
// POST /api/scam-chat
//   { message, history?: [{role, content}], turnstile_token? }
//
// Pipeline (plan §Security & abuse design, every message):
//   1. Payload caps (413) / schema (422)
//   2. Turnstile on session start (empty history)
//   3. Per-IP limits (10/10 min, 40/day) + global daily cap (400, env-
//      tunable) + neuron ledger hard stop (fail closed, 429)
//   4. Role resolution: JWT → user, else anon (forged/expired → anon,
//      never 500) — pattern: functions/api/support-attachment-upload.ts
//   5. INPUT GATE: topic classifier + Llama Guard; off-topic/unsafe →
//      canned Slovak refusal with ZERO main-model spend
//   6. RAG retrieval (audience filter: anon → public, user → public+app)
//   7. Generation (70B; degraded to 8B past the soft neuron threshold)
//      with scoped Slovak system prompt: canary token, untrusted data
//      tags, citation instruction
//   8. OUTPUT GATE: canary leak / /admin mention / on-topic recheck;
//      failures → generic Slovak fallback + KV incident counter

import { createClient } from "@supabase/supabase-js";

import {
  createNeuronLedger,
  FAIL_CLOSED_MESSAGE,
  recordIncident,
  resolveThresholds,
  SERVICE_UNAVAILABLE_MESSAGE,
} from "../../_lib/scam-chat/budget";
import {
  ADMIN_REFUSAL,
  extractResponseText,
  GENERIC_FALLBACK,
  OFF_TOPIC_REFUSAL,
  runInputGate,
  runOutputGate,
  UNSAFE_REFUSAL,
} from "../../_lib/scam-chat/gates";
import {
  buildSystemPrompt,
  resolveCanary,
  wrapHistoryItem,
  wrapUserMessage,
} from "../../_lib/scam-chat/prompt";
import {
  retrieveContext,
  type ChatRole,
  type RetrievedChunk,
  type VectorizeIndexBinding,
} from "../../_lib/scam-chat/retrieval";
import { buildTriageSystemPrompt, isTriageOpener, runTriage } from "../../_lib/scam-chat/triage";
import { createAiRunner, type AiBinding } from "../../_lib/scam-chat/run-ai";
import {
  findCapViolation,
  sanitizeHistory,
  scamChatRequestSchema,
  type ScamChatResponseBody,
  type TriageAssessment,
} from "../../_lib/scam-chat/schema";
import {
  consumeRateLimit,
  parsePositiveInt,
  readClientIp,
  verifyTurnstile,
  type SupportRateLimitKV,
} from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";

export interface Env {
  AI?: AiBinding;
  SCAM_CHAT_INDEX?: VectorizeIndexBinding;
  // Dedicated namespace preferred; the E48 support namespace is an
  // accepted fallback (plan §Architecture bindings).
  SCAM_CHAT_KV?: SupportRateLimitKV;
  SUPPORT_RATE_LIMIT_KV?: SupportRateLimitKV;
  SUPABASE_ANON_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  SCAM_CHAT_CANARY?: string;
  SCAM_CHAT_IP_PER_10MIN?: string;
  SCAM_CHAT_IP_PER_DAY?: string;
  SCAM_CHAT_GLOBAL_DAILY?: string;
  SCAM_CHAT_NEURON_SOFT?: string;
  SCAM_CHAT_NEURON_HARD?: string;
  // Model ids are env-overridable — plan risk R3 (catalog churn).
  SCAM_CHAT_MAIN_MODEL?: string;
  SCAM_CHAT_DEGRADED_MODEL?: string;
  SCAM_CHAT_GATE_MODEL?: string;
  SCAM_CHAT_GUARD_MODEL?: string;
  SCAM_CHAT_EMBED_MODEL?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const DEFAULT_MAIN_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_DEGRADED_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const DEFAULT_GATE_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const DEFAULT_GUARD_MODEL = "@cf/meta/llama-guard-3-8b";
const DEFAULT_EMBED_MODEL = "@cf/baai/bge-m3";

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function chatResponse(body: Omit<ScamChatResponseBody, "ok">): Response {
  return jsonResponse(200, { ok: true, ...body });
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.AI || !env.SCAM_CHAT_INDEX) {
    return jsonResponse(500, {
      error: "not_configured",
      message: "Asistent nie je správne nakonfigurovaný.",
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse(422, { error: "invalid_request", message: "Neplatná požiadavka." });
  }
  const parsed = scamChatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(422, { error: "invalid_request", message: "Neplatná požiadavka." });
  }
  const payload = parsed.data;

  const cap = findCapViolation(payload);
  if (cap) {
    return jsonResponse(413, {
      error: cap,
      message: "Správa alebo história presahuje povolenú dĺžku.",
    });
  }

  const ip = readClientIp(request);

  // Turnstile on session start only. Dev parity with support-ticket-create:
  // skipped when no secret is configured.
  if (payload.history.length === 0 && env.TURNSTILE_SECRET_KEY) {
    const ts = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, payload.turnstile_token ?? "", ip);
    if (!ts.ok) {
      return jsonResponse(403, {
        error: "turnstile_failed",
        message: "Overenie proti robotom zlyhalo. Obnovte stránku a skúste to znova.",
      });
    }
  }

  const kv = env.SCAM_CHAT_KV ?? env.SUPPORT_RATE_LIMIT_KV;

  const ipPer10Min = parsePositiveInt(env.SCAM_CHAT_IP_PER_10MIN, 10);
  const ipPerDay = parsePositiveInt(env.SCAM_CHAT_IP_PER_DAY, 40);
  const globalPerDay = parsePositiveInt(env.SCAM_CHAT_GLOBAL_DAILY, 400);

  if (!(await consumeRateLimit(kv, "sc-10m", ip, ipPer10Min, 600))) {
    return jsonResponse(429, {
      error: "rate_limited",
      message: "Príliš veľa správ za sebou. Skúste to, prosím, o pár minút.",
    });
  }
  if (!(await consumeRateLimit(kv, "sc-day", ip, ipPerDay, 86_400))) {
    return jsonResponse(429, {
      error: "rate_limited",
      message: "Dnešný limit správ bol vyčerpaný. Skúste to, prosím, zajtra.",
    });
  }
  if (!(await consumeRateLimit(kv, "sc-global", "all", globalPerDay, 86_400))) {
    return jsonResponse(429, { error: "quota_exhausted", message: FAIL_CLOSED_MESSAGE });
  }

  const ledger = createNeuronLedger(kv, resolveThresholds(env));
  const budgetStatus = await ledger.status();
  if (budgetStatus === "unconfigured") {
    return jsonResponse(503, {
      error: "service_unavailable",
      message: SERVICE_UNAVAILABLE_MESSAGE,
    });
  }
  if (budgetStatus === "hard") {
    return jsonResponse(429, { error: "quota_exhausted", message: FAIL_CLOSED_MESSAGE });
  }
  const degraded = budgetStatus === "soft";

  const role = await resolveRole(request, env);
  const history = sanitizeHistory(payload.history);
  const runAi = createAiRunner(env.AI, ledger);

  const gateModel = env.SCAM_CHAT_GATE_MODEL ?? DEFAULT_GATE_MODEL;
  const verdict = await runInputGate(
    runAi,
    { gate: gateModel, guard: env.SCAM_CHAT_GUARD_MODEL ?? DEFAULT_GUARD_MODEL },
    payload.message,
  );
  if (verdict === "off_topic") {
    return chatResponse({
      reply: OFF_TOPIC_REFUSAL,
      citations: [],
      refusal: "off_topic",
      degraded,
    });
  }
  if (verdict === "unsafe") {
    return chatResponse({ reply: UNSAFE_REFUSAL, citations: [], refusal: "unsafe", degraded });
  }

  const chunks = await retrieveContext(
    runAi,
    env.SCAM_CHAT_EMBED_MODEL ?? DEFAULT_EMBED_MODEL,
    env.SCAM_CHAT_INDEX,
    payload.message,
    role,
  );

  const canary = resolveCanary(env.SCAM_CHAT_CANARY);
  const generationModel = degraded
    ? (env.SCAM_CHAT_DEGRADED_MODEL ?? DEFAULT_DEGRADED_MODEL)
    : (env.SCAM_CHAT_MAIN_MODEL ?? DEFAULT_MAIN_MODEL);
  const purpose = degraded ? "generate_degraded" : "generate_main";

  // E53.4 — triage activates on the explicit client flag or a triage-style
  // opener. Photo findings (E53.5) ride inside the user turn as text.
  const triageMode = payload.mode === "triage" || isTriageOpener(payload.message);
  const userContent = wrapUserMessage(composeUserTurn(payload.message, payload.photo_findings));

  if (triageMode) {
    let outcome: { assessment: TriageAssessment | null; reply: string };
    try {
      outcome = await runTriage(runAi, generationModel, purpose, [
        { role: "system", content: buildTriageSystemPrompt(canary, chunks) },
        ...history.map((turn) => ({ role: turn.role, content: wrapHistoryItem(turn.content) })),
        { role: "user", content: userContent },
      ]);
    } catch {
      return chatResponse({
        reply: GENERIC_FALLBACK,
        citations: [],
        refusal: null,
        degraded,
        triage: null,
      });
    }
    const reply = outcome.reply.trim();
    const gate = await runOutputGate(runAi, gateModel, reply, canary);
    if (gate.kind === "admin") {
      return chatResponse({
        reply: ADMIN_REFUSAL,
        citations: [],
        refusal: null,
        degraded,
        triage: null,
      });
    }
    if (gate.kind === "blocked") {
      await recordIncident(kv, gate.reason);
      return chatResponse({
        reply: GENERIC_FALLBACK,
        citations: [],
        refusal: null,
        degraded,
        triage: null,
      });
    }
    const { finalReply, citations } = enforceCitation(reply, chunks);
    return chatResponse({
      reply: finalReply,
      citations,
      refusal: null,
      degraded,
      triage: outcome.assessment,
    });
  }

  const messages = [
    { role: "system", content: buildSystemPrompt(canary, chunks) },
    ...history.map((turn) => ({ role: turn.role, content: wrapHistoryItem(turn.content) })),
    { role: "user", content: userContent },
  ];

  let generationRaw: unknown;
  try {
    generationRaw = await runAi(purpose, generationModel, {
      messages,
      max_tokens: 800,
    });
  } catch {
    return chatResponse({ reply: GENERIC_FALLBACK, citations: [], refusal: null, degraded });
  }
  const reply = extractResponseText(generationRaw).trim();

  const gate = await runOutputGate(runAi, gateModel, reply, canary);
  if (gate.kind === "admin") {
    return chatResponse({ reply: ADMIN_REFUSAL, citations: [], refusal: null, degraded });
  }
  if (gate.kind === "blocked") {
    await recordIncident(kv, gate.reason);
    return chatResponse({ reply: GENERIC_FALLBACK, citations: [], refusal: null, degraded });
  }

  const { finalReply, citations } = enforceCitation(reply, chunks);
  return chatResponse({ reply: finalReply, citations, refusal: null, degraded });
}

// E53.5 — fold photo findings into the user turn as untrusted text. The
// findings are model-extracted descriptions (no bytes); they live inside
// the same data tags as the message so the prompt's untrusted-data rule
// covers them.
function composeUserTurn(message: string, photoFindings: string[] | undefined): string {
  if (!photoFindings || photoFindings.length === 0) return message;
  const lines = photoFindings.map((f, i) => `Fotka ${i + 1}: ${f}`).join("\n");
  return `${message}\n\nPriložené dôkazy (popis z fotiek):\n${lines}`;
}

// AC E53.2: on-topic answers include ≥ 1 citation URL from retrieved
// metadata. The system prompt instructs the model to cite; this is the
// deterministic backstop when it does not.
function enforceCitation(
  reply: string,
  chunks: RetrievedChunk[],
): { finalReply: string; citations: string[] } {
  const urls = [...new Set(chunks.map((c) => c.url))];
  const cited = urls.filter((url) => reply.includes(url));
  if (cited.length > 0 || urls.length === 0) {
    return { finalReply: reply, citations: cited };
  }
  return { finalReply: `${reply}\n\nViac informácií: ${urls[0]}`, citations: [urls[0]] };
}

// Forged/expired/missing JWT degrades to anon — never a 500 (E53.6 AC).
async function resolveRole(request: Request, env: Env): Promise<ChatRole> {
  const authHeader = request.headers.get("authorization") ?? "";
  const jwt = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : "";
  if (!jwt || !env.SUPABASE_ANON_KEY) return "anon";
  try {
    const client = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(jwt);
    if (error || !data?.user?.id) return "anon";
    return "user";
  } catch {
    return "anon";
  }
}
