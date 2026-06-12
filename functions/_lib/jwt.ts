// HS256-style HMAC-SHA-256 signed token for short-lived edu attempt tickets.
//
// Why hand-rolled instead of `jsonwebtoken`/`jose`:
//   - CF Pages Functions run on Workers runtime — Web Crypto API is the
//     supported primitive. `jsonwebtoken` requires Node `crypto`.
//   - We only need one shape (HS256), no key rotation, no JWK. Hand-roll
//     is ~50 lines and avoids a 10 KB dependency.
//
// Token format mirrors the JWT spec just enough to be debuggable in
// jwt.io: `base64url(header).base64url(payload).base64url(signature)`.

export interface EduAttemptClaims {
  set_id: string;
  name: string;
  email: string;
  iat: number; // seconds since epoch
  exp: number; // seconds since epoch
}

const HEADER_B64 = base64UrlEncode(
  new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
);

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

async function verify(secret: string, message: string, signature: string): Promise<boolean> {
  const key = await importKey(secret);
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature) as BufferSource,
      new TextEncoder().encode(message),
    );
  } catch {
    return false;
  }
}

// 6 hours. The previous 1-hour TTL silently lost real attempts: a
// respondent who left the tab open (lunch, classroom interruption) came
// back, finished the test, and /api/finish-edu-attempt rejected the
// expired ticket — the score was gone with no recovery path. The ticket
// only authorizes inserting ONE attempt for a (set_id, email) pair that
// already passed duplicate checks, so a longer window adds no abuse
// surface worth the lost-data trade-off.
export const EDU_ATTEMPT_TTL_SECONDS = 6 * 60 * 60;

export async function signEduAttemptToken(
  claims: Omit<EduAttemptClaims, "iat" | "exp">,
  secret: string,
  ttlSeconds = EDU_ATTEMPT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: EduAttemptClaims = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signing = `${HEADER_B64}.${payloadB64}`;
  const signature = await sign(secret, signing);
  return `${signing}.${signature}`;
}

export type VerifyResult =
  | { ok: true; claims: EduAttemptClaims }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyEduAttemptToken(token: string, secret: string): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, payload, signature] = parts;
  if (header !== HEADER_B64) return { ok: false, reason: "malformed" };
  const valid = await verify(secret, `${header}.${payload}`, signature);
  if (!valid) return { ok: false, reason: "bad_signature" };
  let claims: EduAttemptClaims;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(payload));
    claims = JSON.parse(json) as EduAttemptClaims;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof claims.set_id !== "string" ||
    typeof claims.name !== "string" ||
    typeof claims.email !== "string" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (Math.floor(Date.now() / 1000) >= claims.exp) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, claims };
}

// ----- Author session tokens (E12.4) -----------------------------------
// Same HMAC machinery, separate claim shape so we can never accidentally
// mistake a respondent ticket for an author session (or vice-versa). Both
// share JWT_SECRET — rotation rotates everything together.

export interface EduAuthorClaims {
  set_id: string;
  role: "author";
  iat: number;
  exp: number;
}

export async function signEduAuthorToken(
  setId: string,
  secret: string,
  ttlSeconds = 60 * 60,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: EduAuthorClaims = {
    set_id: setId,
    role: "author",
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signing = `${HEADER_B64}.${payloadB64}`;
  const signature = await sign(secret, signing);
  return `${signing}.${signature}`;
}

export type VerifyAuthorResult =
  | { ok: true; claims: EduAuthorClaims }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "wrong_role" };

export async function verifyEduAuthorToken(
  token: string,
  secret: string,
): Promise<VerifyAuthorResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, payload, signature] = parts;
  if (header !== HEADER_B64) return { ok: false, reason: "malformed" };
  const valid = await verify(secret, `${header}.${payload}`, signature);
  if (!valid) return { ok: false, reason: "bad_signature" };
  let claims: EduAuthorClaims;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(payload));
    claims = JSON.parse(json) as EduAuthorClaims;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof claims.set_id !== "string" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (claims.role !== "author") {
    return { ok: false, reason: "wrong_role" };
  }
  if (Math.floor(Date.now() / 1000) >= claims.exp) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, claims };
}

export const EDU_AUTHOR_COOKIE_NAME = "subenai_edu_author";

// ----- Respondent password tokens (E45 Phase 2) -----------------------
//
// Mints when a respondent successfully verifies a test password at
// /api/tests/verify-password. The cookie gates entry to /t/<share_id>
// until expiry (30 min). Carries `pv` (password_hash_version) so that
// rotating the password invalidates outstanding cookies — Appendix A §2.5.
//
// Role separation from EduAuthorClaims is enforced via the `role` claim
// (T13). A respondent token never grants access to author endpoints, and
// vice-versa.

export interface RespondentPwdClaims {
  sub: string; // share_id
  role: "respondent";
  pv: number; // password_hash_version
  iat: number;
  exp: number;
  iss: "subenai.sk";
}

const RESPONDENT_PWD_ISSUER = "subenai.sk";

export async function signRespondentPwdToken(
  shareId: string,
  pv: number,
  secret: string,
  ttlSeconds = 30 * 60,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: RespondentPwdClaims = {
    sub: shareId,
    role: "respondent",
    pv,
    iat: now,
    exp: now + ttlSeconds,
    iss: RESPONDENT_PWD_ISSUER,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signing = `${HEADER_B64}.${payloadB64}`;
  const signature = await sign(secret, signing);
  return `${signing}.${signature}`;
}

export type VerifyRespondentPwdResult =
  | { ok: true; claims: RespondentPwdClaims }
  | {
      ok: false;
      reason: "malformed" | "bad_signature" | "expired" | "wrong_role" | "wrong_issuer";
    };

export async function verifyRespondentPwdToken(
  token: string,
  secret: string,
): Promise<VerifyRespondentPwdResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, payload, signature] = parts;
  if (header !== HEADER_B64) return { ok: false, reason: "malformed" };
  const valid = await verify(secret, `${header}.${payload}`, signature);
  if (!valid) return { ok: false, reason: "bad_signature" };
  let claims: RespondentPwdClaims;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(payload));
    claims = JSON.parse(json) as RespondentPwdClaims;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof claims.sub !== "string" ||
    typeof claims.pv !== "number" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (claims.role !== "respondent") {
    return { ok: false, reason: "wrong_role" };
  }
  // T1 defense-in-depth — reject if issuer mismatches even if HMAC ever
  // weakens. Comparing a fixed string is leak-free.
  if (claims.iss !== RESPONDENT_PWD_ISSUER) {
    return { ok: false, reason: "wrong_issuer" };
  }
  if (Math.floor(Date.now() / 1000) >= claims.exp) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, claims };
}

export const RESPONDENT_PWD_COOKIE_NAME = "subenai_respondent_pwd";

export const __test__ = {
  base64UrlEncode,
  base64UrlDecode,
};
