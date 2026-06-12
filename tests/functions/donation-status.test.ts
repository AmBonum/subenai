import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestGet } from "../../functions/api/donation-status";

const env = {
  STRIPE_SECRET_KEY: "sk_test_stub",
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
};

const SESSION_ID = "cs_test_abc123";

function buildRequest(sessionId: string) {
  return new Request(
    `https://subenai.sk/api/donation-status?session_id=${encodeURIComponent(sessionId)}`,
  );
}

interface StubConfig {
  stripeStatus?: number;
  stripeSession?: Record<string, unknown>;
  donationsStatus?: number;
  donationsRows?: unknown[];
  sponsorsStatus?: number;
  sponsorsRows?: unknown[];
}

const PAID_SESSION = {
  id: SESSION_ID,
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  customer: "cus_123",
  payment_intent: "pi_123",
  invoice: null,
};

function stubFetch(cfg: StubConfig) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("api.stripe.com/v1/checkout/sessions/")) {
      if (cfg.stripeStatus && cfg.stripeStatus >= 400) {
        return new Response(JSON.stringify({ error: { message: "No such session" } }), {
          status: cfg.stripeStatus,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(cfg.stripeSession ?? PAID_SESSION), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/donations?")) {
      if (cfg.donationsStatus && cfg.donationsStatus >= 400) {
        return new Response(JSON.stringify({ message: "conn pool exhausted" }), {
          status: cfg.donationsStatus,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(cfg.donationsRows ?? []), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/sponsors?")) {
      if (cfg.sponsorsStatus && cfg.sponsorsStatus >= 400) {
        return new Response(JSON.stringify({ message: "rls denied" }), {
          status: cfg.sponsorsStatus,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(cfg.sponsorsRows ?? []), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });
}

const DONATION_ROW = {
  amount_eur: 25,
  currency: "eur",
  kind: "oneoff",
  created_at: "2026-06-01T00:00:00Z",
  invoice_pdf_url: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/donation-status — negative paths", () => {
  it("400 invalid_session_id when the id lacks the cs_ prefix", async () => {
    const r = await onRequestGet({ request: buildRequest("evil_123"), env });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_session_id");
  });

  it("400 invalid_session_id when the id exceeds 200 chars", async () => {
    const r = await onRequestGet({ request: buildRequest("cs_" + "x".repeat(200)), env });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_session_id");
  });

  it("404 not_found when Stripe rejects the session lookup", async () => {
    stubFetch({ stripeStatus: 404 });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(404);
    expect((await r.json()).status).toBe("not_found");
  });

  it("unpaid session reports status=unpaid without touching Supabase", async () => {
    const fetchSpy = stubFetch({
      stripeSession: { ...PAID_SESSION, status: "open", payment_status: "unpaid" },
    });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("unpaid");
    const supabaseCalls = fetchSpy.mock.calls.filter((c) =>
      String(typeof c[0] === "string" ? c[0] : (c[0] as Request).url).includes("/rest/v1/"),
    );
    expect(supabaseCalls).toHaveLength(0);
  });

  it("donations lookup failure degrades to status=pending (poller retries), never 500", async () => {
    stubFetch({ donationsStatus: 503 });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("pending");
    expect(body.donation).toBeUndefined();
  });

  it("sponsors lookup failure is decorative — donation still reported as ready", async () => {
    stubFetch({ donationsRows: [DONATION_ROW], sponsorsStatus: 500 });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("ready");
    expect(body.donation?.amount_eur).toBe(25);
    expect(body.sponsor_display_name).toBeNull();
  });

  it("paid session with no donation row yet reports pending (webhook lag window)", async () => {
    stubFetch({ donationsRows: [] });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(200);
    expect((await r.json()).status).toBe("pending");
  });

  it("happy path: ready with donation payload and sponsor name", async () => {
    stubFetch({
      donationsRows: [DONATION_ROW],
      sponsorsRows: [{ display_name: "Anna" }],
    });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("ready");
    expect(body.sponsor_display_name).toBe("Anna");
    expect(body.has_customer).toBe(true);
  });

  it("subscription invoice: resolves the donation via invoice.payments (Stripe >=17 shape)", async () => {
    // Regression guard: the old code read invoice.payment_intent (removed in
    // Stripe >=17), so subscription donors stayed stuck on "pending". The
    // donations row is keyed by the payment_intent embedded in the invoice's
    // payments ApiList — if the function reads the right path, status=ready.
    const SUB_PI = "pi_sub_777";
    stubFetch({
      stripeSession: {
        ...PAID_SESSION,
        mode: "subscription",
        payment_intent: null,
        invoice: {
          id: "in_1",
          payments: { data: [{ payment: { payment_intent: SUB_PI } }] },
        },
      },
      donationsRows: [{ ...DONATION_ROW, kind: "subscription_invoice" }],
    });
    const r = await onRequestGet({ request: buildRequest(SESSION_ID), env });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("ready");
    expect(body.is_subscription).toBe(true);
    expect(body.donation?.kind).toBe("subscription_invoice");
  });
});
