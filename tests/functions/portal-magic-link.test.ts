import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/portal-magic-link";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = {
  STRIPE_SECRET_KEY: "sk_test_stub",
  RESEND_API_KEY: "re_test_stub",
  EMAIL_FROM: "podpora@subenai.sk",
  EMAIL_REPLY_TO: "podpora@subenai.sk",
  TURNSTILE_SECRET_KEY: "ts_secret_stub",
};

const GENERIC_MESSAGE =
  "Ak existuje podpora pre tento e-mail, poslali sme naň odkaz na Stripe Customer Portal.";

function buildRequest(body: unknown, ip = "203.0.113.50") {
  return new Request("https://subenai.sk/api/portal-magic-link", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID_BODY = { email: "donor@example.test", turnstile_token: "tok_ok" };

interface StubConfig {
  turnstileOk?: boolean;
  customersStatus?: number;
  customers?: unknown[];
  portalStatus?: number;
  resendStatus?: number;
}

function stubFetch(cfg: StubConfig = {}) {
  const sentEmails: string[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: cfg.turnstileOk ?? true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("api.stripe.com/v1/customers")) {
      if (cfg.customersStatus && cfg.customersStatus >= 400) {
        return new Response(JSON.stringify({ error: { message: "stripe down" } }), {
          status: cfg.customersStatus,
        });
      }
      return new Response(JSON.stringify({ data: cfg.customers ?? [{ id: "cus_1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("api.stripe.com/v1/billing_portal/sessions")) {
      if (cfg.portalStatus && cfg.portalStatus >= 400) {
        return new Response(JSON.stringify({ error: { message: "portal down" } }), {
          status: cfg.portalStatus,
        });
      }
      return new Response(JSON.stringify({ url: "https://billing.stripe.com/p/session_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("api.resend.com/emails")) {
      sentEmails.push(url);
      if (cfg.resendStatus && cfg.resendStatus >= 400) {
        return new Response(JSON.stringify({ message: "rate limited" }), {
          status: cfg.resendStatus,
        });
      }
      return new Response(JSON.stringify({ id: "email_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });
  return { spy, sentEmails };
}

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/portal-magic-link — negative paths", () => {
  it("400 invalid_json for a malformed body", async () => {
    const r = await onRequestPost({ request: buildRequest("{not-json"), env });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_json");
  });

  it("400 turnstile_failed when the captcha verification rejects", async () => {
    stubFetch({ turnstileOk: false });
    const r = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("turnstile_failed");
  });

  it("400 turnstile_failed (missing_token) when the token is absent", async () => {
    stubFetch();
    const r = await onRequestPost({
      request: buildRequest({ email: "donor@example.test" }),
      env,
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("turnstile_failed");
    expect(body.reason).toBe("missing_token");
  });

  it("anti-enumeration: implausible e-mail returns the generic success", async () => {
    const { sentEmails } = stubFetch();
    const r = await onRequestPost({
      request: buildRequest({ email: "not-an-email", turnstile_token: "tok_ok" }),
      env,
    });
    expect(r.status).toBe(200);
    expect((await r.json()).message).toBe(GENERIC_MESSAGE);
    expect(sentEmails).toHaveLength(0);
  });

  it("anti-enumeration: unknown customer returns the generic success, no e-mail sent", async () => {
    const { sentEmails } = stubFetch({ customers: [] });
    const r = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(r.status).toBe(200);
    expect((await r.json()).message).toBe(GENERIC_MESSAGE);
    expect(sentEmails).toHaveLength(0);
  });

  it("e-mail cooldown: the second request within the window short-circuits to generic success", async () => {
    const { sentEmails } = stubFetch();
    const first = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(first.status).toBe(200);
    expect(sentEmails).toHaveLength(1);
    const second = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(second.status).toBe(200);
    expect((await second.json()).message).toBe(GENERIC_MESSAGE);
    expect(sentEmails).toHaveLength(1);
  });

  it("500 email_not_configured when the Resend key is a placeholder", async () => {
    stubFetch();
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY),
      env: { ...env, RESEND_API_KEY: "replace_me_resend" },
    });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("email_not_configured");
  });

  it("Stripe customer lookup failure degrades to generic success (never leaks the outage)", async () => {
    const { sentEmails } = stubFetch({ customersStatus: 500 });
    const r = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(r.status).toBe(200);
    expect((await r.json()).message).toBe(GENERIC_MESSAGE);
    expect(sentEmails).toHaveLength(0);
  });

  it("portal session creation failure degrades to generic success", async () => {
    const { sentEmails } = stubFetch({ portalStatus: 500 });
    const r = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(r.status).toBe(200);
    expect((await r.json()).message).toBe(GENERIC_MESSAGE);
    expect(sentEmails).toHaveLength(0);
  });

  it("Resend send failure still returns generic success but logs the error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ resendStatus: 500 });
    const r = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(r.status).toBe(200);
    expect((await r.json()).message).toBe(GENERIC_MESSAGE);
    expect(
      consoleSpy.mock.calls.some((c) => String(c[0]).includes("portal-magic-link send failed")),
    ).toBe(true);
  });

  it("IP rate limit short-circuits to generic success without hitting Turnstile", async () => {
    const { spy } = stubFetch();
    const ip = "198.51.100.77";
    for (let i = 0; i < 10; i++) {
      await onRequestPost({
        request: buildRequest({ email: `d${i}@example.test`, turnstile_token: "tok_ok" }, ip),
        env,
      });
    }
    spy.mockClear();
    const r = await onRequestPost({ request: buildRequest(VALID_BODY, ip), env });
    expect(r.status).toBe(200);
    expect((await r.json()).message).toBe(GENERIC_MESSAGE);
    expect(spy).not.toHaveBeenCalled();
  });
});
