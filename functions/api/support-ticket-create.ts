// E48.3 — Public + /app support ticket submission handler.
//
// POST /api/support-ticket-create
//
// Anon path (public /kontakt):
//   1. Turnstile siteverify (skip in dev when TURNSTILE_SECRET_KEY is empty)
//   2. Honeypot check (_h_addr must be empty)
//   3. Per-IP rate limit (3 / 24h)
//   4. Per-(email|ip) cooldown (10 min between submissions for same email)
//   5. Service-role client → submit_support_ticket() RPC (RPC handles
//      view_token generation server-side; we never trust client-side)
//   6. Return { ticket_id, view_token }
//
// Auth path (/app/help/contact, lands in E48.4):
//   - If Authorization: Bearer header is present, validate JWT via a
//     per-request authenticated Supabase client and skip Turnstile
//     (the JWT proves humanity). user_id from auth.uid() is enforced
//     to match payload.user_id inside the RPC.
//   - Per-user rate limit (10 / 24h) instead of per-IP.
//
// All inserts go through the submit_support_ticket() SECURITY DEFINER
// RPC — never raw INSERTs — so the Phase-A review architecture (anon
// has zero direct DML) stays intact.

import { createClient } from "@supabase/supabase-js";

import { sendEmail } from "../_lib/email";
import { supportTicketReceivedEmail } from "../_lib/email-templates";
import {
  consumeCooldown,
  consumeRateLimit,
  parsePositiveInt,
  readClientIp,
  verifyTurnstile,
  type SupportRateLimitKV,
} from "../_lib/security";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  SUPPORT_PER_IP_PER_DAY?: string;
  SUPPORT_EMAIL_COOLDOWN_SECONDS?: string;
  // KV namespace for rate-limit + cooldown state (audit A3).
  // When unbound (local dev), the security helpers fall back to a
  // per-isolate Map — the operator MUST bind this in production via
  // CF Pages Settings → Functions → KV namespace bindings.
  // See tasks/E48-runbook.md §3.
  SUPPORT_RATE_LIMIT_KV?: SupportRateLimitKV;
  // Email infra (E11.8). Optional on the type so unit tests can omit them
  // without ts-error noise; CF Pages production always has them.
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  SITE_ORIGIN?: string;
}

const DEFAULT_SITE_ORIGIN = "https://subenai.sk";

interface RequestContext {
  request: Request;
  env: Env;
}

interface Payload {
  subject?: string;
  category?: string;
  body?: string;
  email?: string;
  name?: string;
  _h_addr?: string;
  turnstile_token?: string;
  // Set by the /app/help/contact variant in E48.4; authenticated user
  // submissions include their own user_id and the JWT in Authorization.
  user_id?: string;
}

const CATEGORY_VALUES = new Set([
  "bug",
  "question",
  "feature_request",
  "abuse_report",
  "billing",
  "gdpr",
  "other",
]);

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length >= 5 && value.length <= 254;
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  // Honeypot — reject silently with a 200-ok response shape so bots don't
  // know they were blocked. Real users never fill this field.
  if ((payload._h_addr ?? "").length > 0) {
    return jsonResponse(200, {
      ok: true,
      ticket_id: "honeypot-discarded",
      view_token: "discarded",
    });
  }

  // Validate payload shape — same checks the RPC will redo, but catching
  // here lets us return more specific Slovak error codes for the UI.
  const subject = (payload.subject ?? "").trim();
  const body = (payload.body ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const name = (payload.name ?? "").trim();
  const category = (payload.category ?? "").trim();

  if (subject.length < 1 || subject.length > 200) {
    return jsonResponse(400, { error: "subject_invalid" });
  }
  if (body.length < 1 || body.length > 5000) {
    return jsonResponse(400, { error: "body_invalid" });
  }
  if (!isPlausibleEmail(email)) {
    return jsonResponse(400, { error: "email_invalid" });
  }
  if (name.length > 100) {
    return jsonResponse(400, { error: "name_invalid" });
  }
  if (!CATEGORY_VALUES.has(category)) {
    return jsonResponse(400, { error: "category_invalid" });
  }

  // Detect auth vs anon path.
  const authHeader = request.headers.get("authorization") ?? "";
  const jwt = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : "";
  const isAuth = jwt.length > 0;

  const ip = readClientIp(request);

  // Rate limit.
  const kv = env.SUPPORT_RATE_LIMIT_KV;
  if (isAuth) {
    // Per-user limit. The bucket MUST key off the JWT payload `sub`
    // (= the Supabase user UUID), NOT the JWT itself or any prefix of
    // it. The first ~30+ chars of a Supabase-minted JWT are the
    // base64-encoded header (`{"alg":"HS256","typ":"JWT","kid":"…"}`)
    // which is identical for every user in the same project. Slicing
    // would collapse everyone into a single shared 10/24h bucket — one
    // noisy account DoSes everyone else.
    const sub = decodeJwtSub(jwt);
    const identity = sub ?? `unknown:${ip}`;
    if (!(await consumeRateLimit(kv, "support:user", identity, 10, 86400))) {
      return jsonResponse(429, { error: "rate_limited_user" });
    }
  } else {
    const perIp = parsePositiveInt(env.SUPPORT_PER_IP_PER_DAY, 3);
    if (!(await consumeRateLimit(kv, "support:ip", ip, perIp, 86400))) {
      return jsonResponse(429, { error: "rate_limited_ip" });
    }

    // Anon path: verify Turnstile. Skip when secret is unset (local dev
    // without a Turnstile site key). Production CF Pages always has it.
    if (env.TURNSTILE_SECRET_KEY) {
      const tsResult = await verifyTurnstile(
        env.TURNSTILE_SECRET_KEY,
        payload.turnstile_token ?? "",
        ip,
      );
      if (!tsResult.ok) {
        return jsonResponse(400, { error: "turnstile_failed", reason: tsResult.reason });
      }
    }
  }

  // Per-email cooldown to slow down floods that rotate IPs but reuse an
  // email. Doesn't kick in for authenticated submissions (their user-key
  // limit is tighter).
  if (!isAuth) {
    const cooldown = parsePositiveInt(env.SUPPORT_EMAIL_COOLDOWN_SECONDS, 600);
    if (!(await consumeCooldown(kv, "support:email", email, cooldown))) {
      return jsonResponse(429, { error: "email_cooldown" });
    }
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  // RPC invocation. Anon path uses service-role; auth path uses a
  // per-request client bound to the user's JWT so auth.uid() works
  // inside the SECURITY DEFINER function.
  let rpcClient;
  if (isAuth) {
    if (!env.SUPABASE_ANON_KEY) {
      return jsonResponse(500, { error: "supabase_not_configured" });
    }
    rpcClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
  } else {
    rpcClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200);
  const ipCountry = (request.headers.get("cf-ipcountry") ?? "").toUpperCase().slice(0, 2);

  const rpcPayload = {
    subject,
    body,
    email,
    name: name || null,
    category,
    source: isAuth ? "app_form" : "public_form",
    user_id: isAuth ? (payload.user_id ?? null) : null,
    user_agent: userAgent || null,
    ip_country: /^[A-Z]{2}$/.test(ipCountry) ? ipCountry : null,
  };

  const { data, error } = await rpcClient.rpc("submit_support_ticket", {
    p_payload: rpcPayload,
  });

  if (error || !data) {
    const message = (error as { message?: string } | null)?.message ?? "unknown";
    const code = (error as { code?: string } | null)?.code ?? "";
    const reason = code || message.replace(/[^a-zA-Z0-9_ :/-]/g, "").slice(0, 80) || "opaque";
    console.error("support-ticket-create rpc failed", { reason, code, message });
    return jsonResponse(500, { error: "insert_failed", reason });
  }

  const result = data as { ticket_id?: string; view_token?: string };
  if (!result.ticket_id || !result.view_token) {
    return jsonResponse(500, { error: "insert_failed", reason: "missing_fields" });
  }

  // E48.5 — confirmation e-mail. Anonymous submitters get the view link;
  // authenticated submitters do not (they have /app/help/tickets).
  // Email failure is non-fatal: the ticket is already persisted, the user
  // sees the success state, ops sees the error in CF logs. Mirrors the
  // dpa-email-attach.ts non-blocking pattern.
  if (env.RESEND_API_KEY && env.EMAIL_FROM && env.EMAIL_REPLY_TO) {
    const origin = env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN;
    const viewUrl = !isAuth
      ? `${origin}/contact-form/ticket/${encodeURIComponent(result.ticket_id)}?token=${encodeURIComponent(result.view_token)}`
      : undefined;
    const template = supportTicketReceivedEmail({
      ticketId: result.ticket_id,
      subject,
      category,
      viewUrl,
    });
    const mailResult = await sendEmail(
      {
        RESEND_API_KEY: env.RESEND_API_KEY,
        EMAIL_FROM: env.EMAIL_FROM,
        EMAIL_REPLY_TO: env.EMAIL_REPLY_TO,
      },
      {
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: `support-ticket-received-${result.ticket_id}`,
      },
    );
    if (!mailResult.ok) {
      console.warn("support-ticket-create email failed (ticket already saved)", {
        ticket_id: result.ticket_id,
        error: mailResult.error,
      });
    }
  }

  return jsonResponse(200, {
    ok: true,
    ticket_id: result.ticket_id,
    view_token: result.view_token,
  });
}

// Local base64url-decode of the JWT payload to extract `sub` for the
// per-user rate-limit bucket. Mirrors `decodeJwtPayload` in
// support-ticket-reply.ts. We do NOT verify the signature here — that
// already happened upstream (auth.getUser() in callers, or via the RPC
// path on the authenticated branch). The bucket key only needs to be
// stable per user; a forged JWT either fails the RPC (`auth.uid()` is
// NULL) or returns 500, never an unauthorised insert.
function decodeJwtSub(jwt: string): string | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + padding);
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}
