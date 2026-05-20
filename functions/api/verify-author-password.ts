// E12.4 — Verify author password and issue an HttpOnly cookie session.
//
// Uses the Supabase RPC `verify_test_set_password` (SECURITY DEFINER,
// pgcrypto bcrypt) so the hash never leaves the database. Brute force
// is rate-limited per IP+set (5 attempts / 15 min). On success we set a
// signed HMAC token in an HttpOnly cookie scoped to the results path.

import { createClient } from "@supabase/supabase-js";
import { ipRateLimit, readClientIp, parsePositiveInt } from "../_lib/security";
import { signEduAuthorToken, EDU_AUTHOR_COOKIE_NAME } from "../_lib/jwt";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  EDU_AUTHOR_PER_KEY_PER_15MIN?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface VerifyBody {
  set_id?: unknown;
  password?: unknown;
}

interface VerifyResponse {
  ok?: true;
  error?: string;
}

const DEFAULT_PER_KEY_PER_15MIN = 5;
const SESSION_TTL_SECONDS = 60 * 60;

function jsonResponse(status: number, body: VerifyResponse, cookie?: string): Response {
  const headers: HeadersInit = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

function buildCookie(setId: string, token: string, ttl: number): string {
  // Path MUST be "/" because the dashboard fetches `/api/results-data`,
  // `/api/delete-edu-respondent`, and `/api/verify-author-password` (logout)
  // from outside `/test/builder/${setId}`. A narrow path causes the browser
  // to never send the cookie on those API requests → 401 loop on the
  // password gate.
  //
  // The cookie is set-scoped at the application layer via the JWT claims
  // (`set_id` + `role: "author"`), checked on every API call. So the
  // server-side set_id verification (already implemented) is the real
  // tenant isolation, not the cookie path.
  //
  // setId is intentionally unused here — kept in the signature for symmetry
  // with the JWT's set_id claim and to make logging at call sites easier.
  void setId;
  return [
    `${EDU_AUTHOR_COOKIE_NAME}=${token}`,
    `Path=/`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${ttl}`,
  ].join("; ");
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.JWT_SECRET) {
    return jsonResponse(500, { error: "jwt_not_configured" });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (typeof body.set_id !== "string" || typeof body.password !== "string") {
    return jsonResponse(400, { error: "invalid_shape" });
  }

  const setId = body.set_id.trim();
  const password = body.password;

  // Rate limit on (IP, set) so a determined attacker can't spread the 5
  // attempts across many sets, and can't cycle IPs to hammer one set.
  const ip = readClientIp(request);
  const limit = parsePositiveInt(env.EDU_AUTHOR_PER_KEY_PER_15MIN, DEFAULT_PER_KEY_PER_15MIN);
  if (!ipRateLimit.consume(`edu-author:${ip}:${setId}`, limit, 15 * 60)) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("verify_test_set_password", {
    set_id: setId,
    password,
  });
  if (error) {
    console.error("verify-author-password rpc", { ip, set_id: setId, message: error.message });
    return jsonResponse(500, { error: "rpc_failed" });
  }
  if (data !== true) {
    // Generic 401 — same shape as missing-set or wrong-password to avoid
    // confirming whether a given set exists.
    return jsonResponse(401, { error: "unauthorized" });
  }

  const token = await signEduAuthorToken(setId, env.JWT_SECRET, SESSION_TTL_SECONDS);
  return jsonResponse(200, { ok: true }, buildCookie(setId, token, SESSION_TTL_SECONDS));
}

export async function onRequestDelete(ctx: RequestContext): Promise<Response> {
  // Logout — clear the cookie on whatever set the URL refers to. The path
  // is set-specific, so we accept the set_id in body to scope correctly.
  const { request } = ctx;
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  if (typeof body.set_id !== "string") {
    return jsonResponse(400, { error: "invalid_shape" });
  }
  // Logout clears the cookie. Path MUST match the path used at set time
  // (Path=/, see buildCookie). A cookie can only be cleared by the same
  // Path used to set it — narrow-path Clear-Cookie would NOT remove a
  // root-scope cookie. The setId is kept in the request body for audit
  // logging clarity, not for cookie scoping.
  void body.set_id;
  const cookie = `${EDU_AUTHOR_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  return jsonResponse(200, { ok: true }, cookie);
}

export const __test__ = {
  DEFAULT_PER_KEY_PER_15MIN,
  SESSION_TTL_SECONDS,
  buildCookie,
};
