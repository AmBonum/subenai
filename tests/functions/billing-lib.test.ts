import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import {
  buildEvidenceReport,
  buildOrgCheckoutParams,
  isFirstPartyRequest,
  normalizeOrgName,
  processOrgPlanEvent,
  readOrgPlanMeta,
  readSubscriptionPeriod,
  validateOrgCheckout,
} from "../../functions/_lib/billing";
import { processEvent } from "../../functions/api/stripe-webhook";
import { getPlan } from "@/lib/billing/plans";

const USER = "11111111-2222-4333-8444-555555555555";
const META = { kind: "org_plan", user_id: USER, plan: "firma", respondent_cap: "100" };

function subscription(overrides: Partial<Record<string, unknown>> = {}): Stripe.Subscription {
  return {
    id: "sub_org_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: META,
    items: { data: [{ current_period_start: 1_790_000_000, current_period_end: 1_821_536_000 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function event(type: string, object: unknown, created = 1_790_000_100): Stripe.Event {
  return { id: "evt_1", type, created, data: { object } } as unknown as Stripe.Event;
}

function fakeSupabase(existingUpdatedAt: string | null = null) {
  const upserts: Array<{ row: Record<string, unknown>; opts: unknown }> = [];
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: existingUpdatedAt ? { updated_at: existingUpdatedAt } : null,
          error: null,
        }),
      }),
    }),
    upsert: async (row: Record<string, unknown>, opts: unknown) => {
      upserts.push({ row: { table, ...row }, opts });
      return { error: null };
    },
    insert: vi.fn(),
    update: vi.fn(),
  }));
  return { client: { from } as never, upserts, from };
}

describe("validateOrgCheckout", () => {
  it("accepts a known plan with both consents", () => {
    const r = validateOrgCheckout({ plan: "start", consent_terms: true, consent_immediate: true });
    expect(r).toEqual({ ok: true, plan: getPlan("start") });
  });

  it.each([
    [null, "invalid_payload"],
    [{ plan: "gold", consent_terms: true, consent_immediate: true }, "invalid_plan"],
    [{ plan: "firma", consent_terms: "yes", consent_immediate: true }, "missing_consent_terms"],
    [{ plan: "firma", consent_terms: true }, "missing_consent_immediate"],
  ])("rejects %j with %s", (input, error) => {
    expect(validateOrgCheckout(input)).toEqual({ ok: false, error });
  });

  it("ignores a client-supplied price", () => {
    const r = validateOrgCheckout({
      plan: "firma_plus",
      price: 1,
      consent_terms: true,
      consent_immediate: true,
    });
    expect(r.ok && r.plan.priceEur).toBe(790);
  });
});

describe("buildOrgCheckoutParams", () => {
  const base = {
    plan: getPlan("firma")!,
    userId: USER,
    email: "it@firma.sk",
    origin: "https://subenai.sk",
    consentAt: "2026-10-12T10:00:00.000Z",
  };

  it("builds a yearly subscription priced on the server, with metadata on the subscription", () => {
    const p = buildOrgCheckoutParams({ ...base, customerId: null });
    expect(p.mode).toBe("subscription");
    expect(p.line_items?.[0].price_data).toMatchObject({
      currency: "eur",
      unit_amount: 39000,
      recurring: { interval: "year" },
    });
    expect(p.subscription_data?.metadata).toMatchObject({
      kind: "org_plan",
      user_id: USER,
      plan: "firma",
      respondent_cap: "100",
    });
    expect(p.customer_email).toBe("it@firma.sk");
    expect(p.tax_id_collection).toEqual({ enabled: true });
    expect(JSON.stringify(p.custom_text)).toContain("108/2024");
  });

  it("reuses an existing Stripe customer instead of creating a duplicate", () => {
    const p = buildOrgCheckoutParams({ ...base, customerId: "cus_9" });
    expect(p.customer).toBe("cus_9");
    expect(p.customer_email).toBeUndefined();
  });
});

describe("readOrgPlanMeta", () => {
  it("parses valid metadata and keeps the snapshot cap", () => {
    expect(readOrgPlanMeta({ ...META, respondent_cap: "120" })).toMatchObject({
      userId: USER,
      respondentCap: 120,
    });
  });

  it.each([
    [{ ...META, kind: "donation" }],
    [{ ...META, user_id: "not-a-uuid" }],
    [{ ...META, plan: "gold" }],
    [null],
  ])("rejects %j", (meta) => {
    expect(readOrgPlanMeta(meta as Stripe.Metadata | null)).toBeNull();
  });

  it("falls back to the catalogue cap when the snapshot is malformed", () => {
    expect(readOrgPlanMeta({ ...META, respondent_cap: "abc" })?.respondentCap).toBe(100);
  });
});

describe("readSubscriptionPeriod", () => {
  it("reads the period from the item (current API)", () => {
    expect(readSubscriptionPeriod(subscription())).toEqual({
      start: 1_790_000_000,
      end: 1_821_536_000,
    });
  });

  it("reads the period from the subscription (pinned 2024 API)", () => {
    const legacy = subscription({
      items: { data: [{}] },
      current_period_start: 1,
      current_period_end: 2,
    });
    expect(readSubscriptionPeriod(legacy)).toEqual({ start: 1, end: 2 });
  });
});

describe("processOrgPlanEvent", () => {
  it("upserts a subscription keyed by stripe_subscription_id", async () => {
    const db = fakeSupabase();
    const r = await processOrgPlanEvent(
      event("customer.subscription.created", subscription()),
      db.client,
    );
    expect(r?.status).toBe(200);
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0].opts).toEqual({ onConflict: "stripe_subscription_id" });
    expect(db.upserts[0].row).toMatchObject({
      table: "org_subscriptions",
      user_id: USER,
      plan: "firma",
      respondent_cap: 100,
      stripe_customer_id: "cus_1",
      status: "active",
    });
  });

  it("ignores an event older than the stored row", async () => {
    const db = fakeSupabase("2030-01-01T00:00:00.000Z");
    const r = await processOrgPlanEvent(
      event("customer.subscription.updated", subscription({ status: "canceled" })),
      db.client,
    );
    expect(r?.body.org_plan).toBe("stale_event_ignored");
    expect(db.upserts).toHaveLength(0);
  });

  it("returns null for donation subscriptions so the donation flow handles them", async () => {
    const db = fakeSupabase();
    const r = await processOrgPlanEvent(
      event("customer.subscription.created", subscription({ metadata: {} })),
      db.client,
    );
    expect(r).toBeNull();
  });

  it("acknowledges org-plan invoices without recording a donation", async () => {
    const invoice = { parent: { subscription_details: { metadata: META } } };
    const db = fakeSupabase();
    const r = await processEvent(event("invoice.paid", invoice), db.client);
    expect(r.body.org_plan).toBe("invoice_acknowledged");
    expect(db.from).not.toHaveBeenCalledWith("donations");
  });

  it("acknowledges org-plan checkouts without creating a sponsor", async () => {
    const db = fakeSupabase();
    const r = await processEvent(
      event("checkout.session.completed", { metadata: META, mode: "subscription" }),
      db.client,
    );
    expect(r.body.org_plan).toBe("checkout_acknowledged");
    expect(db.from).not.toHaveBeenCalledWith("sponsors");
  });
});

describe("evidence report", () => {
  const sessions = [
    {
      id: "s1",
      intake_data: { name: " Jana Nováková ", email: "jana@firma.sk" },
      score: 90,
      finished_at: "2026-10-01T08:00:00Z",
    },
    { id: "s2", intake_data: null, score: 40, finished_at: "2026-10-02T08:00:00Z" },
  ];
  const input = {
    id: "8f2c7a8e-0000-4000-8000-000000000001",
    orgName: "Firma s.r.o.",
    testTitle: "Falošná faktúra",
    testVersion: 3,
    generatedAt: "2026-10-12T10:00:00.000Z",
    sessions,
  };

  it("summarises respondents and marks passes at the threshold", async () => {
    const r = await buildEvidenceReport(input);
    expect(r.respondentCount).toBe(2);
    expect(r.passedCount).toBe(1);
    expect(r.averageScore).toBe(65);
    expect(r.respondents[0]).toMatchObject({ name: "Jana Nováková", passed: true });
    expect(r.respondents[1]).toMatchObject({ name: "", email: "", passed: false });
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash is deterministic and changes when any respondent result changes", async () => {
    const a = await buildEvidenceReport(input);
    const b = await buildEvidenceReport(input);
    const tampered = await buildEvidenceReport({
      ...input,
      sessions: [{ ...sessions[0], score: 91 }, sessions[1]],
    });
    expect(a.sha256).toBe(b.sha256);
    expect(tampered.sha256).not.toBe(a.sha256);
  });
});

describe("request guards", () => {
  it.each([
    ["https://subenai.sk/app", true],
    ["https://feature-x.subenai.pages.dev/app", true],
    ["http://localhost:8080/app", true],
    ["https://evil.example/subenai.sk", false],
    ["https://subenai.sk.evil.example", false],
  ])("origin %s → %s", (origin, ok) => {
    const req = new Request("https://subenai.sk/api/billing/checkout", { headers: { origin } });
    expect(isFirstPartyRequest(req)).toBe(ok);
  });

  it("rejects a request with no origin or referer", () => {
    expect(isFirstPartyRequest(new Request("https://subenai.sk/api/x"))).toBe(false);
  });

  it.each([
    ["  Firma   s.r.o. ", "Firma s.r.o."],
    ["X", null],
    ["", null],
    ["a".repeat(161), null],
  ])("normalizeOrgName(%j) → %j", (raw, out) => {
    expect(normalizeOrgName(raw)).toBe(out);
  });
});
