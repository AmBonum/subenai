// E45 Phase 2 — verify a test password and issue a 30-min respondent cookie.
//
// Spec: tasks/E45-appendix-A.md (STRIDE T1-T14, rate-limit matrix §3,
// audit-log row §5.2, cookie attrs §2.4). This endpoint is the front door
// to /t/<share_id> for password-locked tests. Anonymous — no auth header.
//
// Pipeline (drop on first failure, jitter on every response so T7 timing
// oracle stays closed):
//
//   1. Body shape — { share_id, password } both strings, password ≤ 256 chars.
//   2. Per-IP / per-share rate limit (L1: 5 / 15 min).
//   3. Per-share global rate limit (L2: 50 / hour).
//   4. Per-share daily quota (L3: 200 / day).
//   5. Look up tests.id from share_id (no leakage — same 401 shape for
//      unknown share or wrong password).
//   6. Call verify_test_password RPC.
//   7. Audit-log row regardless of outcome (incl. rate-limited and not-found).
//   8. On verified=true → mint HS256 cookie with `pv` claim, return 200.
//   9. Jitter 100ms ± 25ms before every response.

import { createClient } from "@supabase/supabase-js";

import { ipRateLimit, readClientIp, consumeDailyQuota } from "../../_lib/security";
import { signRespondentPwdToken, RESPONDENT_PWD_COOKIE_NAME } from "../../_lib/jwt";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface VerifyBody {
  share_id?: unknown;
  password?: unknown;
}

interface VerifyResponse {
  ok?: true;
  error?: string;
  retry_after?: number;
}

// Per Appendix A § 3 — three independent layers + jitter.
const PER_IP_PER_SHARE_LIMIT = 5;
const PER_IP_PER_SHARE_WINDOW_S = 15 * 60;
const PER_SHARE_GLOBAL_LIMIT = 50;
const PER_SHARE_GLOBAL_WINDOW_S = 60 * 60;
const PER_SHARE_DAILY_LIMIT = 200;
const COOKIE_TTL_S = 30 * 60;
const JITTER_BASE_MS = 100;
const JITTER_SPREAD_MS = 50; // total span (±25ms around base)
const MAX_PASSWORD_BYTES = 256;

async function jitter(): Promise<void> {
  const ms = JITTER_BASE_MS + (Math.random() * JITTER_SPREAD_MS - JITTER_SPREAD_MS / 2);
  await new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

async function hashIp(ip: string): Promise<string> {
  // SHA-256 → base64url → 12 chars. Unrecoverable, sufficient for audit
  // correlation across attempts from the same IP.
  const bytes = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let binary = "";
  for (const b of new Uint8Array(digest)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 12);
}

function jsonResponse(status: number, body: VerifyResponse, cookie?: string): Response {
  const headers: HeadersInit = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

function buildCookie(shareId: string, token: string): string {
  // Appendix A § 2.4 — Path scoped to /t/<share_id> so the cookie never
  // leaks to /api or other routes the respondent doesn't navigate to.
  // HttpOnly + Secure + SameSite=Lax — Lax is sufficient because we're
  // not third-party-iframe-embeddable (CSP frame-ancestors 'self').
  return [
    `${RESPONDENT_PWD_COOKIE_NAME}=${token}`,
    `Path=/t/${shareId}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${COOKIE_TTL_S}`,
  ].join("; ");
}

async function writeAuditRow(
  supabase: ReturnType<typeof createClient>,
  testId: string | null,
  shareId: string,
  ipHash: string,
  outcome: "pass" | "fail" | "rate_limited" | "share_locked" | "unknown_share",
  pv: number | null,
): Promise<void> {
  // Append-only via forbid_audit_log_update_trg. We absorb errors so audit
  // failures don't 500 the user-facing response — but log them for ops.
  const { error } = await supabase.from("audit_log").insert({
    actor_id: null,
    actor_name: `respondent:${ipHash}`,
    action: "respondent_password_verified",
    target_type: "test",
    target_id: testId ?? `unknown:${ipHash}`,
    pii_access: false,
    details: { outcome, share_id: shareId, pv },
  });
  if (error) {
    console.error("verify-password audit_log insert failed", {
      message: error.message,
      outcome,
      share_id: shareId,
    });
  }
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.JWT_SECRET) {
    await jitter();
    return jsonResponse(500, { error: "jwt_not_configured" });
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    await jitter();
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    await jitter();
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (typeof body.share_id !== "string" || typeof body.password !== "string") {
    await jitter();
    return jsonResponse(400, { error: "invalid_shape" });
  }

  const shareId = body.share_id.trim();
  const password = body.password;

  if (shareId.length < 8 || shareId.length > 64) {
    await jitter();
    return jsonResponse(400, { error: "invalid_shape" });
  }
  // T8: cap CF-side too so even malformed requests can't bomb logs.
  if (password.length > MAX_PASSWORD_BYTES) {
    await jitter();
    return jsonResponse(400, { error: "invalid_shape" });
  }

  const ip = readClientIp(request);
  const ipHash = await hashIp(ip);

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // L3 (daily) — checked FIRST so a tripped daily cap denies even before
  // the per-IP attempt is counted. This is what gives the author the
  // "share locked for the day" signal regardless of distribution.
  if (!consumeDailyQuota(`verify-pwd:${shareId}`, PER_SHARE_DAILY_LIMIT)) {
    await writeAuditRow(supabase, null, shareId, ipHash, "share_locked", null);
    await jitter();
    return jsonResponse(429, { error: "share_locked" });
  }

  // L2 (global per-share) — anti-botnet.
  if (
    !ipRateLimit.consume(
      `verify-pwd:global:${shareId}`,
      PER_SHARE_GLOBAL_LIMIT,
      PER_SHARE_GLOBAL_WINDOW_S,
    )
  ) {
    await writeAuditRow(supabase, null, shareId, ipHash, "rate_limited", null);
    await jitter();
    // No retry_after — denies oracle on the global counter (Appendix A § 3.2).
    return jsonResponse(429, { error: "rate_limited" });
  }

  // L1 (per IP per share) — typical attacker on one IP.
  if (
    !ipRateLimit.consume(
      `verify-pwd:${ip}:${shareId}`,
      PER_IP_PER_SHARE_LIMIT,
      PER_IP_PER_SHARE_WINDOW_S,
    )
  ) {
    await writeAuditRow(supabase, null, shareId, ipHash, "rate_limited", null);
    await jitter();
    return jsonResponse(429, {
      error: "rate_limited",
      retry_after: PER_IP_PER_SHARE_WINDOW_S,
    });
  }

  // Resolve test_id from share_id (for audit row). NULL = unknown share.
  const { data: testRow, error: lookupErr } = await supabase
    .from("tests")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (lookupErr) {
    console.error("verify-password tests lookup", {
      ip,
      share_id: shareId,
      message: lookupErr.message,
    });
    await jitter();
    return jsonResponse(500, { error: "lookup_failed" });
  }
  const testId = (testRow as { id: string } | null)?.id ?? null;

  // Even an unknown share_id goes through the RPC so timing is identical
  // to "wrong password" (T2/T7).
  const { data: verifyRows, error: rpcErr } = await supabase.rpc("verify_test_password", {
    p_share_id: shareId,
    p_password: password,
  });
  if (rpcErr) {
    console.error("verify-password rpc", { ip, share_id: shareId, message: rpcErr.message });
    await jitter();
    return jsonResponse(500, { error: "rpc_failed" });
  }

  const row = (verifyRows as Array<{ verified: boolean; current_pv: number }> | null)?.[0];
  const verified = row?.verified === true;
  const pv = row?.current_pv ?? 0;

  if (!verified) {
    await writeAuditRow(
      supabase,
      testId,
      shareId,
      ipHash,
      testId === null ? "unknown_share" : "fail",
      pv,
    );
    await jitter();
    return jsonResponse(401, { error: "unauthorized" });
  }

  // Pass — mint cookie.
  await writeAuditRow(supabase, testId, shareId, ipHash, "pass", pv);
  const token = await signRespondentPwdToken(shareId, pv, env.JWT_SECRET, COOKIE_TTL_S);
  await jitter();
  return jsonResponse(200, { ok: true }, buildCookie(shareId, token));
}

export const __test__ = {
  PER_IP_PER_SHARE_LIMIT,
  PER_IP_PER_SHARE_WINDOW_S,
  PER_SHARE_GLOBAL_LIMIT,
  PER_SHARE_GLOBAL_WINDOW_S,
  PER_SHARE_DAILY_LIMIT,
  COOKIE_TTL_S,
  MAX_PASSWORD_BYTES,
  buildCookie,
  hashIp,
};
