import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  onRequestPost,
  onRequestDelete,
  __test__,
} from "../../functions/api/verify-author-password";
import { __test__ as security__test__ } from "../../functions/_lib/security";
import { verifyEduAuthorToken } from "../../functions/_lib/jwt";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  JWT_SECRET: "test-secret",
};

function buildRequest(body: unknown, ip = "203.0.113.30", method = "POST") {
  return new Request("https://subenai.sk/api/verify-author-password", {
    method,
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockRpc(returnValue: unknown, errorMessage: string | null = null) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/rest/v1/rpc/verify_test_set_password")) {
      if (errorMessage) {
        return new Response(JSON.stringify({ message: errorMessage }), { status: 400 });
      }
      return new Response(JSON.stringify(returnValue), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed", { status: 500 });
  });
}

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/verify-author-password", () => {
  it("issues a verifiable HttpOnly cookie on success", async () => {
    mockRpc(true);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", password: "right-password" }),
      env,
    });
    expect(r.status).toBe(200);
    const setCookie = r.headers.get("set-cookie") || "";
    expect(setCookie).toContain("subenai_edu_author=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    // Cookie path MUST be "/" so the dashboard's fetch("/api/results-data")
    // (and other /api/* calls) carries the cookie. A narrow per-set path
    // would silently break the auth loop — the dashboard never loads. The
    // set_id is enforced server-side via JWT claims, not cookie scope.
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Path=/test/zostava/");
    const token = setCookie.split(";")[0].split("=")[1];
    const verify = await verifyEduAuthorToken(token, env.JWT_SECRET);
    expect(verify.ok).toBe(true);
    if (verify.ok) {
      expect(verify.claims.set_id).toBe("set-1");
      expect(verify.claims.role).toBe("author");
    }
  });

  it("401 unauthorized + no cookie on RPC returning false", async () => {
    mockRpc(false);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", password: "wrong" }),
      env,
    });
    expect(r.status).toBe(401);
    expect(r.headers.get("set-cookie")).toBeNull();
    expect((await r.json()).error).toBe("unauthorized");
  });

  it("429 rate_limited after the 6th attempt on the same (IP,set)", async () => {
    mockRpc(false);
    for (let i = 0; i < 5; i++) {
      const r = await onRequestPost({
        request: buildRequest({ set_id: "set-1", password: `wrong${i}` }, "198.51.100.30"),
        env,
      });
      expect(r.status).toBe(401);
    }
    const blocked = await onRequestPost({
      request: buildRequest({ set_id: "set-1", password: "wrong6" }, "198.51.100.30"),
      env,
    });
    expect(blocked.status).toBe(429);
  });

  it("500 jwt_not_configured if secret missing", async () => {
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", password: "x" }),
      env: { ...env, JWT_SECRET: "" },
    });
    expect(r.status).toBe(500);
  });

  it("400 invalid_shape when set_id or password missing", async () => {
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1" }),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_shape");
  });
});

describe("DELETE /api/verify-author-password (logout)", () => {
  it("returns Set-Cookie with Max-Age=0 + Path=/ to clear the session", async () => {
    const r = await onRequestDelete({
      request: buildRequest({ set_id: "set-1" }, undefined, "DELETE"),
      env,
    });
    expect(r.status).toBe(200);
    const setCookie = r.headers.get("set-cookie") || "";
    expect(setCookie).toContain("subenai_edu_author=");
    expect(setCookie).toContain("Max-Age=0");
    // Clear-Cookie Path MUST match the set-time Path (also "/"). A mismatched
    // Path would create a new path-scoped cookie instead of clearing the
    // root-scope one — logout would silently leave the auth cookie live.
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Path=/test/zostava/");
  });
});

describe("buildCookie helper", () => {
  it("uses Path=/ so cookie reaches /api/* endpoints called from the dashboard", () => {
    // Regression sentinel: prior implementation used Path=/test/zostava/${setId}
    // which caused the browser to refuse sending the cookie on the
    // /api/results-data fetch, breaking the dashboard for every real user.
    // Pinned 2026-05-20 from /schools how-it-works contract test (P0).
    const c = __test__.buildCookie("abc-123", "tok", 60);
    expect(c).toContain("Path=/");
    expect(c).not.toContain("Path=/test/zostava/abc-123");
  });
});
