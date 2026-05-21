import { describe, it, expect } from "vitest";

import {
  signRespondentPwdToken,
  verifyRespondentPwdToken,
  RESPONDENT_PWD_COOKIE_NAME,
} from "../../functions/_lib/jwt";

const SECRET = "test-secret-respondent";
const SHARE_ID = "VkPpQ_o2L7w4mZ8sN3eRgX";

describe("RespondentPwd JWT", () => {
  it("signs + verifies a freshly-minted token", async () => {
    const token = await signRespondentPwdToken(SHARE_ID, 3, SECRET);
    const r = await verifyRespondentPwdToken(token, SECRET);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.claims.sub).toBe(SHARE_ID);
      expect(r.claims.role).toBe("respondent");
      expect(r.claims.pv).toBe(3);
      expect(r.claims.iss).toBe("subenai.sk");
      expect(r.claims.exp).toBeGreaterThan(r.claims.iat);
    }
  });

  it("rejects bad_signature when the secret differs", async () => {
    const token = await signRespondentPwdToken(SHARE_ID, 1, SECRET);
    const r = await verifyRespondentPwdToken(token, "different-secret");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_signature");
  });

  it("rejects malformed tokens (not 3 parts)", async () => {
    const r = await verifyRespondentPwdToken("not.a.jwt.too.many.parts", SECRET);
    expect(r.ok).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const token = await signRespondentPwdToken(SHARE_ID, 1, SECRET, -10);
    const r = await verifyRespondentPwdToken(token, SECRET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("rejects tokens with the wrong role (T13 — author can't masquerade)", async () => {
    // Manually craft a token with role: "author" and a valid signature so we
    // exercise the role check, not the signature check.
    const HEADER_B64 = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: SHARE_ID,
      role: "author", // wrong role
      pv: 1,
      iat: now,
      exp: now + 1800,
      iss: "subenai.sk",
    };
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const signing = `${HEADER_B64}.${payloadB64}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signing));
    let binary = "";
    for (const b of new Uint8Array(sigBuf)) binary += String.fromCharCode(b);
    const sig = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const token = `${signing}.${sig}`;

    const r = await verifyRespondentPwdToken(token, SECRET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_role");
  });

  it("exposes the cookie name as a stable constant", () => {
    expect(RESPONDENT_PWD_COOKIE_NAME).toBe("subenai_respondent_pwd");
  });

  it("pv claim round-trips integer values", async () => {
    for (const pv of [0, 1, 42, 99999]) {
      const token = await signRespondentPwdToken(SHARE_ID, pv, SECRET);
      const r = await verifyRespondentPwdToken(token, SECRET);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.claims.pv).toBe(pv);
    }
  });
});
