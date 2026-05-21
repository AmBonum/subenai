import { test, expect } from "@playwright/test";

// E48 — API integration tests for POST /api/support-ticket-reply.
//
// Same approach as ticket-create: we test the pre-Supabase gates only
// (auth header parsing, JWT validation, payload shape). The full
// happy-path admin reply with state-machine transition + email
// dispatch is covered by tests/functions/support-ticket-reply.test.ts
// against stubbed Supabase + Resend.
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const ENDPOINT = "/api/support-ticket-reply";

test.describe("POST /api/support-ticket-reply — auth gate", () => {
  test("returns 401 when Authorization header is missing", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "Reply." },
    });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe("not_authenticated");
  });

  test("returns 401 when Authorization header is malformed", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "Reply." },
      headers: { authorization: "Token abc" }, // not Bearer
    });
    expect(r.status()).toBe(401);
    expect((await r.json()).error).toBe("not_authenticated");
  });

  test("returns 401 when Bearer JWT is empty", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "Reply." },
      headers: { authorization: "Bearer " },
    });
    expect(r.status()).toBe(401);
  });
});

test.describe("POST /api/support-ticket-reply — payload validation", () => {
  const validJwtShape = "Bearer " + ["x", "x", "x"].join(".");

  test("returns 400 on malformed JSON", async ({ request }) => {
    // Buffer.from() bypasses Playwright's string-to-JSON serialization
    // so we send actual non-parseable bytes (see the matching test in
    // ticket-create.spec.ts for the gotcha details).
    const r = await request.post(ENDPOINT, {
      data: Buffer.from("not json"),
      headers: { "content-type": "application/json", authorization: validJwtShape },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("invalid_json");
  });

  test("returns 400 when ticket_id is not a UUID", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ticket_id: "not-a-uuid", body: "Reply." },
      headers: { authorization: validJwtShape },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("ticket_id_invalid");
  });

  test("returns 400 when body is empty", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ticket_id: "11111111-1111-4111-8111-111111111111", body: "" },
      headers: { authorization: validJwtShape },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
  });

  test("returns 400 when body exceeds 10000 characters", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: {
        ticket_id: "11111111-1111-4111-8111-111111111111",
        body: "x".repeat(10_001),
      },
      headers: { authorization: validJwtShape },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
  });
});
