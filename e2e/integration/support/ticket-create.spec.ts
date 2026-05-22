import { test, expect } from "@playwright/test";

// E48 — API integration tests for POST /api/support-ticket-create.
//
// These tests hit the live CF Pages Function via wrangler (port 8788).
// They DON'T mock the function; they verify the wire contract — every
// rejection path returns the documented error code so the public form
// can map it to a Slovak error message via `mapErrorCode()`.
//
// We don't assert on the happy path here (that would write to real
// Supabase from CI, which we don't want). The vitest unit tests in
// tests/functions/support-ticket-create.test.ts cover happy paths
// against stubbed Supabase. These integration tests cover the
// pre-Supabase gates (validation, honeypot, body parsing).
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const ENDPOINT = "/api/support-ticket-create";

const validPayload = {
  subject: "Integration test",
  category: "question",
  body: "Body s aspoň dvadsiatimi znakmi pre validáciu.",
  email: "integration@test.example",
  name: "Integration Tester",
  turnstile_token: "test-token",
  _h_addr: "",
};

test.describe("POST /api/support-ticket-create — input validation", () => {
  test("rejects non-JSON body with 400 invalid_json", async ({ request }) => {
    // Buffer.from() bypasses Playwright's string-to-JSON serialization —
    // `{ data: "not json" }` would emit `"not json"` (valid JSON string
    // literal) and the CF function would parse it successfully. We want
    // actual non-parseable bytes on the wire.
    const r = await request.post(ENDPOINT, {
      data: Buffer.from("not json at all"),
      headers: { "content-type": "application/json" },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("invalid_json");
  });

  test("rejects missing subject with subject_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, { data: { ...validPayload, subject: "" } });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("subject_invalid");
  });

  test("rejects empty body with body_invalid", async ({ request }) => {
    // min length is 1 (after trim) — anything that trims to empty fails.
    const r = await request.post(ENDPOINT, { data: { ...validPayload, body: "   " } });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
  });

  test("rejects unknown category with category_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, category: "made_up_value" },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("category_invalid");
  });

  test("rejects malformed e-mail with email_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, email: "not-an-email" },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("email_invalid");
  });

  test("rejects too-long subject with subject_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, subject: "a".repeat(201) },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("subject_invalid");
  });

  test("rejects body over 5000 chars with body_invalid", async ({ request }) => {
    // Production limit is 5000 (see CATEGORY_VALUES + body bounds in
    // functions/api/support-ticket-create.ts). The reply handler allows
    // up to 10000 — different limits per endpoint.
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, body: "a".repeat(5001) },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
  });
});

test.describe("POST /api/support-ticket-create — honeypot", () => {
  test("silently discards a submission with non-empty honeypot", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, _h_addr: "https://spammer.example" },
    });
    // Honeypot returns 200 with a fake ticket_id so bots don't get
    // negative signal — the real DB write doesn't happen.
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ticket_id).toBe("honeypot-discarded");
  });
});

// Wave 4 additions — boundary and whitespace edge cases.

// TC-06: Body at 5001 characters is rejected by the API with body_invalid
test.describe("POST /api/support-ticket-create — body boundary (TC-06)", () => {
  test("TC-06: body at 5001 chars is rejected with body_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, body: "a".repeat(5001) },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
  });
});

// TC-16: Subject at 201 chars is rejected with subject_invalid
test.describe("POST /api/support-ticket-create — subject boundary (TC-16)", () => {
  test("TC-16: subject at 201 chars is rejected with subject_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, subject: "a".repeat(201) },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("subject_invalid");
  });
});

// TC-17: Body with only whitespace is rejected with body_invalid
test.describe("POST /api/support-ticket-create — whitespace body (TC-17)", () => {
  test("TC-17: body with only whitespace is rejected with body_invalid", async ({ request }) => {
    const r = await request.post(ENDPOINT, {
      data: { ...validPayload, body: "   " },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
  });
});
