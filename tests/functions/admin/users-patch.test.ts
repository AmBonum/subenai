// AH-11.3 Part 2 — PATCH /api/admin/users/:id tests.
//
// The function uses two Supabase clients: the anon client (caller JWT
// verification + has_role RPC) and the service-role client (mutations).
// Both go through the @supabase/supabase-js fetch layer, so we mock that.

import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPatch } from "../../../functions/api/admin/users/[id]";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_ANON_KEY: "anon_stub",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
};

const CALLER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TARGET_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

interface SupabaseMockState {
  callerId?: string | null;
  hasAdminRole?: boolean;
  roleCheckError?: boolean;
  roleDeleteError?: boolean;
  roleInsertError?: boolean;
  banError?: boolean;
}

function mockFetch(state: SupabaseMockState) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = (init?.method ?? "GET").toUpperCase();

    // Caller JWT verification (anon client.auth.getUser)
    if (url.endsWith("/auth/v1/user")) {
      if (state.callerId === null) {
        return new Response(JSON.stringify({ msg: "invalid token" }), { status: 401 });
      }
      return new Response(JSON.stringify({ id: state.callerId ?? CALLER_ID }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // has_role RPC
    if (url.endsWith("/rest/v1/rpc/has_role")) {
      if (state.roleCheckError) return new Response("err", { status: 500 });
      return new Response(JSON.stringify(state.hasAdminRole ?? true), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // user_roles DELETE / INSERT (service-role)
    if (url.includes("/rest/v1/user_roles")) {
      if (method === "DELETE") {
        if (state.roleDeleteError) return new Response("err", { status: 500 });
        return new Response("[]", { status: 200 });
      }
      if (method === "POST") {
        if (state.roleInsertError) return new Response("err", { status: 500 });
        return new Response(JSON.stringify({ role: "admin" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // auth.admin.updateUserById
    if (url.includes("/auth/v1/admin/users/")) {
      if (state.banError) return new Response("err", { status: 500 });
      return new Response(JSON.stringify({ id: TARGET_ID }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // log_audit_event RPC — always succeed in tests
    if (url.endsWith("/rest/v1/rpc/log_audit_event")) {
      return new Response(JSON.stringify("00000000-0000-0000-0000-000000000000"), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("not stubbed: " + url, { status: 500 });
  });
}

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://subenai.sk/api/admin/users/${TARGET_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/admin/users/:id", () => {
  it("returns 500 when env not configured", async () => {
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }),
      env: { SUPABASE_URL: "", SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "" },
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("supabase_not_configured");
  });

  it("returns 400 on non-UUID id", async () => {
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }),
      env,
      params: { id: "not-a-uuid" },
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_user_id");
  });

  it("returns 401 when no bearer token", async () => {
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("no_token");
  });

  it("returns 401 when token rejected by supabase", async () => {
    mockFetch({ callerId: null });
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }, { authorization: "Bearer bad" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("invalid_token");
  });

  it("returns 403 when caller is not admin", async () => {
    mockFetch({ hasAdminRole: false });
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("not_admin");
  });

  it("returns 400 on empty body (no role and no banned)", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPatch({
      request: buildRequest({}, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("no_changes");
  });

  it("returns 400 on invalid role value", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPatch({
      request: buildRequest({ role: "superuser" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_role");
  });

  it("returns 400 on non-boolean banned", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPatch({
      request: buildRequest({ banned: "yes" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_banned");
  });

  it("prevents admin from demoting self", async () => {
    mockFetch({ hasAdminRole: true, callerId: TARGET_ID });
    const r = await onRequestPatch({
      request: buildRequest({ role: "user" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("cannot_demote_self");
  });

  it("prevents admin from banning self", async () => {
    mockFetch({ hasAdminRole: true, callerId: TARGET_ID });
    const r = await onRequestPatch({
      request: buildRequest({ banned: true }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("cannot_ban_self");
  });

  it("happy path — promote to admin returns 200", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.user_id).toBe(TARGET_ID);
    expect(body.role).toBe("admin");
  });

  it("happy path — set role 'user' clears user_roles without insert", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPatch({
      request: buildRequest({ role: "user" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(200);
    expect((await r.json()).role).toBe("user");
  });

  it("happy path — banned toggle returns 200", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPatch({
      request: buildRequest({ banned: true }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.banned).toBe(true);
  });

  it("500 when role delete fails", async () => {
    mockFetch({ hasAdminRole: true, roleDeleteError: true });
    const r = await onRequestPatch({
      request: buildRequest({ role: "admin" }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("role_clear_failed");
  });

  it("500 when ban update fails", async () => {
    mockFetch({ hasAdminRole: true, banError: true });
    const r = await onRequestPatch({
      request: buildRequest({ banned: true }, { authorization: "Bearer ok" }),
      env,
      params: { id: TARGET_ID },
    });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("ban_update_failed");
  });
});
