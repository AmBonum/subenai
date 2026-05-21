// E45 Phase 2 — preflight: does this respondent already hold a valid
// password cookie for the given share_id, or do they need to enter the
// password? Anonymous endpoint, no rate-limit needed (signature check
// + one DB read; no bcrypt cost, no oracle).
//
// Returns:
//   * { has_password: false }                       — open test, skip gate
//   * { has_password: true, gated: false }          — cookie valid, skip gate
//   * { has_password: true, gated: true, reason }   — show password prompt
//
// `reason` discriminates:
//   * "no_cookie"      — never entered the password
//   * "expired"        — cookie expired (TTL elapsed)
//   * "bad_signature"  — tampered or wrong secret
//   * "wrong_share"    — cookie was minted for a different share_id
//   * "password_changed" — pv mismatch (Appendix A § 2.5 / R5)
//
// The route component renders the gate UI accordingly. We do NOT include
// the test title / description in the response — that's the SafeTestProjection
// path. Preflight is strictly a yes/no gate.

import { createClient } from "@supabase/supabase-js";

import { RESPONDENT_PWD_COOKIE_NAME, verifyRespondentPwdToken } from "../../_lib/jwt";
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

type GateReason = "no_cookie" | "expired" | "bad_signature" | "wrong_share" | "password_changed";

interface CheckResponse {
  has_password?: boolean;
  gated?: boolean;
  reason?: GateReason;
  error?: string;
}

function json(status: number, body: CheckResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function onRequestGet(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const shareId = (url.searchParams.get("share_id") ?? "").trim();

  if (shareId.length < 8 || shareId.length > 64) {
    return json(400, { error: "invalid_shape" });
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "supabase_not_configured" });
  }

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("tests")
    .select("password_hash, password_hash_version")
    .eq("share_id", shareId)
    .maybeSingle();
  if (error) {
    console.error("check-password lookup", { share_id: shareId, message: error.message });
    return json(500, { error: "lookup_failed" });
  }

  // Unknown share_id: respond identically to "open test" — we don't want
  // the preflight to leak whether a share_id exists. The take-flow's
  // SafeTestProjection lookup will return 404 anyway.
  if (!data) return json(200, { has_password: false });

  const row = data as { password_hash: string | null; password_hash_version: number | null };
  if (row.password_hash === null) {
    return json(200, { has_password: false });
  }
  const currentPv = row.password_hash_version ?? 0;

  if (!env.JWT_SECRET) {
    // Server misconfigured — fail closed (gate the test) so the user
    // still has a chance to authenticate once secret is restored.
    return json(200, { has_password: true, gated: true, reason: "no_cookie" });
  }

  const token = readCookie(request, RESPONDENT_PWD_COOKIE_NAME);
  if (!token) {
    return json(200, { has_password: true, gated: true, reason: "no_cookie" });
  }

  const verified = await verifyRespondentPwdToken(token, env.JWT_SECRET);
  if (!verified.ok) {
    // E45 security review §M2: `wrong_issuer` is a T1 forged-token signal —
    // surface it as `bad_signature` so ops can see "tampered cookies" in
    // the audit / metrics flow rather than swallow it as "first visit".
    const reason: GateReason =
      verified.reason === "expired"
        ? "expired"
        : verified.reason === "bad_signature" ||
            verified.reason === "wrong_role" ||
            verified.reason === "wrong_issuer"
          ? "bad_signature"
          : "no_cookie";
    return json(200, { has_password: true, gated: true, reason });
  }
  if (verified.claims.sub !== shareId) {
    // T1 defense — cookie was minted for a different share_id.
    return json(200, { has_password: true, gated: true, reason: "wrong_share" });
  }
  if (verified.claims.pv !== currentPv) {
    // R5 — author rotated password while respondent was idle. Re-prompt.
    return json(200, { has_password: true, gated: true, reason: "password_changed" });
  }

  return json(200, { has_password: true, gated: false });
}
