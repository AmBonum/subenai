import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestGet } from "../../functions/api/tests/check-password";
import { signRespondentPwdToken, RESPONDENT_PWD_COOKIE_NAME } from "../../functions/_lib/jwt";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  JWT_SECRET: "test-secret-pwd",
};

const SHARE_ID = "abcdefgh-share-id";

function buildRequest(shareId: string, cookie?: string) {
  return new Request(
    `https://subenai.sk/api/tests/check-password?share_id=${encodeURIComponent(shareId)}`,
    { headers: cookie ? { cookie } : {} },
  );
}

interface TestsRowStub {
  rows?: Array<{ password_hash: string | null; password_hash_version: number | null }>;
  lookupStatus?: number;
}

function stubSupabase({ rows, lookupStatus }: TestsRowStub) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/rest/v1/tests?")) {
      if (lookupStatus && lookupStatus >= 400) {
        return new Response(JSON.stringify({ message: "connection refused" }), {
          status: lookupStatus,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(rows ?? []), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/tests/check-password — negative paths", () => {
  it("400 invalid_shape for a share_id shorter than 8 chars", async () => {
    const r = await onRequestGet({ request: buildRequest("short"), env });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_shape");
  });

  it("400 invalid_shape for a share_id longer than 64 chars", async () => {
    const r = await onRequestGet({ request: buildRequest("x".repeat(65)), env });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_shape");
  });

  it("400 invalid_shape when share_id is missing entirely", async () => {
    const r = await onRequestGet({
      request: new Request("https://subenai.sk/api/tests/check-password"),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_shape");
  });

  it("500 supabase_not_configured when the service-role key is absent", async () => {
    const r = await onRequestGet({
      request: buildRequest(SHARE_ID),
      env: { ...env, SUPABASE_SERVICE_ROLE_KEY: "" },
    });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("supabase_not_configured");
  });

  it("500 lookup_failed when the tests read errors", async () => {
    stubSupabase({ lookupStatus: 503 });
    const r = await onRequestGet({ request: buildRequest(SHARE_ID), env });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("lookup_failed");
  });

  it("anti-enumeration: unknown share_id responds identically to an open test", async () => {
    stubSupabase({ rows: [] });
    const r = await onRequestGet({ request: buildRequest(SHARE_ID), env });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ has_password: false });
  });

  it("fail-closed: password set but JWT_SECRET missing → gate shown (no_cookie)", async () => {
    stubSupabase({ rows: [{ password_hash: "$2a$10$hash", password_hash_version: 3 }] });
    const r = await onRequestGet({
      request: buildRequest(SHARE_ID),
      env: { ...env, JWT_SECRET: "" },
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ has_password: true, gated: true, reason: "no_cookie" });
  });

  it("tampered cookie surfaces as bad_signature, not a silent first-visit", async () => {
    stubSupabase({ rows: [{ password_hash: "$2a$10$hash", password_hash_version: 3 }] });
    const forged = await signRespondentPwdToken(SHARE_ID, 3, "WRONG-secret");
    const r = await onRequestGet({
      request: buildRequest(SHARE_ID, `${RESPONDENT_PWD_COOKIE_NAME}=${forged}`),
      env,
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ has_password: true, gated: true, reason: "bad_signature" });
  });

  it("cookie minted for a different share_id is rejected as wrong_share", async () => {
    stubSupabase({ rows: [{ password_hash: "$2a$10$hash", password_hash_version: 3 }] });
    const other = await signRespondentPwdToken("other-share-id", 3, env.JWT_SECRET);
    const r = await onRequestGet({
      request: buildRequest(SHARE_ID, `${RESPONDENT_PWD_COOKIE_NAME}=${other}`),
      env,
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ has_password: true, gated: true, reason: "wrong_share" });
  });

  it("author rotated the password (pv mismatch) → password_changed re-prompt", async () => {
    stubSupabase({ rows: [{ password_hash: "$2a$10$hash", password_hash_version: 4 }] });
    const stale = await signRespondentPwdToken(SHARE_ID, 3, env.JWT_SECRET);
    const r = await onRequestGet({
      request: buildRequest(SHARE_ID, `${RESPONDENT_PWD_COOKIE_NAME}=${stale}`),
      env,
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      has_password: true,
      gated: true,
      reason: "password_changed",
    });
  });

  it("valid cookie with matching share + pv skips the gate", async () => {
    stubSupabase({ rows: [{ password_hash: "$2a$10$hash", password_hash_version: 3 }] });
    const valid = await signRespondentPwdToken(SHARE_ID, 3, env.JWT_SECRET);
    const r = await onRequestGet({
      request: buildRequest(SHARE_ID, `${RESPONDENT_PWD_COOKIE_NAME}=${valid}`),
      env,
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ has_password: true, gated: false });
  });
});
