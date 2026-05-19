// Edu author JWT signing for test cookie injection.
//
// Uses the same HMAC-SHA-256 algorithm as functions/_lib/jwt.ts but via
// Node's globalThis.crypto (Web Crypto API, available Node 18+). This lets
// Playwright tests inject a pre-signed author cookie without hitting
// /api/verify-author-password — useful for seeded-state tests that need to
// skip the password gate.

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const HEADER_B64 = base64UrlEncode(
  new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
);

export async function signEduAuthorTokenForTest(
  setId: string,
  secret: string,
  /** TTL in seconds. Default 3600 (1 hour). Pass a negative value for an already-expired token. */
  ttlSeconds = 3600,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    set_id: setId,
    role: "author",
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signing = `${HEADER_B64}.${payloadB64}`;

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signing));
  const signature = base64UrlEncode(new Uint8Array(sig));
  return `${signing}.${signature}`;
}
