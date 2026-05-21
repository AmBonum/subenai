import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost, __test__ } from "../../functions/api/tests/send-invites";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  SUPABASE_ANON_KEY: "anon_stub",
  RESEND_API_KEY: "resend_stub",
  EMAIL_FROM: "pozvanky@subenai.sk",
  EMAIL_REPLY_TO: "podpora@subenai.sk",
};

const OWNER_ID = "11111111-2222-3333-4444-555555555555";
const TEST_ID = "test-uuid-1111";

function buildRequest(body: unknown, opts?: { authToken?: string | null; ip?: string }) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": opts?.ip ?? "203.0.113.42",
  };
  if (opts?.authToken !== null) {
    headers.authorization = `Bearer ${opts?.authToken ?? "user-jwt-stub"}`;
  }
  return new Request("https://subenai.sk/api/tests/send-invites", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

interface StubState {
  testRow?: {
    id: string;
    share_id: string;
    title: string;
    owner_id: string;
    status: string;
    password_hash: string | null;
  } | null;
  testLookupError?: string;
  profileRow?: { display_name: string } | null;
  resendFail?: { recipient: string; status: number };
  user?: { id: string; email: string } | null;
  userErr?: boolean;
  verifyResult?: { verified: boolean };
  verifyError?: string;
}

function stubAll(state: StubState) {
  const resendCalls: Array<{ to: string; subject: string }> = [];
  const auditInserts: Array<Record<string, unknown>> = [];

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    // Supabase auth getUser
    if (url.includes("/auth/v1/user")) {
      if (state.userErr) return new Response("{}", { status: 401 });
      const user = state.user ?? { id: OWNER_ID, email: "author@example.com" };
      return new Response(JSON.stringify({ id: user.id, email: user.email }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // tests lookup
    if (url.includes("/rest/v1/tests?") && method === "GET") {
      if (state.testLookupError) {
        return new Response(JSON.stringify({ message: state.testLookupError }), { status: 400 });
      }
      const row =
        state.testRow === undefined
          ? {
              id: TEST_ID,
              share_id: "abcdefgh1234",
              title: "Test title",
              owner_id: OWNER_ID,
              status: "published",
              password_hash: null,
            }
          : state.testRow;
      return new Response(JSON.stringify(row === null ? [] : [row]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // profiles lookup
    if (url.includes("/rest/v1/profiles?") && method === "GET") {
      const profile = state.profileRow ?? { display_name: "Anna Author" };
      return new Response(JSON.stringify(profile === null ? [] : [profile]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // verify_test_password RPC
    if (url.includes("/rest/v1/rpc/verify_test_password")) {
      if (state.verifyError) {
        return new Response(JSON.stringify({ message: state.verifyError }), { status: 400 });
      }
      const row = state.verifyResult ?? { verified: true };
      return new Response(JSON.stringify([{ ...row, current_pv: 1 }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // audit_log INSERT
    if (url.includes("/rest/v1/audit_log") && method === "POST") {
      const parsed = JSON.parse((init?.body as string) ?? "{}");
      auditInserts.push(parsed);
      return new Response("[]", { status: 201 });
    }
    // Resend send
    if (url.includes("api.resend.com/emails")) {
      const parsed = JSON.parse((init?.body as string) ?? "{}");
      const to = (parsed.to as string[])?.[0] ?? "";
      resendCalls.push({ to, subject: parsed.subject });
      if (state.resendFail && state.resendFail.recipient === to) {
        return new Response(JSON.stringify({ message: "rejected" }), {
          status: state.resendFail.status,
        });
      }
      return new Response(JSON.stringify({ id: `resend-msg-${to}` }), { status: 200 });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });

  return { resendCalls, auditInserts };
}

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/tests/send-invites", () => {
  it("401 unauthorized when no Authorization header", async () => {
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: ["a@b.c"] }, { authToken: null }),
      env,
    });
    expect(r.status).toBe(401);
  });

  it("400 invalid_shape when test_id missing or recipients not array", async () => {
    stubAll({});
    const r1 = await onRequestPost({
      request: buildRequest({ recipients: ["a@b.c"] }),
      env,
    });
    expect(r1.status).toBe(400);
    const r2 = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: "a@b.c" }),
      env,
    });
    expect(r2.status).toBe(400);
  });

  it("400 no_valid_recipients when none of the addresses are valid", async () => {
    stubAll({});
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: ["not-an-email", "also@nope"] }),
      env,
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("no_valid_recipients");
  });

  it("403 not_owner when test belongs to someone else", async () => {
    stubAll({
      testRow: {
        id: TEST_ID,
        share_id: "abcdefgh1234",
        title: "Test",
        owner_id: "different-owner-id",
        status: "published",
        password_hash: null,
      },
    });
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: ["recipient@example.com"] }),
      env,
    });
    expect(r.status).toBe(403);
  });

  it("404 test_not_found when the test doesn't exist", async () => {
    stubAll({ testRow: null });
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: ["recipient@example.com"] }),
      env,
    });
    expect(r.status).toBe(404);
  });

  it("400 not_published when test is draft / archived", async () => {
    stubAll({
      testRow: {
        id: TEST_ID,
        share_id: "abcdefgh1234",
        title: "Test",
        owner_id: OWNER_ID,
        status: "draft",
        password_hash: null,
      },
    });
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: ["recipient@example.com"] }),
      env,
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("not_published");
  });

  it("200 ok with sent=1 + audit row written + Resend called", async () => {
    const { resendCalls, auditInserts } = stubAll({});
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: ["one@example.com"] }),
      env,
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(resendCalls).toHaveLength(1);
    expect(resendCalls[0].to).toBe("one@example.com");
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0].action).toBe("test_invite_sent");
    expect(auditInserts[0].pii_access).toBe(true);
  });

  it("partial success: 200 with sent=1 + failed=1 + no audit for the failed one", async () => {
    const { auditInserts } = stubAll({
      resendFail: { recipient: "bad@example.com", status: 400 },
    });
    const r = await onRequestPost({
      request: buildRequest({
        test_id: TEST_ID,
        recipients: ["good@example.com", "bad@example.com"],
      }),
      env,
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    // R6: audit row written ONLY after Resend 2xx. So one row for the good one.
    expect(auditInserts).toHaveLength(1);
  });

  it("dedupes + lowercases recipients", async () => {
    const { resendCalls } = stubAll({});
    const r = await onRequestPost({
      request: buildRequest({
        test_id: TEST_ID,
        recipients: ["one@example.com", "One@Example.com", " one@example.com "],
      }),
      env,
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.sent).toBe(1);
    expect(resendCalls).toHaveLength(1);
  });

  it("caps recipients at MAX_RECIPIENTS_PER_SEND", async () => {
    const { resendCalls } = stubAll({});
    const tooMany = Array.from({ length: 60 }, (_, i) => `r${i}@example.com`);
    const r = await onRequestPost({
      request: buildRequest({ test_id: TEST_ID, recipients: tooMany }),
      env,
    });
    expect(r.status).toBe(200);
    expect(resendCalls.length).toBe(__test__.MAX_RECIPIENTS_PER_SEND);
  });

  it("429 rate_limited_ip after exceeding the per-IP-per-hour cap", async () => {
    stubAll({});
    // The first DEFAULT_PER_IP_PER_HOUR sends succeed; the next is blocked.
    for (let i = 0; i < __test__.DEFAULT_PER_IP_PER_HOUR; i++) {
      const r = await onRequestPost({
        request: buildRequest(
          { test_id: TEST_ID, recipients: [`r${i}@example.com`] },
          { ip: "198.51.100.50" },
        ),
        env,
      });
      expect(r.status).toBe(200);
    }
    const blocked = await onRequestPost({
      request: buildRequest(
        { test_id: TEST_ID, recipients: ["over@example.com"] },
        { ip: "198.51.100.50" },
      ),
      env,
    });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("rate_limited_ip");
  });

  it("400 no_password_set when include_password=true on a password-less test", async () => {
    stubAll({});
    const r = await onRequestPost({
      request: buildRequest({
        test_id: TEST_ID,
        recipients: ["one@example.com"],
        include_password: true,
        password: "anything",
      }),
      env,
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("no_password_set");
  });

  it("400 wrong_password when include_password=true and RPC verify returns false", async () => {
    stubAll({
      testRow: {
        id: TEST_ID,
        share_id: "abcdefgh1234",
        title: "Locked test",
        owner_id: OWNER_ID,
        status: "published",
        password_hash: "$2a$10$stub",
      },
      verifyResult: { verified: false },
    });
    const r = await onRequestPost({
      request: buildRequest({
        test_id: TEST_ID,
        recipients: ["one@example.com"],
        include_password: true,
        password: "wrong-password",
      }),
      env,
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("wrong_password");
  });

  it("succeeds with include_password=true when RPC verify returns true", async () => {
    const { resendCalls } = stubAll({
      testRow: {
        id: TEST_ID,
        share_id: "abcdefgh1234",
        title: "Locked test",
        owner_id: OWNER_ID,
        status: "published",
        password_hash: "$2a$10$stub",
      },
      verifyResult: { verified: true },
    });
    const r = await onRequestPost({
      request: buildRequest({
        test_id: TEST_ID,
        recipients: ["one@example.com"],
        include_password: true,
        password: "right-password",
      }),
      env,
    });
    expect(r.status).toBe(200);
    expect(resendCalls).toHaveLength(1);
    expect(resendCalls[0].subject).toContain("heslo v tomto e-maile");
  });

  it("hashEmail produces a 64-char hex digest, stable + case-insensitive", async () => {
    const a = await __test__.hashEmail("one@example.com");
    const b = await __test__.hashEmail("ONE@Example.com");
    const c = await __test__.hashEmail("two@example.com");
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]+$/);
  });
});
