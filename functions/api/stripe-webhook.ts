import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "../_lib/email";
import { refundAlertEmail } from "../_lib/email-templates";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // "true" → only accept live-mode events. "false" → only test-mode.
  // Anything else (incl. undefined) → no enforcement, log mismatch only.
  // Set to "true" in production CF Pages env to prevent test events from
  // mutating the prod database — see tasks/E10-webhook-runbook.md.
  EXPECTED_LIVEMODE?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  OPS_EMAIL?: string;
}

export const SIGNATURE_TOLERANCE_SECONDS = 300;
export const MAX_AML_AMOUNT_EUR = 500;
// We intentionally pin an older API version (2024-09-30.acacia) for webhook
// payload-shape stability. The Stripe SDK types `apiVersion` as the literal
// of its bundled `LatestApiVersion`, so we cast through unknown — Stripe
// accepts older versions at runtime.
type StripeApiVersion = NonNullable<ConstructorParameters<typeof Stripe>[1]>["apiVersion"];
export const STRIPE_API_VERSION = "2024-09-30.acacia" as unknown as StripeApiVersion;

interface RequestContext {
  request: Request;
  env: Env;
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonResponse(400, { error: "missing_signature" });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      SIGNATURE_TOLERANCE_SECONDS,
    );
  } catch {
    return jsonResponse(400, { error: "signature_verification_failed" });
  }

  if (!livemodeAllowed(env.EXPECTED_LIVEMODE, event.livemode)) {
    console.warn("stripe-webhook livemode_mismatch", {
      eventId: event.id,
      type: event.type,
      eventLivemode: event.livemode,
      expected: env.EXPECTED_LIVEMODE,
    });
    return jsonResponse(400, { error: "livemode_mismatch" });
  }

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await processEvent(event, supabase, env);
    logEvent(event, result.status);
    return jsonResponse(result.status, result.body);
  } catch (err) {
    console.error("stripe-webhook", {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : "unknown",
    });
    return jsonResponse(500, { error: "internal_error" });
  }
}

export type ProcessResult = { status: number; body: Record<string, unknown> };

export async function processEvent(
  event: Stripe.Event,
  supabase: SupabaseClient,
  env?: Env,
): Promise<ProcessResult> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
    case "invoice.paid":
      return handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
    case "customer.subscription.created":
      return handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription);
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
    case "charge.refunded":
      return handleChargeRefunded(supabase, event.data.object as Stripe.Charge, env);
    default:
      return { status: 200, body: { received: true, ignored: event.type } };
  }
}

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<ProcessResult> {
  const customerId = readId(session.customer);
  if (!customerId) return { status: 400, body: { error: "missing_customer" } };

  const sponsorId = await upsertSponsor(supabase, customerId);
  await applySponsorMetadata(supabase, sponsorId, session.metadata);

  if (session.mode !== "payment") {
    return { status: 200, body: { received: true, mode: session.mode, sponsor: sponsorId } };
  }

  const paymentIntentId = readId(session.payment_intent);
  const amountEur = centsToEur(session.amount_total ?? 0);

  if (!paymentIntentId) return { status: 400, body: { error: "missing_payment_intent" } };
  if (amountEur > MAX_AML_AMOUNT_EUR) {
    return { status: 400, body: { error: "aml_limit_exceeded", limit: MAX_AML_AMOUNT_EUR } };
  }

  const inserted = await insertDonation(supabase, {
    sponsorId,
    paymentIntentId,
    amountEur,
    currency: (session.currency ?? "eur").toUpperCase(),
    kind: "oneoff",
  });
  return { status: 200, body: { received: true, donation: inserted } };
}

async function applySponsorMetadata(
  supabase: SupabaseClient,
  sponsorId: string,
  metadata: Stripe.Metadata | null | undefined,
): Promise<void> {
  if (!metadata) return;
  const patch: Record<string, string | boolean | null> = {};

  if ("display_name" in metadata) patch.display_name = nullIfEmpty(metadata.display_name);
  if ("display_link" in metadata) patch.display_link = nullIfEmpty(metadata.display_link);
  if ("display_message" in metadata) patch.display_message = nullIfEmpty(metadata.display_message);
  if ("show_in_footer" in metadata) patch.show_in_footer = metadata.show_in_footer === "true";

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("sponsors").update(patch).eq("id", sponsorId);
  if (error) throw new Error(`sponsor metadata apply failed: ${error.message}`);
}

function nullIfEmpty(value: string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function handleInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<ProcessResult> {
  const customerId = readId(invoice.customer);
  // Stripe ≥17 removed `invoice.payment_intent` in favour of the
  // `invoice.payments` ApiList — read the first paid InvoicePayment's
  // payment_intent id (subscription invoices currently have exactly one).
  const paymentIntentId = readId(invoice.payments?.data?.[0]?.payment?.payment_intent);
  const amountEur = centsToEur(invoice.amount_paid ?? 0);

  if (!customerId || !paymentIntentId) {
    return { status: 400, body: { error: "missing_customer_or_payment_intent" } };
  }
  if (amountEur > MAX_AML_AMOUNT_EUR) {
    return { status: 400, body: { error: "aml_limit_exceeded", limit: MAX_AML_AMOUNT_EUR } };
  }

  const sponsorId = await upsertSponsor(supabase, customerId);
  const inserted = await insertDonation(supabase, {
    sponsorId,
    paymentIntentId,
    amountEur,
    currency: (invoice.currency ?? "eur").toUpperCase(),
    kind: "subscription_invoice",
    invoicePdfUrl: invoice.invoice_pdf ?? null,
  });
  return { status: 200, body: { received: true, donation: inserted } };
}

async function handleSubscriptionCreated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<ProcessResult> {
  const customerId = readId(subscription.customer);
  if (!customerId) return { status: 400, body: { error: "missing_customer" } };

  const sponsorId = await upsertSponsor(supabase, customerId);
  const monthlyEur = centsToEur(subscription.items.data[0]?.price.unit_amount ?? 0);

  const { error } = await supabase.from("subscriptions").insert({
    sponsor_id: sponsorId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    monthly_eur: monthlyEur,
    started_at: new Date(subscription.start_date * 1000).toISOString(),
  });

  if (error && !isUniqueViolation(error.code)) {
    throw new Error(`subscription insert failed: ${error.message}`);
  }
  return { status: 200, body: { received: true, subscription: subscription.id } };
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<ProcessResult> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: subscription.status })
    .eq("stripe_subscription_id", subscription.id);

  if (error) throw new Error(`subscription update failed: ${error.message}`);
  return { status: 200, body: { received: true, subscription: subscription.id } };
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<ProcessResult> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      cancelled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) throw new Error(`subscription cancel failed: ${error.message}`);
  return { status: 200, body: { received: true, cancelled: subscription.id } };
}

async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  env?: Env,
): Promise<ProcessResult> {
  const paymentIntentId = readId(charge.payment_intent);
  if (!paymentIntentId) return { status: 400, body: { error: "missing_payment_intent" } };

  const { data: original, error: lookupErr } = await supabase
    .from("donations")
    .select("id, sponsor_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (lookupErr) throw new Error(`refund lookup failed: ${lookupErr.message}`);
  if (!original) return { status: 200, body: { received: true, no_original: true } };

  const refundAmountEur = centsToEur(charge.amount_refunded ?? 0);
  if (refundAmountEur <= 0) return { status: 200, body: { received: true, zero_refund: true } };

  const currency = (charge.currency ?? "eur").toUpperCase();
  const { error: insertErr } = await supabase
    .from("donations")
    .insert({
      sponsor_id: original.sponsor_id,
      stripe_payment_intent_id: null,
      amount_eur: -refundAmountEur,
      currency,
      kind: "refund",
      refund_of_donation_id: original.id,
    })
    .select("id")
    .single();
  if (insertErr) throw new Error(`refund insert failed: ${insertErr.message}`);

  console.warn("stripe-webhook refund", {
    paymentIntentId,
    refundedEur: refundAmountEur,
    sponsorId: original.sponsor_id,
  });

  await notifyOpsAboutRefund(env, {
    paymentIntentId,
    refundedEur: refundAmountEur,
    sponsorId: original.sponsor_id as string,
    currency,
  });

  return { status: 200, body: { received: true, refunded_eur: refundAmountEur } };
}

async function notifyOpsAboutRefund(
  env: Env | undefined,
  input: {
    paymentIntentId: string;
    refundedEur: number;
    sponsorId: string;
    currency: string;
  },
): Promise<void> {
  if (!env?.RESEND_API_KEY || !env.OPS_EMAIL || !env.EMAIL_FROM || !env.EMAIL_REPLY_TO) return;
  if (env.RESEND_API_KEY.includes("replace_me")) return;

  const { subject, html, text } = refundAlertEmail(input);
  const result = await sendEmail(
    {
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
      EMAIL_REPLY_TO: env.EMAIL_REPLY_TO,
    },
    {
      to: env.OPS_EMAIL,
      subject,
      html,
      text,
      idempotencyKey: `refund-${input.paymentIntentId}`,
    },
  );
  if (!result.ok) {
    console.error("refund email send failed", { error: result.error, sponsor: input.sponsorId });
  }
}

async function upsertSponsor(supabase: SupabaseClient, stripeCustomerId: string): Promise<string> {
  const { data: existing, error: selectErr } = await supabase
    .from("sponsors")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (selectErr) throw new Error(`sponsor lookup failed: ${selectErr.message}`);
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insertErr } = await supabase
    .from("sponsors")
    .insert({ stripe_customer_id: stripeCustomerId })
    .select("id")
    .single();
  if (insertErr) {
    if (isUniqueViolation(insertErr.code)) {
      const { data: retry } = await supabase
        .from("sponsors")
        .select("id")
        .eq("stripe_customer_id", stripeCustomerId)
        .single();
      if (retry?.id) return retry.id as string;
    }
    throw new Error(`sponsor insert failed: ${insertErr.message}`);
  }
  return inserted.id as string;
}

interface DonationInsert {
  sponsorId: string;
  paymentIntentId: string;
  amountEur: number;
  currency: string;
  kind: "oneoff" | "subscription_invoice";
  invoicePdfUrl?: string | null;
}

async function insertDonation(
  supabase: SupabaseClient,
  d: DonationInsert,
): Promise<{ id: string | null; idempotent: boolean }> {
  const { data, error } = await supabase
    .from("donations")
    .insert({
      sponsor_id: d.sponsorId,
      stripe_payment_intent_id: d.paymentIntentId,
      amount_eur: d.amountEur,
      currency: d.currency,
      kind: d.kind,
      invoice_pdf_url: d.invoicePdfUrl ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error.code)) return { id: null, idempotent: true };
    throw new Error(`donation insert failed: ${error.message}`);
  }
  return { id: data.id as string, idempotent: false };
}

function readId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function centsToEur(cents: number): number {
  return Math.round(cents) / 100;
}

function isUniqueViolation(code: string | null | undefined): boolean {
  return code === "23505";
}

export function livemodeAllowed(expected: string | undefined, eventLivemode: boolean): boolean {
  if (expected === "true") return eventLivemode === true;
  if (expected === "false") return eventLivemode === false;
  return true;
}

function logEvent(event: Stripe.Event, status: number): void {
  console.log("stripe-webhook", {
    id: event.id,
    type: event.type,
    status,
    livemode: event.livemode,
  });
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
