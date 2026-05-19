import fs from "node:fs";
import path from "node:path";
import { test, expect, type APIRequestContext } from "@playwright/test";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { STRIPE_API_VERSION } from "../../../functions/api/stripe-webhook";

/**
 * Webhook end-to-end integration spec.
 *
 * Proves the full HTTP → signature verify → handler → Supabase chain
 * works against a real wrangler dev server and a real Supabase project.
 *
 * The 6 event-type handler branches are unit-tested individually in
 * tests/functions/stripe-webhook.test.ts with a mocked Supabase client.
 * This spec exists to catch wiring drift between the unit-test mock and
 * the real wrangler runtime — signature format, request body framing,
 * env-var plumbing, RLS-bypass via service role, FK constraints.
 *
 * Pre-requisites (local-only — never run against production):
 *   1. .dev.vars filled in with TEST-mode keys + SUPABASE_* pointing at
 *      a DEV Supabase project (NOT prod)
 *   2. `npm run dev:stripe` running in another terminal
 *   3. `STRIPE_E2E_BASE_URL` env-var if your wrangler is not on :8788
 *
 * Cleanup: each test uses a unique stripe_customer_id prefixed with
 * `cus_test_e2e_<run>_` so concurrent runs don't collide, and an
 * afterEach DELETEs everything matching that prefix.
 */
const WEBHOOK_PATH = "/api/stripe-webhook";
const BASE_URL = process.env.STRIPE_E2E_BASE_URL ?? "http://localhost:8788";

// This spec is structurally local-only — see the file header. The skip
// guard moves into `beforeAll` below so loadDevVars() can't throw
// before we evaluate the condition.
const HAS_DEV_VARS = fs.existsSync(path.resolve(process.cwd(), ".dev.vars"));

interface DevVars {
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function loadDevVars(): DevVars {
  const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
  if (!fs.existsSync(devVarsPath)) {
    throw new Error(
      ".dev.vars not found — copy .dev.vars.example, fill TEST values, and run `npm run dev:stripe`.",
    );
  }
  const text = fs.readFileSync(devVarsPath, "utf8");
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map.set(m[1], m[2].trim());
  }
  const required = ["STRIPE_WEBHOOK_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  for (const key of required) {
    if (!map.get(key)) {
      throw new Error(`Missing ${key} in .dev.vars — see .dev.vars.example.`);
    }
  }
  return {
    STRIPE_WEBHOOK_SECRET: map.get("STRIPE_WEBHOOK_SECRET")!,
    SUPABASE_URL: map.get("SUPABASE_URL")!,
    SUPABASE_SERVICE_ROLE_KEY: map.get("SUPABASE_SERVICE_ROLE_KEY")!,
  };
}

let devVars: DevVars;
let supabase: SupabaseClient;
let stripeForSigning: Stripe;
const TEST_PREFIX = `cus_test_e2e_${Date.now()}_`;

test.beforeAll(() => {
  // Skip every test in this file when .dev.vars is absent (CI runs
  // never have it; local devs do once they've copied .dev.vars.example).
  // The skip MUST run before loadDevVars() — otherwise the throw aborts
  // beforeAll and Playwright reports a failure instead of a skip.
  test.skip(
    !HAS_DEV_VARS,
    "skipped: local-only — needs .dev.vars + `npm run dev:stripe` (see file header)",
  );
  devVars = loadDevVars();
  supabase = createClient(devVars.SUPABASE_URL, devVars.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  stripeForSigning = new Stripe("sk_test_e2e_signing_only", { apiVersion: STRIPE_API_VERSION });
});

test.afterEach(async () => {
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id")
    .like("stripe_customer_id", `${TEST_PREFIX}%`);
  const ids = (sponsors ?? []).map((s) => (s as { id: string }).id);
  if (ids.length > 0) {
    await supabase.from("donations").delete().in("sponsor_id", ids);
    await supabase.from("sponsors").delete().in("id", ids);
  }
});

async function signedPost(
  request: APIRequestContext,
  event: object,
): Promise<{ status: number; body: unknown }> {
  const body = JSON.stringify(event);
  const signature = await stripeForSigning.webhooks.generateTestHeaderStringAsync({
    payload: body,
    secret: devVars.STRIPE_WEBHOOK_SECRET,
  });
  const res = await request.post(`${BASE_URL}${WEBHOOK_PATH}`, {
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    data: body,
  });
  const responseBody = (await res.json().catch(() => null)) as unknown;
  return { status: res.status(), body: responseBody };
}

test.describe("stripe-webhook end-to-end against wrangler dev", () => {
  test("checkout.session.completed (oneoff) inserts sponsor + donation, applies metadata", async ({
    request,
  }) => {
    const customerId = `${TEST_PREFIX}oneoff`;
    const paymentIntentId = `pi_test_e2e_${Date.now()}`;
    const event = {
      id: `evt_test_e2e_${Date.now()}`,
      object: "event",
      api_version: STRIPE_API_VERSION,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_e2e",
          object: "checkout.session",
          mode: "payment",
          customer: customerId,
          payment_intent: paymentIntentId,
          amount_total: 500,
          currency: "eur",
          metadata: {
            display_name: "E2E Smoke Sponsor",
            display_link: "https://example.test/e2e",
            display_message: "Vďaka za bezplatný subenai",
            show_in_footer: "false",
          },
        },
      },
    };

    const { status, body } = await signedPost(request, event);
    expect(status, JSON.stringify(body)).toBe(200);

    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("id, display_name, display_link, display_message, show_in_footer")
      .eq("stripe_customer_id", customerId)
      .single();
    expect(sponsor).toMatchObject({
      display_name: "E2E Smoke Sponsor",
      display_link: "https://example.test/e2e",
      display_message: "Vďaka za bezplatný subenai",
      show_in_footer: false,
    });

    const { data: donation } = await supabase
      .from("donations")
      .select("amount_eur, kind, currency, stripe_payment_intent_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();
    expect(donation).toMatchObject({
      amount_eur: 5,
      kind: "oneoff",
      currency: "EUR",
      stripe_payment_intent_id: paymentIntentId,
    });
  });

  test("unsigned POST is rejected with 400 signature_verification_failed", async ({ request }) => {
    const res = await request.post(`${BASE_URL}${WEBHOOK_PATH}`, {
      headers: { "stripe-signature": "t=1,v1=deadbeef", "content-type": "application/json" },
      data: JSON.stringify({ id: "evt_unsigned", type: "checkout.session.completed", data: {} }),
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "signature_verification_failed" });
  });
});
