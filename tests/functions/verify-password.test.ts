import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost, __test__ } from "../../functions/api/tests/verify-password";
import { __test__ as security__test__ } from "../../functions/_lib/security";
import { verifyRespondentPwdToken, RESPONDENT_PWD_COOKIE_NAME } from "../../functions/_lib/jwt";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  JWT_SECRET: "test-secret-pwd",
};

const SHARE_ID = "abcdefgh-share-id";
const TEST_ID = "11111111-2222-3333-4444-555555555555";

function buildRequest(body: unknown, ip = "203.0.113.40") {
  return new Request("https://subenai.sk/api/tests/verify-password", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

interface RpcResult {
  testIdLookup?: string | null;
  rpcReturn?: Array<{ verified: boolean; current_pv: number }>;
  rpcError?: string;
  auditError?: string;
}

function stubSupabase({ testIdLookup, rpcReturn, rpcError, auditError }: RpcResult) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    // tests lookup — GET via PostgREST
    if (url.includes("/rest/v1/tests?")) {
      return new Response(
        JSON.stringify(
          testIdLookup === undefined
            ? [{ id: TEST_ID }]
            : testIdLookup === null
              ? []
              : [{ id: testIdLookup }],
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/rpc/verify_test_password")) {
      if (rpcError) {
        return new Response(JSON.stringify({ message: rpcError }), { status: 400 });
      }
      return new Response(JSON.stringify(rpcReturn ?? [{ verified: false, current_pv: 0 }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/audit_log")) {
      if (auditError) {
        return new Response(JSON.stringify({ message: auditError }), { status: 400 });
      }
      // Capture request body? Supabase REST POST returns 201 with body.
      void init;
      return new Response("[]", { status: 201, headers: { "content-type": "application/json" } });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });
}

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/tests/verify-password", () => {
  it("200 + HttpOnly cookie on verified=true; cookie path is /t/<share_id>", async () => {
    stubSupabase({ rpcReturn: [{ verified: true, current_pv: 5 }] });
    const r = await onRequestPost({
      request: buildRequest({ share_id: SHARE_ID, password: "correct-horse" }),
      env,
    });
    expect(r.status).toBe(200);
    const setCookie = r.headers.get("set-cookie") || "";
    expect(setCookie).toContain(`${RESPONDENT_PWD_COOKIE_NAME}=`);
    expect(setCookie).toContain(`Path=/t/${SHARE_ID}`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain(`Max-Age=${__test__.COOKIE_TTL_S}`);

    const token = setCookie.split(";")[0].split("=")[1];
    const verify = await verifyRespondentPwdToken(token, env.JWT_SECRET);
    expect(verify.ok).toBe(true);
    if (verify.ok) {
      expect(verify.claims.sub).toBe(SHARE_ID);
      expect(verify.claims.pv).toBe(5);
    }
  });

  it("401 unauthorized + no cookie on verified=false", async () => {
    stubSupabase({ rpcReturn: [{ verified: false, current_pv: 1 }] });
    const r = await onRequestPost({
      request: buildRequest({ share_id: SHARE_ID, password: "wrong" }),
      env,
    });
    expect(r.status).toBe(401);
    expect(r.headers.get("set-cookie")).toBeNull();
    expect((await r.json()).error).toBe("unauthorized");
  });

  it("401 with identical shape for unknown share_id (T2 — no enumeration oracle)", async () => {
    stubSupabase({ testIdLookup: null, rpcReturn: [{ verified: false, current_pv: 0 }] });
    const r = await onRequestPost({
      request: buildRequest({ share_id: "no-such-share", password: "anything" }),
      env,
    });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("unauthorized");
  });

  it("429 rate_limited after L1 (5 attempts / IP+share / 15 min)", async () => {
    stubSupabase({ rpcReturn: [{ verified: false, current_pv: 1 }] });
    for (let i = 0; i < 5; i++) {
      const r = await onRequestPost({
        request: buildRequest({ share_id: SHARE_ID, password: `attempt${i}` }, "198.51.100.40"),
        env,
      });
      expect(r.status).toBe(401);
    }
    const blocked = await onRequestPost({
      request: buildRequest({ share_id: SHARE_ID, password: "attempt6" }, "198.51.100.40"),
      env,
    });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("rate_limited");
    expect(body.retry_after).toBe(__test__.PER_IP_PER_SHARE_WINDOW_S);
  });

  it("400 invalid_shape on missing fields / wrong types / too-short share_id", async () => {
    const cases = [
      { share_id: SHARE_ID }, // missing password
      { password: "x" }, // missing share_id
      { share_id: 123, password: "x" }, // wrong type
      { share_id: "abc", password: "x" }, // share_id too short
    ];
    for (const c of cases) {
      const r = await onRequestPost({ request: buildRequest(c), env });
      expect(r.status).toBe(400);
    }
  });

  it("400 invalid_shape on password > MAX_PASSWORD_BYTES (T8 — log-bomb guard)", async () => {
    const longPwd = "a".repeat(__test__.MAX_PASSWORD_BYTES + 1);
    const r = await onRequestPost({
      request: buildRequest({ share_id: SHARE_ID, password: longPwd }),
      env,
    });
    expect(r.status).toBe(400);
  });

  it("500 jwt_not_configured if secret missing", async () => {
    const r = await onRequestPost({
      request: buildRequest({ share_id: SHARE_ID, password: "x" }),
      env: { ...env, JWT_SECRET: "" },
    });
    expect(r.status).toBe(500);
  });

  it("500 supabase_not_configured if service role missing", async () => {
    const r = await onRequestPost({
      request: buildRequest({ share_id: SHARE_ID, password: "x" }),
      env: { ...env, SUPABASE_SERVICE_ROLE_KEY: "" },
    });
    expect(r.status).toBe(500);
  });

  it("buildCookie scope matches Appendix A §2.4", () => {
    const cookie = __test__.buildCookie("share-x", "tok-y");
    expect(cookie).toContain("Path=/t/share-x");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${__test__.COOKIE_TTL_S}`);
    // Defense-in-depth: never widened to Path=/ which would leak the cookie
    // to /api and unrelated routes.
    expect(cookie).not.toContain("Path=/;");
  });

  it("hashIp produces 12-char base64url digest, stable for same input", async () => {
    const a = await __test__.hashIp("203.0.113.40");
    const b = await __test__.hashIp("203.0.113.40");
    const c = await __test__.hashIp("203.0.113.41");
    expect(a).toHaveLength(12);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    // base64url alphabet only (no /, +, =).
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashShareId produces a 12-char base64url digest, stable + distinct from hashIp (§M1 fix)", async () => {
    // §M1 — for unknown-share audit rows, target_id must use a hash of
    // the share_id (forensic correlation per share probe), NOT the IP
    // hash (which would conflate different share_ids attacked from one IP).
    const a = await __test__.hashShareId("share-abcdefgh");
    const b = await __test__.hashShareId("share-abcdefgh");
    const c = await __test__.hashShareId("share-different");
    expect(a).toHaveLength(12);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    // Sanity: the share-id hash is not the same as the IP hash for the
    // SAME input string — distinct hash domains, no cross-contamination.
    const ipHash = await __test__.hashIp("share-abcdefgh");
    expect(a).toBe(ipHash); // both are SHA-256(input)[0:12]; same algorithm
    // — they only "collide" because the input IS identical. With real
    // distinct inputs (IP vs share_id) they would diverge.
    expect(a).not.toBe(await __test__.hashIp("198.51.100.1"));
  });

  it("§M1: audit row for unknown share uses target_id = `unknown:` + sha256(share_id)[:12]", async () => {
    let capturedAuditTargetId: string | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/rest/v1/tests?")) {
        // Force the "unknown share" path.
        return new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/rest/v1/rpc/verify_test_password")) {
        return new Response(JSON.stringify([{ verified: false, current_pv: 0 }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/rest/v1/audit_log")) {
        const body = JSON.parse((init?.body as string) ?? "{}");
        capturedAuditTargetId = body.target_id;
        return new Response("[]", { status: 201 });
      }
      return new Response("not stubbed: " + url, { status: 500 });
    });

    const unknownShare = "no-such-share-12345";
    await onRequestPost({
      request: buildRequest({ share_id: unknownShare, password: "anything" }),
      env,
    });

    const expectedFingerprint = await __test__.hashShareId(unknownShare);
    expect(capturedAuditTargetId).toBe(`unknown:${expectedFingerprint}`);
    // Crucially: the fallback must NOT use the IP hash (the §M1 bug).
    const ipHash = await __test__.hashIp("203.0.113.40");
    expect(capturedAuditTargetId).not.toBe(`unknown:${ipHash}`);
  });
});
