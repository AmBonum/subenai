import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/support-ticket-reply";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  SUPABASE_ANON_KEY: "anon_stub",
  RESEND_API_KEY: "resend_stub",
  EMAIL_FROM: "noreply@subenai.sk",
  EMAIL_REPLY_TO: "support@subenai.sk",
  SITE_ORIGIN: "https://subenai.sk",
};

const ticketId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";

// Build a synthetic JWT whose payload decodes to { aal: <aal>, sub: adminId }.
// Signature is a stub — the function only verifies `aal` from the payload
// itself; getUser() comes from the mocked Supabase fetch responses.
function makeJwt(aal: "aal1" | "aal2" = "aal2"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ aal, sub: adminId }))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payload}.sig`;
}

interface MockState {
  userOk?: boolean;
  hasRoleResult?: boolean;
  ticketStatus?: "new" | "in_progress" | "waiting_user" | "resolved" | "archived";
  ticketMissing?: boolean;
  insertOk?: boolean;
  tokenInvalidated?: boolean;
  tokenExpired?: boolean;
  regenTokenResult?: string | null;
  regenTokenCalls?: string[];
  transitionCalls?: string[];
  emailCalled?: { value: boolean };
  lastEmailBody?: { value: string };
}

function buildRequest(body: unknown, opts: { auth?: string } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.auth !== undefined) headers.authorization = `Bearer ${opts.auth}`;
  return new Request("https://subenai.sk/api/support-ticket-reply", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockFetch(state: MockState) {
  state.transitionCalls = state.transitionCalls ?? [];
  state.regenTokenCalls = state.regenTokenCalls ?? [];
  state.emailCalled = state.emailCalled ?? { value: false };
  state.lastEmailBody = state.lastEmailBody ?? { value: "" };
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;

    // Supabase auth.getUser()
    if (url.endsWith("/auth/v1/user")) {
      if (state.userOk === false) {
        return new Response(JSON.stringify({ error: "invalid_jwt" }), { status: 401 });
      }
      return new Response(
        JSON.stringify({ id: adminId, email: "admin@example.com", aud: "authenticated" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // has_role RPC
    if (url.endsWith("/rest/v1/rpc/has_role")) {
      return new Response(JSON.stringify(state.hasRoleResult ?? true), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // regenerate_support_ticket_view_token RPC
    if (url.endsWith("/rest/v1/rpc/regenerate_support_ticket_view_token")) {
      const bodyStr = (init?.body as string) ?? "";
      try {
        const parsed = JSON.parse(bodyStr) as { p_ticket_id?: string };
        if (parsed.p_ticket_id) state.regenTokenCalls!.push(parsed.p_ticket_id);
      } catch {
        /* ignore */
      }
      if (state.regenTokenResult === null) {
        return new Response(JSON.stringify({ code: "PGRST", message: "regen_failed" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      const token = state.regenTokenResult ?? "fresh-token-abc123";
      return new Response(JSON.stringify(token), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // transition_ticket_status RPC
    if (url.endsWith("/rest/v1/rpc/transition_ticket_status")) {
      const bodyStr = (init?.body as string) ?? "";
      try {
        const parsed = JSON.parse(bodyStr) as { p_new_status?: string };
        if (parsed.p_new_status) state.transitionCalls!.push(parsed.p_new_status);
      } catch {
        /* ignore */
      }
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // profiles lookup
    if (url.includes("/rest/v1/profiles")) {
      return new Response(
        JSON.stringify({ display_name: "Anna Admin", email: "admin@example.com" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // support_tickets lookup
    if (url.includes("/rest/v1/support_tickets") && (init?.method ?? "GET") === "GET") {
      if (state.ticketMissing) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const expires = state.tokenExpired
        ? new Date(Date.now() - 1000).toISOString()
        : new Date(Date.now() + 86_400_000).toISOString();
      return new Response(
        JSON.stringify({
          id: ticketId,
          subject: "Test subject",
          status: state.ticketStatus ?? "new",
          submitter_email: "user@example.com",
          view_token_hash: "hash",
          view_token_expires_at: expires,
          view_token_invalidated_at: state.tokenInvalidated ? new Date().toISOString() : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // support_ticket_messages INSERT
    if (url.includes("/rest/v1/support_ticket_messages")) {
      if (state.insertOk === false) {
        return new Response(JSON.stringify({ code: "23505", message: "conflict" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ id: "msg-001" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    // Resend
    if (url.includes("api.resend.com/emails")) {
      state.emailCalled!.value = true;
      state.lastEmailBody!.value = (init?.body as string) ?? "";
      return new Response(JSON.stringify({ id: "email-stub" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("not stubbed: " + url, { status: 500 });
  });
}

const validBody = {
  ticket_id: ticketId,
  body: "Dobrý deň, prosím o ďalšie detaily k vašej žiadosti.",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/support-ticket-reply — auth gate", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await onRequestPost({ request: buildRequest(validBody), env });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("not_authenticated");
  });

  it("returns 401 when JWT is empty string", async () => {
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: "" }),
      env,
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when getUser() rejects the JWT", async () => {
    mockFetch({ userOk: false });
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("not_authenticated");
  });

  it("returns 403 when user is not admin", async () => {
    mockFetch({ hasRoleResult: false });
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_admin");
  });

  it("returns 403 when JWT does not carry aal2 claim", async () => {
    mockFetch({ hasRoleResult: true });
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal1") }),
      env,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("aal2_required");
  });
});

describe("POST /api/support-ticket-reply — input validation", () => {
  it("returns 400 on malformed JSON", async () => {
    const req = new Request("https://subenai.sk/api/support-ticket-reply", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${makeJwt("aal2")}` },
      body: "not json",
    });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("returns 400 when ticket_id is not a UUID", async () => {
    const res = await onRequestPost({
      request: buildRequest({ ticket_id: "not-a-uuid", body: "Reply." }, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ticket_id_invalid");
  });

  it("returns 400 when body is empty", async () => {
    const res = await onRequestPost({
      request: buildRequest({ ticket_id: ticketId, body: "" }, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("body_invalid");
  });

  it("returns 400 when body exceeds 10000 characters", async () => {
    const res = await onRequestPost({
      request: buildRequest(
        { ticket_id: ticketId, body: "x".repeat(10_001) },
        { auth: makeJwt("aal2") },
      ),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("body_invalid");
  });
});

describe("POST /api/support-ticket-reply — happy path + state machine", () => {
  it("returns 404 when ticket does not exist", async () => {
    mockFetch({ hasRoleResult: true, ticketMissing: true });
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("ticket_not_found");
  });

  it("inserts message, transitions new → in_progress → waiting_user, returns message_id", async () => {
    const state: MockState = { hasRoleResult: true, ticketStatus: "new" };
    mockFetch(state);
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; message_id: string };
    expect(json.ok).toBe(true);
    expect(json.message_id).toBe("msg-001");
    expect(state.transitionCalls).toEqual(["in_progress", "waiting_user"]);
  });

  it("transitions in_progress → waiting_user (single hop)", async () => {
    const state: MockState = { hasRoleResult: true, ticketStatus: "in_progress" };
    mockFetch(state);
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(200);
    expect(state.transitionCalls).toEqual(["waiting_user"]);
  });

  it("returns 500 with insert_failed when message insert fails", async () => {
    mockFetch({ hasRoleResult: true, ticketStatus: "new", insertOk: false });
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("insert_failed");
  });

  it("dispatches Resend email when SMTP env is configured", async () => {
    const state: MockState = { hasRoleResult: true, ticketStatus: "in_progress" };
    mockFetch(state);
    await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(state.emailCalled!.value).toBe(true);
  });

  it("skips email dispatch when RESEND_API_KEY is missing", async () => {
    const state: MockState = { hasRoleResult: true, ticketStatus: "in_progress" };
    mockFetch(state);
    const envNoMail = { ...env, RESEND_API_KEY: undefined };
    await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env: envNoMail,
    });
    expect(state.emailCalled!.value).toBe(false);
  });
});

describe("POST /api/support-ticket-reply — view_token rotation", () => {
  it("calls regenerate_support_ticket_view_token with the correct p_ticket_id", async () => {
    const state: MockState = { hasRoleResult: true, ticketStatus: "in_progress" };
    mockFetch(state);
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(200);
    expect(state.regenTokenCalls).toContain(ticketId);
  });

  it("constructs viewUrl with ?token= param from the freshly minted plaintext", async () => {
    const state: MockState = {
      hasRoleResult: true,
      ticketStatus: "in_progress",
      regenTokenResult: "deadbeefcafe1234",
    };
    mockFetch(state);
    await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(state.emailCalled!.value).toBe(true);
    const emailPayload = JSON.parse(state.lastEmailBody!.value) as { html?: string; text?: string };
    const needle = `?token=${encodeURIComponent("deadbeefcafe1234")}`;
    expect(emailPayload.html ?? "").toContain(needle);
    expect(emailPayload.text ?? "").toContain(needle);
  });

  it("still sends email and persists reply when token regen fails", async () => {
    const state: MockState = {
      hasRoleResult: true,
      ticketStatus: "in_progress",
      regenTokenResult: null,
    };
    mockFetch(state);
    const res = await onRequestPost({
      request: buildRequest(validBody, { auth: makeJwt("aal2") }),
      env,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; message_id: string };
    expect(json.ok).toBe(true);
    expect(json.message_id).toBe("msg-001");
    expect(state.emailCalled!.value).toBe(true);
    const emailPayload = JSON.parse(state.lastEmailBody!.value) as { html?: string; text?: string };
    expect(emailPayload.html ?? "").not.toContain("?token=");
    expect(emailPayload.text ?? "").not.toContain("?token=");
  });
});
