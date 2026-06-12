// Stress coverage for input-size limits — the defensive boundary that
// stops a single oversized request from consuming unbounded server work or
// landing a multi-MB row in the DB. Each endpoint must reject the giant
// field BEFORE doing any expensive work (turnstile siteverify, Supabase
// RPC, Stripe call). The validation order is the contract under test.

import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost as ticketCreate } from "../../functions/api/support-ticket-create";
import { onRequestPost as portalMagicLink } from "../../functions/api/portal-magic-link";
import { onRequestGet as checkPassword } from "../../functions/api/tests/check-password";
import { __test__ as security__test__ } from "../../functions/_lib/security";

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

const ticketEnv = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  TURNSTILE_SECRET_KEY: "ts",
  RESEND_API_KEY: "re",
  EMAIL_FROM: "x@y.test",
  EMAIL_REPLY_TO: "x@y.test",
};

function ticketRequest(over: Record<string, unknown>) {
  return new Request("https://subenai.sk/api/support-ticket-create", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.5" },
    body: JSON.stringify({
      subject: "Valid subject",
      body: "A body that is comfortably over the twenty-char minimum.",
      email: "user@example.test",
      name: "Test User",
      category: "question",
      turnstile_token: "tok",
      ...over,
    }),
  });
}

describe("support-ticket-create — oversized fields reject before any side effect", () => {
  it("rejects a 5001-char body with body_invalid (cap is 5000)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await ticketCreate({
      request: ticketRequest({ body: "x".repeat(5001) }),
      env: ticketEnv,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
    // Turnstile siteverify / Supabase must NOT have been called.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts a body exactly at the 5000-char boundary (reaches turnstile, no length error)", async () => {
    // Turnstile rejects (we don't stub a pass) → we should see turnstile_failed,
    // NOT body_invalid — proving the boundary value passed the length gate.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const r = await ticketCreate({
      request: ticketRequest({ body: "x".repeat(5000) }),
      env: ticketEnv,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("turnstile_failed");
  });

  it("rejects a 201-char subject with subject_invalid (cap is 200)", async () => {
    const r = await ticketCreate({
      request: ticketRequest({ subject: "s".repeat(201) }),
      env: ticketEnv,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("subject_invalid");
  });

  it("rejects a 101-char name with name_invalid (cap is 100)", async () => {
    const r = await ticketCreate({
      request: ticketRequest({ name: "n".repeat(101) }),
      env: ticketEnv,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("name_invalid");
  });

  it("rejects a multi-megabyte body without crashing (graceful 400)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const huge = "z".repeat(2_000_000);
    const r = await ticketCreate({ request: ticketRequest({ body: huge }), env: ticketEnv });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("body_invalid");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("honeypot field set → silent 200 discard, no work done even with a huge body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await ticketCreate({
      request: ticketRequest({ _h_addr: "bot", body: "z".repeat(100_000) }),
      env: ticketEnv,
    });
    expect(r.status).toBe(200);
    expect((await r.json()).ticket_id).toBe("honeypot-discarded");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("portal-magic-link — oversized / malformed body", () => {
  const env = {
    STRIPE_SECRET_KEY: "sk",
    RESEND_API_KEY: "re",
    EMAIL_FROM: "x@y.test",
    EMAIL_REPLY_TO: "x@y.test",
    TURNSTILE_SECRET_KEY: "ts",
  };

  it("400 invalid_json on a 1MB non-JSON blob (parse guard, no Stripe call)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await portalMagicLink({
      request: new Request("https://subenai.sk/api/portal-magic-link", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.6" },
        body: "{" + "x".repeat(1_000_000),
      }),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_json");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("an absurdly long e-mail fails the plausibility cap (254) → generic success, no send", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const longEmail = "a".repeat(300) + "@example.test";
    const r = await portalMagicLink({
      request: new Request("https://subenai.sk/api/portal-magic-link", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
        body: JSON.stringify({ email: longEmail, turnstile_token: "tok" }),
      }),
      env,
    });
    expect(r.status).toBe(200);
    // Only Turnstile may have been hit; no Resend send for an invalid address.
    const resendCalls = fetchSpy.mock.calls.filter((c) =>
      String(typeof c[0] === "string" ? c[0] : (c[0] as Request).url).includes("resend.com"),
    );
    expect(resendCalls).toHaveLength(0);
  });
});

describe("check-password — share_id length boundary as a cheap DoS guard", () => {
  const env = {
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    JWT_SECRET: "secret",
  };

  it("rejects a 10k-char share_id with invalid_shape before any DB read", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await checkPassword({
      request: new Request(
        `https://subenai.sk/api/tests/check-password?share_id=${"a".repeat(10_000)}`,
      ),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_shape");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
