import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/support-ticket-create";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  SUPABASE_ANON_KEY: "anon_stub",
  TURNSTILE_SECRET_KEY: "ts-secret-stub",
};

interface MockState {
  turnstileOk?: boolean;
  rpcOk?: boolean;
  rpcResult?: { ticket_id?: string; view_token?: string };
  rpcStatus?: number;
}

/**
 * Build a JWT-shaped string carrying a `sub` claim so the
 * support-ticket-create handler's `decodeJwtSub()` resolves a stable
 * per-user rate-limit bucket. Header/payload/signature are not signed
 * or verified anywhere in the unit tests — the handler only base64-
 * decodes the payload.
 */
function fakeJwt(sub: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "abc" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payload = btoa(JSON.stringify({ sub, aal: "aal1" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${payload}.sig`;
}

function buildRequest(
  body: unknown,
  opts: { ip?: string; auth?: string; userAgent?: string; ipCountry?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": opts.ip ?? "203.0.113.50",
  };
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`;
  if (opts.userAgent) headers["user-agent"] = opts.userAgent;
  if (opts.ipCountry) headers["cf-ipcountry"] = opts.ipCountry;
  return new Request("https://subenai.sk/api/support-ticket-create", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Hostname-equality URL match. `string.includes("api.resend.com")` would
// also match `evil.com/api.resend.com/...` — CodeQL's "incomplete URL
// substring sanitization" rule flags that. Parsing the URL separates
// hostname from path/query so the assertion can't be spoofed.
function isResendUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "api.resend.com";
  } catch {
    return false;
  }
}

function mockFetch(state: MockState) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("turnstile/v0/siteverify")) {
      return new Response(JSON.stringify({ success: state.turnstileOk ?? true }), {
        status: 200,
      });
    }
    if (url.includes("/rest/v1/rpc/submit_support_ticket")) {
      const okBody = state.rpcResult ?? {
        ticket_id: "tkt-test-abc",
        view_token: "a".repeat(64), // 64 hex chars
      };
      if (state.rpcOk === false) {
        return new Response(
          JSON.stringify({ code: "23505", message: "unique constraint failed" }),
          {
            status: state.rpcStatus ?? 500,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify(okBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (isResendUrl(url)) {
      return new Response(JSON.stringify({ id: "email_stub_id" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed", { status: 500 });
  });
}

const validBody = {
  subject: "Niečo sa pokazilo",
  category: "bug",
  body: "Skúšam otvoriť test cez mobilný telefón a vidím chybu. Prikladám detaily.",
  email: "user@example.com",
  name: "Testovací Používateľ",
  turnstile_token: "ts-token-stub",
  _h_addr: "",
};

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/support-ticket-create — anon path", () => {
  it("returns ticket_id + view_token on the happy path", async () => {
    mockFetch({ turnstileOk: true });
    const res = await onRequestPost({ request: buildRequest(validBody), env });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; ticket_id: string; view_token: string };
    expect(json.ok).toBe(true);
    expect(json.ticket_id).toBe("tkt-test-abc");
    expect(json.view_token).toHaveLength(64);
  });

  it("rejects invalid JSON with 400 invalid_json", async () => {
    const req = new Request("https://subenai.sk/api/support-ticket-create", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
      body: "not json",
    });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("silently discards honeypot non-empty submissions", async () => {
    mockFetch({ turnstileOk: true });
    const res = await onRequestPost({
      request: buildRequest({ ...validBody, _h_addr: "https://spam.example.com" }),
      env,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ticket_id: string };
    expect(json.ticket_id).toBe("honeypot-discarded");
  });

  it("rejects missing subject with subject_invalid", async () => {
    mockFetch({ turnstileOk: true });
    const res = await onRequestPost({
      request: buildRequest({ ...validBody, subject: "" }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("subject_invalid");
  });

  it("rejects malformed e-mail with email_invalid", async () => {
    mockFetch({ turnstileOk: true });
    const res = await onRequestPost({
      request: buildRequest({ ...validBody, email: "not-an-email" }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("email_invalid");
  });

  it("rejects unknown category with category_invalid", async () => {
    mockFetch({ turnstileOk: true });
    const res = await onRequestPost({
      request: buildRequest({ ...validBody, category: "made_up_value" }),
      env,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("category_invalid");
  });

  it("rate limits after the per-IP daily cap", async () => {
    mockFetch({ turnstileOk: true });
    const lowCapEnv = { ...env, SUPPORT_PER_IP_PER_DAY: "2" };
    // first 2 succeed
    for (let i = 0; i < 2; i++) {
      const res = await onRequestPost({
        request: buildRequest({ ...validBody, email: `u${i}@example.com` }),
        env: lowCapEnv,
      });
      expect(res.status).toBe(200);
    }
    // third hits the cap
    const res = await onRequestPost({
      request: buildRequest({ ...validBody, email: "u2@example.com" }),
      env: lowCapEnv,
    });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rate_limited_ip");
  });

  it("rejects Turnstile failure with turnstile_failed", async () => {
    mockFetch({ turnstileOk: false });
    const res = await onRequestPost({ request: buildRequest(validBody), env });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("turnstile_failed");
  });

  it("skips Turnstile verification when TURNSTILE_SECRET_KEY is empty (dev mode)", async () => {
    const fetchSpy = mockFetch({ turnstileOk: false });
    const res = await onRequestPost({
      request: buildRequest(validBody),
      env: { ...env, TURNSTILE_SECRET_KEY: "" },
    });
    expect(res.status).toBe(200);
    // siteverify should not have been called
    const calls = fetchSpy.mock.calls.map((c) =>
      typeof c[0] === "string" ? c[0] : (c[0] as Request).url,
    );
    expect(calls.find((u) => u.includes("turnstile/v0/siteverify"))).toBeUndefined();
  });

  it("returns 500 supabase_not_configured when service-role key is missing", async () => {
    mockFetch({ turnstileOk: true });
    const res = await onRequestPost({
      request: buildRequest(validBody),
      env: { ...env, SUPABASE_SERVICE_ROLE_KEY: "" },
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("supabase_not_configured");
  });

  it("returns insert_failed with the postgres code when the RPC errors", async () => {
    mockFetch({ turnstileOk: true, rpcOk: false });
    const res = await onRequestPost({ request: buildRequest(validBody), env });
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string; reason: string };
    expect(json.error).toBe("insert_failed");
    expect(json.reason).toBe("23505");
  });
});

describe("POST /api/support-ticket-create — email dispatch (E48.5)", () => {
  const envWithEmail = {
    ...env,
    RESEND_API_KEY: "resend_stub",
    EMAIL_FROM: "support@subenai.sk",
    EMAIL_REPLY_TO: "support@subenai.sk",
    SITE_ORIGIN: "https://subenai.sk",
  };

  it("dispatches a Resend email with the view link for anonymous submissions", async () => {
    const fetchSpy = mockFetch({ turnstileOk: true });
    const res = await onRequestPost({ request: buildRequest(validBody), env: envWithEmail });
    expect(res.status).toBe(200);

    const emailCall = fetchSpy.mock.calls.find((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as Request).url;
      return isResendUrl(u);
    });
    expect(emailCall).toBeDefined();
    const init = emailCall![1] as RequestInit | undefined;
    const body = JSON.parse(init?.body as string) as {
      to: string[];
      subject: string;
      html: string;
      text: string;
    };
    expect(body.to).toEqual(["user@example.com"]);
    expect(body.subject).toContain("tkt-test-abc");
    expect(body.html).toContain("https://subenai.sk/contact-form/ticket/tkt-test-abc?token=");
    expect(body.text).toContain("Chyba alebo problém");
  });

  it("dispatches an email WITHOUT the view link for authenticated submissions", async () => {
    const fetchSpy = mockFetch({ turnstileOk: true });
    const res = await onRequestPost({
      request: buildRequest(
        { ...validBody, user_id: "u-auth-abc" },
        { auth: fakeJwt("u-auth-abc") },
      ),
      env: envWithEmail,
    });
    expect(res.status).toBe(200);
    const emailCall = fetchSpy.mock.calls.find((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as Request).url;
      return isResendUrl(u);
    });
    expect(emailCall).toBeDefined();
    const body = JSON.parse((emailCall![1] as RequestInit).body as string) as { html: string };
    expect(body.html).not.toContain("Zobraziť vlákno");
    expect(body.html).toContain("Odpovieme ti e-mailom na adresu tvojho účtu.");
  });

  it("does not block the response when email dispatch fails", async () => {
    // Resend returns 500; ticket should still respond 200.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("turnstile/v0/siteverify")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.includes("/rest/v1/rpc/submit_support_ticket")) {
        return new Response(
          JSON.stringify({ ticket_id: "tkt-test-abc", view_token: "b".repeat(64) }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (isResendUrl(url)) {
        return new Response("upstream down", { status: 500 });
      }
      return new Response("not stubbed", { status: 500 });
    });
    const res = await onRequestPost({ request: buildRequest(validBody), env: envWithEmail });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("skips email entirely when Resend env vars are absent (dev mode)", async () => {
    const fetchSpy = mockFetch({ turnstileOk: true });
    const res = await onRequestPost({ request: buildRequest(validBody), env });
    expect(res.status).toBe(200);
    const emailCall = fetchSpy.mock.calls.find((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as Request).url;
      return isResendUrl(u);
    });
    expect(emailCall).toBeUndefined();
  });
});

describe("POST /api/support-ticket-create — auth path", () => {
  it("forwards the JWT and skips Turnstile", async () => {
    const fetchSpy = mockFetch({ turnstileOk: false });
    const jwt = fakeJwt("u-auth-abc");
    const res = await onRequestPost({
      request: buildRequest({ ...validBody, user_id: "u-auth-abc" }, { auth: jwt }),
      env,
    });
    expect(res.status).toBe(200);
    // siteverify not called
    const calls = fetchSpy.mock.calls.map((c) =>
      typeof c[0] === "string" ? c[0] : (c[0] as Request).url,
    );
    expect(calls.find((u) => u.includes("turnstile/v0/siteverify"))).toBeUndefined();
    // RPC called with an auth header bearing the user's JWT (not the service-role)
    const rpcCall = fetchSpy.mock.calls.find((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as Request).url;
      return u.includes("/rest/v1/rpc/submit_support_ticket");
    });
    expect(rpcCall).toBeDefined();
    const rpcInit = rpcCall![1] as RequestInit | undefined;
    const sentAuth = new Headers(rpcInit?.headers).get("authorization");
    expect(sentAuth).toBe(`Bearer ${jwt}`);
  });

  it("rate-limits per user (not per IP) on the auth path", async () => {
    mockFetch({ turnstileOk: true });
    // Single user (`sub=u-auth-abc`) — the bucket is keyed on the JWT
    // `sub` claim, NOT the JWT bytes or the client IP. Varying IPs across
    // these 11 calls must NOT widen the bucket.
    const jwt = fakeJwt("u-auth-abc");
    for (let i = 0; i < 10; i++) {
      const res = await onRequestPost({
        request: buildRequest(
          { ...validBody, user_id: "u-auth-abc" },
          { auth: jwt, ip: `203.0.113.${i}` },
        ),
        env,
      });
      expect(res.status).toBe(200);
    }
    const res = await onRequestPost({
      request: buildRequest(
        { ...validBody, user_id: "u-auth-abc" },
        { auth: jwt, ip: "203.0.113.99" },
      ),
      env,
    });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rate_limited_user");
  });

  it("isolates per-user buckets by JWT `sub` (audit A2 regression)", async () => {
    // Two distinct Supabase users sharing the same JWT header (alg/typ/kid
    // prefix) — keying on `jwt.slice(0,32)` would collapse them into one
    // shared bucket. Keying on `sub` keeps them separate.
    mockFetch({ turnstileOk: true });
    const jwtA = fakeJwt("user-aaaa-1111");
    const jwtB = fakeJwt("user-bbbb-2222");
    expect(jwtA.slice(0, 32)).toBe(jwtB.slice(0, 32)); // same header prefix
    // Burn user A's quota (10).
    for (let i = 0; i < 10; i++) {
      const res = await onRequestPost({
        request: buildRequest(
          { ...validBody, user_id: "user-aaaa-1111" },
          { auth: jwtA, ip: `198.51.100.${i}` },
        ),
        env,
      });
      expect(res.status).toBe(200);
    }
    // 11th from user A → rate-limited.
    const denied = await onRequestPost({
      request: buildRequest(
        { ...validBody, user_id: "user-aaaa-1111" },
        { auth: jwtA, ip: "198.51.100.50" },
      ),
      env,
    });
    expect(denied.status).toBe(429);
    // But user B can still submit — separate bucket.
    const ok = await onRequestPost({
      request: buildRequest(
        { ...validBody, user_id: "user-bbbb-2222" },
        { auth: jwtB, ip: "198.51.100.51" },
      ),
      env,
    });
    expect(ok.status).toBe(200);
  });
});
