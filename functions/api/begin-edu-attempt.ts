// E12.3 — Issue an edu-attempt ticket (signed JWT) after intake validation.
//
// Flow:
//   1. Respondent fills name + email + GDPR consent in <RespondentIntakeForm>.
//   2. Browser POSTs here.
//   3. We honeypot-check (E12.7), rate-limit per-IP and per-set, validate
//      email regex, look up the test_set, refuse if it isn't an edu set,
//      reject duplicates per (set_id, email).
//   4. Issue an HS256 JWT containing { set_id, name, email, exp=+60min }
//      signed with JWT_SECRET. Client holds it in memory; on test
//      finish it goes to /api/finish-edu-attempt.
//
// Anon Supabase INSERT for rows with respondent_* is blocked by the
// 20260501010000 RLS lockdown — bypassing this Function gets you nothing.

import { createClient } from "@supabase/supabase-js";
import { ipRateLimit, readClientIp, parsePositiveInt } from "../_lib/security";
import { signEduAttemptToken } from "../_lib/jwt";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  EDU_BEGIN_PER_IP_PER_5MIN?: string;
  EDU_BEGIN_PER_SET_PER_HOUR?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface BeginBody {
  set_id?: unknown;
  name?: unknown;
  email?: unknown;
  consent?: unknown;
  hp_url?: unknown;
}

interface BeginResponse {
  token?: string;
  error?: string;
}

export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 80;
export const EMAIL_MAX_LEN = 254;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const DEFAULT_PER_IP_PER_5MIN = 3;
const DEFAULT_PER_SET_PER_HOUR = 50;

function jsonResponse(status: number, body: BeginResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 3)}***@${domain}`;
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.JWT_SECRET) {
    return jsonResponse(500, { error: "jwt_not_configured" });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  let body: BeginBody;
  try {
    body = (await request.json()) as BeginBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  // Honeypot — silent reject. Logged for ops visibility.
  if (typeof body.hp_url === "string" && body.hp_url.length > 0) {
    console.warn("begin-edu-attempt honeypot tripped", {
      ip: readClientIp(request),
      set_id: typeof body.set_id === "string" ? body.set_id : "?",
    });
    return jsonResponse(400, { error: "spam_detected" });
  }

  if (
    typeof body.set_id !== "string" ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    body.consent !== true
  ) {
    return jsonResponse(400, { error: "invalid_shape" });
  }

  const setId = body.set_id.trim();
  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();

  if (name.length < NAME_MIN_LEN || name.length > NAME_MAX_LEN) {
    return jsonResponse(400, { error: "name_length" });
  }
  if (email.length === 0 || email.length > EMAIL_MAX_LEN || !EMAIL_REGEX.test(email)) {
    return jsonResponse(400, { error: "invalid_email" });
  }

  // Per-IP and per-set rate limits. 3/5min/IP catches lone attackers;
  // 50/hour/set caps the blast radius of a leaked link.
  const ip = readClientIp(request);
  const perIp = parsePositiveInt(env.EDU_BEGIN_PER_IP_PER_5MIN, DEFAULT_PER_IP_PER_5MIN);
  const perSet = parsePositiveInt(env.EDU_BEGIN_PER_SET_PER_HOUR, DEFAULT_PER_SET_PER_HOUR);
  if (!ipRateLimit.consume(`begin-edu:${ip}`, perIp, 5 * 60)) {
    return jsonResponse(429, { error: "rate_limited" });
  }
  if (!ipRateLimit.consume(`begin-edu-set:${setId}`, perSet, 60 * 60)) {
    console.warn("begin-edu-attempt set burst", { ip, set_id: setId });
    return jsonResponse(429, { error: "rate_limited" });
  }

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: setRow, error: setErr } = await supabase
    .from("test_sets")
    .select("id, collects_responses")
    .eq("id", setId)
    .maybeSingle();
  if (setErr) {
    console.error("begin-edu-attempt set lookup", { ip, message: setErr.message });
    return jsonResponse(500, { error: "lookup_failed" });
  }
  if (!setRow) {
    return jsonResponse(404, { error: "set_not_found" });
  }
  if (!setRow.collects_responses) {
    // Test set isn't in edu mode — direct anon insert path applies.
    return jsonResponse(400, { error: "not_edu_set" });
  }

  // Duplicate detection — same email already attempted this set. Service
  // role bypasses RLS so we can SEE the existing edu rows.
  const { data: dup, error: dupErr } = await supabase
    .from("attempts")
    .select("id")
    .eq("test_set_id", setId)
    .eq("respondent_email", email)
    .limit(1)
    .maybeSingle();
  if (dupErr) {
    console.error("begin-edu-attempt dup lookup", {
      ip,
      email_redacted: redactEmail(email),
      message: dupErr.message,
    });
    return jsonResponse(500, { error: "lookup_failed" });
  }
  if (dup) {
    return jsonResponse(409, { error: "already_attempted" });
  }

  const token = await signEduAttemptToken({ set_id: setId, name, email }, env.JWT_SECRET);

  return jsonResponse(200, { token });
}

export const __test__ = {
  NAME_MIN_LEN,
  NAME_MAX_LEN,
  EMAIL_MAX_LEN,
  DEFAULT_PER_IP_PER_5MIN,
  DEFAULT_PER_SET_PER_HOUR,
  redactEmail,
};
