import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

import {
  onRequestPost,
  processEvent,
  livemodeAllowed,
  MAX_AML_AMOUNT_EUR,
  STRIPE_API_VERSION,
  type Env,
} from "../../functions/api/stripe-webhook";

const TEST_WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests_only";

const env: Env = {
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

type MockBuilder = {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

interface MockState {
  sponsorByCustomer: Map<string, string>;
  donationsByPaymentIntent: Map<string, { id: string; sponsor_id: string }>;
  insertedDonations: unknown[];
  insertedSubscriptions: unknown[];
  updatedSubscriptions: { id: string; patch: Record<string, unknown> }[];
  updatedSponsors: { id: string; patch: Record<string, unknown> }[];
}

let state: MockState;
let supabaseFromCalls: string[];

function makeMockSupabase() {
  state = {
    sponsorByCustomer: new Map(),
    donationsByPaymentIntent: new Map(),
    insertedDonations: [],
    insertedSubscriptions: [],
    updatedSubscriptions: [],
    updatedSponsors: [],
  };
  supabaseFromCalls = [];

  function buildBuilder(table: string): MockBuilder {
    let pendingFilter: { column: string; value: string } | null = null;
    let pendingInsert: Record<string, unknown> | null = null;
    let pendingUpdate: Record<string, unknown> | null = null;

    const builder: MockBuilder = {
      insert: vi.fn((payload: Record<string, unknown>) => {
        pendingInsert = payload;
        return builder;
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        pendingUpdate = payload;
        return builder;
      }),
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: string) => {
        pendingFilter = { column, value };
        if (table === "subscriptions" && pendingUpdate) {
          state.updatedSubscriptions.push({ id: value, patch: pendingUpdate });
          return Promise.resolve({ data: null, error: null });
        }
        if (table === "sponsors" && pendingUpdate) {
          state.updatedSponsors.push({ id: value, patch: pendingUpdate });
          return Promise.resolve({ data: null, error: null });
        }
        if (table === "donations" && column === "refund_of_donation_id") {
          const rows = state.insertedDonations.filter(
            (d) => (d as { refund_of_donation_id?: string }).refund_of_donation_id === value,
          );
          return Promise.resolve({ data: rows, error: null });
        }
        return builder;
      }),
      single: vi.fn(async () => {
        if (table === "sponsors" && pendingInsert) {
          const customerId = pendingInsert.stripe_customer_id as string;
          if (state.sponsorByCustomer.has(customerId)) {
            return {
              data: null,
              error: { code: "23505", message: "duplicate key" },
            };
          }
          const id = `sponsor-${state.sponsorByCustomer.size + 1}`;
          state.sponsorByCustomer.set(customerId, id);
          return { data: { id }, error: null };
        }
        if (table === "sponsors" && pendingFilter) {
          const id = state.sponsorByCustomer.get(pendingFilter.value);
          return id ? { data: { id }, error: null } : { data: null, error: null };
        }
        if (table === "donations" && pendingInsert) {
          const pi = pendingInsert.stripe_payment_intent_id as string | null;
          const refundId = pendingInsert.stripe_refund_id as string | undefined;
          const refundIdTaken =
            refundId !== undefined &&
            state.insertedDonations.some(
              (d) => (d as { stripe_refund_id?: string }).stripe_refund_id === refundId,
            );
          if ((pi && state.donationsByPaymentIntent.has(pi)) || refundIdTaken) {
            return {
              data: null,
              error: { code: "23505", message: "duplicate key" },
            };
          }
          const id = `donation-${state.insertedDonations.length + 1}`;
          state.insertedDonations.push({ id, ...pendingInsert });
          if (pi) {
            state.donationsByPaymentIntent.set(pi, {
              id,
              sponsor_id: pendingInsert.sponsor_id as string,
            });
          }
          return { data: { id }, error: null };
        }
        return { data: null, error: null };
      }),
      maybeSingle: vi.fn(async () => {
        if (table === "sponsors" && pendingFilter) {
          const id = state.sponsorByCustomer.get(pendingFilter.value);
          return { data: id ? { id } : null, error: null };
        }
        if (table === "donations" && pendingFilter) {
          const row = state.donationsByPaymentIntent.get(pendingFilter.value);
          return { data: row ?? null, error: null };
        }
        return { data: null, error: null };
      }),
    };
    return builder;
  }

  return {
    from: vi.fn((table: string) => {
      supabaseFromCalls.push(table);
      const builder = buildBuilder(table);
      if (table === "subscriptions") {
        builder.insert = vi.fn((payload: Record<string, unknown>) => {
          state.insertedSubscriptions.push(payload);
          return Promise.resolve({ data: null, error: null });
        }) as unknown as MockBuilder["insert"];
      }
      return builder;
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => makeMockSupabase()),
}));

async function signed(eventBody: object): Promise<{ body: string; signature: string }> {
  const body = JSON.stringify(eventBody);
  const stripe = new Stripe("sk_test_dummy", { apiVersion: STRIPE_API_VERSION });
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({
    payload: body,
    secret: TEST_WEBHOOK_SECRET,
  });
  return { body, signature };
}

function makeEvent<T>(
  type: string,
  object: T,
  overrides: Partial<Stripe.Event> = {},
): Stripe.Event {
  return {
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    object: "event",
    api_version: STRIPE_API_VERSION,
    created: Math.floor(Date.now() / 1000),
    data: { object: object as unknown as Stripe.Event.Data["object"] },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    ...overrides,
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  state = {
    sponsorByCustomer: new Map(),
    donationsByPaymentIntent: new Map(),
    insertedDonations: [],
    insertedSubscriptions: [],
    updatedSubscriptions: [],
    updatedSponsors: [],
  };
});

describe("stripe-webhook signature verification", () => {
  it("returns 400 when Stripe-Signature header is missing", async () => {
    const req = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_signature" });
  });

  it("returns 400 when signature does not match the body", async () => {
    const event = makeEvent("checkout.session.completed", {});
    const { body } = await signed(event);
    const req = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      body,
    });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "signature_verification_failed" });
  });

  it("accepts a request signed with the configured secret", async () => {
    const event = makeEvent("payment_intent.created", { id: "pi_x" });
    const { body, signature } = await signed(event);
    const req = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body,
    });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, ignored: "payment_intent.created" });
  });
});

describe("processEvent — checkout.session.completed (oneoff)", () => {
  it("upserts sponsor and inserts donation", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      id: "cs_1",
      mode: "payment",
      customer: "cus_oneoff",
      payment_intent: "pi_oneoff_1",
      amount_total: 500, // 5.00 EUR
      currency: "eur",
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    expect(state.insertedDonations).toHaveLength(1);
    expect(state.insertedDonations[0]).toMatchObject({
      stripe_payment_intent_id: "pi_oneoff_1",
      amount_eur: 5,
      kind: "oneoff",
      currency: "EUR",
    });
  });

  it("rejects amounts above the AML hard limit", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      mode: "payment",
      customer: "cus_x",
      payment_intent: "pi_big",
      amount_total: (MAX_AML_AMOUNT_EUR + 1) * 100,
      currency: "eur",
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: "aml_limit_exceeded" });
    expect(state.insertedDonations).toHaveLength(0);
  });

  it("ignores subscription-mode checkout sessions (handled by invoice.paid)", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      mode: "subscription",
      customer: "cus_x",
      payment_intent: null,
      amount_total: 0,
      currency: "eur",
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    expect(state.insertedDonations).toHaveLength(0);
  });

  it("returns idempotent success on duplicate payment_intent_id", async () => {
    const supabase = makeMockSupabase();
    const sharedPI = "pi_dup";
    const event = makeEvent("checkout.session.completed", {
      mode: "payment",
      customer: "cus_dup",
      payment_intent: sharedPI,
      amount_total: 1000,
      currency: "eur",
    });
    const first = await processEvent(event, supabase as never);
    const second = await processEvent(event, supabase as never);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.insertedDonations).toHaveLength(1);
  });
});

describe("processEvent — invoice.paid (subscription)", () => {
  it("inserts a subscription_invoice donation", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("invoice.paid", {
      id: "in_1",
      customer: "cus_sub",
      // Stripe ≥17 moved payment_intent into invoice.payments[].payment.payment_intent.
      payments: { data: [{ payment: { type: "payment_intent", payment_intent: "pi_sub_1" } }] },
      amount_paid: 1000,
      currency: "eur",
      invoice_pdf: "https://stripe.example/invoice.pdf",
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    expect(state.insertedDonations[0]).toMatchObject({
      kind: "subscription_invoice",
      amount_eur: 10,
      invoice_pdf_url: "https://stripe.example/invoice.pdf",
    });
  });
});

describe("processEvent — subscription lifecycle", () => {
  it("created → inserts subscriptions row", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("customer.subscription.created", {
      id: "sub_1",
      customer: "cus_sub",
      status: "active",
      start_date: 1714000000,
      items: { data: [{ price: { unit_amount: 500 } }] },
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    expect(state.insertedSubscriptions).toHaveLength(1);
    expect(state.insertedSubscriptions[0]).toMatchObject({
      stripe_subscription_id: "sub_1",
      status: "active",
      monthly_eur: 5,
    });
  });

  it("deleted → marks cancelled_at on the subscription", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("customer.subscription.deleted", {
      id: "sub_to_cancel",
      customer: "cus_sub",
      status: "canceled",
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    const update = state.updatedSubscriptions.find((u) => u.id === "sub_to_cancel");
    expect(update?.patch).toMatchObject({ status: "canceled" });
    expect(update?.patch.cancelled_at).toBeTypeOf("string");
  });
});

describe("processEvent — charge.refunded", () => {
  it("inserts a negative-amount refund row linked to the original donation", async () => {
    const supabase = makeMockSupabase();
    const original = makeEvent("checkout.session.completed", {
      mode: "payment",
      customer: "cus_ref",
      payment_intent: "pi_ref_orig",
      amount_total: 2000,
      currency: "eur",
    });
    await processEvent(original, supabase as never);

    const refund = makeEvent("charge.refunded", {
      id: "ch_1",
      payment_intent: "pi_ref_orig",
      amount_refunded: 2000,
      currency: "eur",
    });
    const result = await processEvent(refund, supabase as never);

    expect(result.status).toBe(200);
    const refundRow = state.insertedDonations.find(
      (d) => (d as { kind?: string }).kind === "refund",
    );
    expect(refundRow).toMatchObject({
      kind: "refund",
      amount_eur: -20,
      refund_of_donation_id: "donation-1",
      stripe_payment_intent_id: null,
    });
  });

  async function seedOriginal(supabase: ReturnType<typeof makeMockSupabase>) {
    await processEvent(
      makeEvent("checkout.session.completed", {
        mode: "payment",
        customer: "cus_partial",
        payment_intent: "pi_partial",
        amount_total: 5000,
        currency: "eur",
      }),
      supabase as never,
    );
  }

  function refundRows() {
    return state.insertedDonations.filter((d) => (d as { kind?: string }).kind === "refund");
  }

  it("ignores a redelivered charge.refunded event", async () => {
    const supabase = makeMockSupabase();
    await seedOriginal(supabase);
    const event = makeEvent("charge.refunded", {
      id: "ch_dup",
      payment_intent: "pi_partial",
      amount_refunded: 1000,
      currency: "eur",
      refunds: { data: [{ id: "re_1", amount: 1000 }] },
    });

    await processEvent(event, supabase as never);
    const second = await processEvent(event, supabase as never);

    expect(second.status).toBe(200);
    expect(refundRows()).toHaveLength(1);
    expect(refundRows()[0]).toMatchObject({ stripe_refund_id: "re_1", amount_eur: -10 });
  });

  it("records only the delta for successive partial refunds (cumulative amount_refunded)", async () => {
    const supabase = makeMockSupabase();
    await seedOriginal(supabase);

    await processEvent(
      makeEvent("charge.refunded", {
        id: "ch_partial",
        payment_intent: "pi_partial",
        amount_refunded: 1000,
        currency: "eur",
        refunds: { data: [{ id: "re_1", amount: 1000 }] },
      }),
      supabase as never,
    );
    await processEvent(
      makeEvent("charge.refunded", {
        id: "ch_partial",
        payment_intent: "pi_partial",
        amount_refunded: 3000,
        currency: "eur",
        refunds: {
          data: [
            { id: "re_2", amount: 2000 },
            { id: "re_1", amount: 1000 },
          ],
        },
      }),
      supabase as never,
    );

    expect(refundRows().map((r) => (r as { amount_eur: number }).amount_eur)).toEqual([-10, -20]);
    expect(refundRows().map((r) => (r as { stripe_refund_id: string }).stripe_refund_id)).toEqual([
      "re_1",
      "re_2",
    ]);
  });

  it("skips a stale out-of-order delivery whose cumulative total is already recorded", async () => {
    const supabase = makeMockSupabase();
    await seedOriginal(supabase);

    await processEvent(
      makeEvent("charge.refunded", {
        id: "ch_ooo",
        payment_intent: "pi_partial",
        amount_refunded: 3000,
        currency: "eur",
      }),
      supabase as never,
    );
    const stale = await processEvent(
      makeEvent("charge.refunded", {
        id: "ch_ooo",
        payment_intent: "pi_partial",
        amount_refunded: 1000,
        currency: "eur",
      }),
      supabase as never,
    );

    expect(stale.body).toMatchObject({ already_recorded: true });
    expect(refundRows()).toHaveLength(1);
    expect(refundRows()[0]).toMatchObject({ amount_eur: -30, stripe_refund_id: "ch_ooo:3000" });
  });

  it("returns 200 when refund event has no matching original donation", async () => {
    const supabase = makeMockSupabase();
    const refund = makeEvent("charge.refunded", {
      id: "ch_orphan",
      payment_intent: "pi_unknown",
      amount_refunded: 500,
      currency: "eur",
    });
    const result = await processEvent(refund, supabase as never);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ no_original: true });
  });
});

describe("processEvent — checkout.session.completed metadata pass-through", () => {
  it("applies display_name + show_in_footer from metadata to the sponsor row (oneoff)", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      mode: "payment",
      customer: "cus_meta_oneoff",
      payment_intent: "pi_meta_1",
      amount_total: 5000,
      currency: "eur",
      metadata: {
        display_name: "Anna Testovacia",
        display_link: "https://example.test/anna",
        display_message: "Vďaka!",
        show_in_footer: "true",
      },
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    const sponsorPatch = state.updatedSponsors[0];
    expect(sponsorPatch?.patch).toEqual({
      display_name: "Anna Testovacia",
      display_link: "https://example.test/anna",
      display_message: "Vďaka!",
      show_in_footer: true,
    });
    expect(state.insertedDonations).toHaveLength(1);
  });

  it("upserts sponsor + applies metadata for subscription mode without inserting donation", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      mode: "subscription",
      customer: "cus_meta_sub",
      payment_intent: null,
      amount_total: 0,
      currency: "eur",
      metadata: { display_name: "Bob", show_in_footer: "false" },
    });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ mode: "subscription" });
    expect(state.updatedSponsors[0]?.patch).toMatchObject({
      display_name: "Bob",
      show_in_footer: false,
    });
    expect(state.insertedDonations).toHaveLength(0);
  });

  it("clears empty-string display fields to NULL on the sponsor row", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      mode: "payment",
      customer: "cus_meta_clear",
      payment_intent: "pi_meta_clear",
      amount_total: 1000,
      currency: "eur",
      metadata: { display_name: "", display_link: "", display_message: "" },
    });
    await processEvent(event, supabase as never);
    expect(state.updatedSponsors[0]?.patch).toEqual({
      display_name: null,
      display_link: null,
      display_message: null,
    });
  });

  it("does not call sponsor UPDATE when no relevant metadata keys are present", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("checkout.session.completed", {
      mode: "payment",
      customer: "cus_no_meta",
      payment_intent: "pi_no_meta",
      amount_total: 1000,
      currency: "eur",
      metadata: { unrelated: "noise" },
    });
    await processEvent(event, supabase as never);
    expect(state.updatedSponsors).toHaveLength(0);
  });
});

describe("livemodeAllowed guard", () => {
  it('expected="true" accepts live-mode events and rejects test-mode', () => {
    expect(livemodeAllowed("true", true)).toBe(true);
    expect(livemodeAllowed("true", false)).toBe(false);
  });

  it('expected="false" accepts test-mode events and rejects live-mode', () => {
    expect(livemodeAllowed("false", false)).toBe(true);
    expect(livemodeAllowed("false", true)).toBe(false);
  });

  it("unset env permits both modes (backwards compatible)", () => {
    expect(livemodeAllowed(undefined, true)).toBe(true);
    expect(livemodeAllowed(undefined, false)).toBe(true);
    expect(livemodeAllowed("", true)).toBe(true);
    expect(livemodeAllowed("yes", false)).toBe(true);
  });
});

describe("stripe-webhook livemode enforcement (end-to-end via onRequestPost)", () => {
  it('returns 400 livemode_mismatch when EXPECTED_LIVEMODE="true" and event is test-mode', async () => {
    const event = makeEvent(
      "checkout.session.completed",
      { mode: "payment", customer: "cus_x", payment_intent: "pi_x", amount_total: 500 },
      { livemode: false },
    );
    const { body, signature } = await signed(event);
    const req = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body,
    });
    const res = await onRequestPost({
      request: req,
      env: { ...env, EXPECTED_LIVEMODE: "true" },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "livemode_mismatch" });
  });

  it('accepts a test-mode event when EXPECTED_LIVEMODE="false"', async () => {
    const event = makeEvent("payment_intent.created", { id: "pi_y" }, { livemode: false });
    const { body, signature } = await signed(event);
    const req = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body,
    });
    const res = await onRequestPost({
      request: req,
      env: { ...env, EXPECTED_LIVEMODE: "false" },
    });
    expect(res.status).toBe(200);
  });
});

describe("processEvent — unknown event types", () => {
  it("returns 200 with ignored flag for events we do not handle", async () => {
    const supabase = makeMockSupabase();
    const event = makeEvent("payment_method.attached", { id: "pm_x" });
    const result = await processEvent(event, supabase as never);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ignored: "payment_method.attached" });
  });
});
