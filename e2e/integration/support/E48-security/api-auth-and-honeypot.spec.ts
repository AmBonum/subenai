import { test, expect } from "@playwright/test";

// E48 security — API-layer happy paths + auth/honeypot/rate-limit gates.
// Traces TC-01 .. TC-08 from specs/support/E48-security.md.
//
// These tests hit the live CF Pages Function via wrangler (default port
// 8788). They exercise the pre-Supabase gates (honeypot, IP cap, email
// cooldown, auth/AAL2 check) using the wire contract — error code names
// and status codes only, so the test stays meaningful even when the
// downstream Supabase project changes.
//
// Tests that need live Supabase state (TC-02 reply happy path, TC-09/10
// view-token revocation) are gated by SUPPORT_LIVE_DB; without it they
// no-op so CI without env vars stays green.
const ENDPOINT_CREATE = "/api/support-ticket-create";
const ENDPOINT_REPLY = "/api/support-ticket-reply";

test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);

const validCreatePayload = {
  subject: "Security TC integration",
  category: "question",
  body: "Body s aspoň dvadsiatimi znakmi pre validáciu.",
  email: "security@test.example",
  name: "Security Tester",
  turnstile_token: "test-token",
  _h_addr: "",
};

test.describe("E48 security — POST /api/support-ticket-create happy path", () => {
  test.skip(!LIVE_DB, "TC-01 needs live Supabase (set SUPPORT_LIVE_DB=1)");

  test("TC-01: valid anon POST returns 200 + ticket_id + 64-hex view_token", async ({ request }) => {
    const r = await request.post(ENDPOINT_CREATE, {
      data: { ...validCreatePayload, email: `tc01-${Date.now()}@test.example` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.ticket_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.view_token).toMatch(/^[0-9a-f]{64}$/);
  });
});

test.describe("E48 security — POST /api/support-ticket-reply happy + auth gates", () => {
  test("TC-02: valid admin AAL2 JWT reaches the reply RPC and returns ok + message_id", async ({
    request,
  }) => {
    test.skip(
      !LIVE_DB || !process.env.SUPPORT_ADMIN_JWT || !process.env.SUPPORT_SEEDED_TICKET_ID,
      "needs SUPPORT_LIVE_DB + SUPPORT_ADMIN_JWT (AAL2) + SUPPORT_SEEDED_TICKET_ID",
    );
    const r = await request.post(ENDPOINT_REPLY, {
      headers: { authorization: `Bearer ${process.env.SUPPORT_ADMIN_JWT}` },
      data: {
        ticket_id: process.env.SUPPORT_SEEDED_TICKET_ID,
        body: "Reply body that satisfies length validation.",
      },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.message_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  // TC-06: missing Authorization header.
  test("TC-06: reply without Authorization header returns 401 not_authenticated", async ({
    request,
  }) => {
    const r = await request.post(ENDPOINT_REPLY, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "reply body" },
    });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe("not_authenticated");
  });

  test("TC-07: reply with non-admin JWT returns 403 not_admin", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_NON_ADMIN_JWT,
      "needs SUPPORT_NON_ADMIN_JWT (a valid Supabase JWT for audit-bot@subenai.test or similar non-admin user)",
    );
    const r = await request.post(ENDPOINT_REPLY, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "reply body" },
      headers: { authorization: `Bearer ${process.env.SUPPORT_NON_ADMIN_JWT}` },
    });
    expect(r.status()).toBe(403);
    expect((await r.json()).error).toBe("not_admin");
  });

  test("TC-08: reply with AAL1 admin JWT returns 403 aal2_required", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_ADMIN_AAL1_JWT,
      "needs SUPPORT_ADMIN_AAL1_JWT (admin JWT with aal=aal1 — see open question in specs/support/E48-security.md)",
    );
    const r = await request.post(ENDPOINT_REPLY, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "reply body" },
      headers: { authorization: `Bearer ${process.env.SUPPORT_ADMIN_AAL1_JWT}` },
    });
    expect(r.status()).toBe(403);
    expect((await r.json()).error).toBe("aal2_required");
  });
});

test.describe("E48 security — honeypot + rate-limit", () => {
  // TC-03 — honeypot. This is the only test in this file that doesn't
  // depend on live Supabase (honeypot short-circuits before the DB).
  test("TC-03: non-empty honeypot returns 200 with ticket_id: 'honeypot-discarded'", async ({
    request,
  }) => {
    const r = await request.post(ENDPOINT_CREATE, {
      data: {
        subject: "Spam",
        body: "Spam body that satisfies length validation here.",
        email: "bot@example.com",
        category: "question",
        _h_addr: "http://spam.example/",
        turnstile_token: "test-token",
      },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.ticket_id).toBe("honeypot-discarded");
    expect(body.view_token).toBe("discarded");
  });

  // TC-04 — IP cap. Requires a fresh wrangler runtime OR a control over
  // SUPPORT_PER_IP_PER_DAY in the dev process. Gated for local-only runs
  // where the operator has spun up wrangler with `SUPPORT_PER_IP_PER_DAY=2`.
  test("TC-04: 21st request from same IP within 24h returns 429 rate_limited_ip", async ({
    request,
  }) => {
    test.skip(
      !process.env.SUPPORT_RATELIMIT_TEST,
      "needs wrangler started with SUPPORT_PER_IP_PER_DAY=20 + a fresh in-memory counter (set SUPPORT_RATELIMIT_TEST=1)",
    );
    // Fire 20 valid requests to fill the counter, then assert the 21st flips to 429.
    for (let i = 0; i < 20; i++) {
      const r = await request.post(ENDPOINT_CREATE, {
        data: { ...validCreatePayload, email: `tc04-${i}-${Date.now()}@test.example` },
      });
      // Accept either 200 (DB seeded) or 200 honeypot, but NOT 429 mid-loop.
      expect(r.status()).not.toBe(429);
    }
    const r21 = await request.post(ENDPOINT_CREATE, {
      data: { ...validCreatePayload, email: `tc04-21-${Date.now()}@test.example` },
    });
    expect(r21.status()).toBe(429);
    expect((await r21.json()).error).toBe("rate_limited_ip");
  });

  // TC-05 — email cooldown. Needs SUPPORT_LIVE_DB (cooldown logic queries
  // the support_tickets row for last submission ts).
  test("TC-05: second submission with same email within 10 min returns 429 email_cooldown", async ({
    request,
  }) => {
    test.skip(!LIVE_DB, "needs live Supabase + clean cooldown window (set SUPPORT_LIVE_DB=1)");
    const email = `tc05-${Date.now()}@test.example`;
    const first = await request.post(ENDPOINT_CREATE, {
      data: { ...validCreatePayload, email },
    });
    expect(first.status()).toBe(200);
    const second = await request.post(ENDPOINT_CREATE, {
      data: { ...validCreatePayload, email },
    });
    expect(second.status()).toBe(429);
    expect((await second.json()).error).toBe("email_cooldown");
  });
});
