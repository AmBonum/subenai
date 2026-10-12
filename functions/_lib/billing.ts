import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { EVIDENCE_PASS_SCORE, getPlan, type Plan } from "../../src/lib/billing/plans";
import type { EvidenceReport, EvidenceRespondent } from "../../src/lib/billing/evidence-types";

export const ORG_PLAN_KIND = "org_plan";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ORIGIN_HOSTS = new Set(["subenai.sk", "www.subenai.sk", "localhost", "127.0.0.1"]);

export function isFirstPartyRequest(request: Request): boolean {
  const candidate = request.headers.get("origin") ?? request.headers.get("referer");
  if (!candidate) return false;
  try {
    const host = new URL(candidate).hostname;
    return ALLOWED_ORIGIN_HOSTS.has(host) || host.endsWith(".subenai.pages.dev");
  } catch {
    return false;
  }
}

export function readBearer(request: Request): string | null {
  const m = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/);
  return m ? m[1] : null;
}

export function json(status: number, body: Record<string, unknown>, retryAfter?: number): Response {
  const headers: HeadersInit = { "content-type": "application/json", "cache-control": "no-store" };
  if (retryAfter !== undefined) headers["retry-after"] = String(retryAfter);
  return new Response(JSON.stringify(body), { status, headers });
}

export type CheckoutValidation =
  | { ok: true; plan: Plan }
  | {
      ok: false;
      error:
        | "invalid_payload"
        | "invalid_plan"
        | "missing_consent_terms"
        | "missing_consent_immediate";
    };

export function validateOrgCheckout(raw: unknown): CheckoutValidation {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_payload" };
  const input = raw as Record<string, unknown>;
  const plan = typeof input.plan === "string" ? getPlan(input.plan) : undefined;
  if (!plan) return { ok: false, error: "invalid_plan" };
  if (input.consent_terms !== true) return { ok: false, error: "missing_consent_terms" };
  if (input.consent_immediate !== true) return { ok: false, error: "missing_consent_immediate" };
  return { ok: true, plan };
}

type LineItem = NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]>[number];

export function buildOrgCheckoutParams(input: {
  plan: Plan;
  userId: string;
  email: string;
  customerId: string | null;
  origin: string;
  consentAt: string;
}): Stripe.Checkout.SessionCreateParams {
  const { plan, userId, email, customerId, origin, consentAt } = input;
  const metadata = {
    kind: ORG_PLAN_KIND,
    user_id: userId,
    plan: plan.id,
    respondent_cap: String(plan.respondentCap),
    consent_at: consentAt,
  };
  const lineItem: LineItem = {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: plan.priceEur * 100,
      recurring: { interval: "year" },
      product_data: {
        name: `subenai ${plan.name} — ročné predplatné`,
        description: `Doklad o preškolení a certifikáty pre ${plan.respondentCap} respondentov ročne`,
      },
    },
  };
  return {
    mode: "subscription",
    line_items: [lineItem],
    ...(customerId
      ? { customer: customerId, customer_update: { name: "auto", address: "auto" } }
      : { customer_email: email }),
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    allow_promotion_codes: true,
    locale: "sk",
    client_reference_id: userId,
    metadata,
    subscription_data: { metadata },
    success_url: `${origin}/app/billing?checkout=success`,
    cancel_url: `${origin}/cennik?checkout=cancelled`,
    custom_text: {
      submit: {
        message:
          "Platbou súhlasíte s obchodnými podmienkami (subenai.sk/obchodne-podmienky). Služba začne hneď po zaplatení; spotrebiteľ môže do 14 dní odstúpiť a uhradí pomernú časť ceny. Predplatné sa obnovuje ročne a zrušíte ho kedykoľvek ku koncu obdobia.",
      },
    },
  };
}

export interface OrgPlanMeta {
  userId: string;
  plan: Plan;
  respondentCap: number;
}

export function readOrgPlanMeta(metadata: Stripe.Metadata | null | undefined): OrgPlanMeta | null {
  if (!metadata || metadata.kind !== ORG_PLAN_KIND) return null;
  const plan = getPlan(metadata.plan ?? "");
  if (!plan || !UUID_RE.test(metadata.user_id ?? "")) return null;
  const cap = Number.parseInt(metadata.respondent_cap ?? "", 10);
  return {
    userId: metadata.user_id,
    plan,
    respondentCap: Number.isInteger(cap) && cap > 0 ? cap : plan.respondentCap,
  };
}

/** Stripe moved the billing period from the subscription onto its items (API 2025-03). */
export function readSubscriptionPeriod(
  sub: Stripe.Subscription,
): { start: number; end: number } | null {
  const legacy = sub as unknown as { current_period_start?: number; current_period_end?: number };
  const item = sub.items?.data?.[0] as
    | { current_period_start?: number; current_period_end?: number }
    | undefined;
  const start = item?.current_period_start ?? legacy.current_period_start;
  const end = item?.current_period_end ?? legacy.current_period_end;
  return typeof start === "number" && typeof end === "number" ? { start, end } : null;
}

function readId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Metadata of the subscription an invoice belongs to, across Stripe API versions. */
export function readInvoiceSubscriptionMetadata(invoice: Stripe.Invoice): Stripe.Metadata | null {
  const modern = (
    invoice as unknown as {
      parent?: { subscription_details?: { metadata?: Stripe.Metadata | null } | null } | null;
    }
  ).parent?.subscription_details?.metadata;
  const legacy = (
    invoice as unknown as {
      subscription_details?: { metadata?: Stripe.Metadata | null } | null;
    }
  ).subscription_details?.metadata;
  return modern ?? legacy ?? null;
}

export type OrgEventResult = { status: number; body: Record<string, unknown> };

/**
 * Handles every Stripe event that belongs to an organisation plan and returns
 * null for anything else, so the donation flow stays untouched. The row is
 * keyed by stripe_subscription_id (UNIQUE), so redelivery is an idempotent
 * upsert; an event older than the stored row is ignored.
 */
export async function processOrgPlanEvent(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<OrgEventResult | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!readOrgPlanMeta(session.metadata)) return null;
      return { status: 200, body: { received: true, org_plan: "checkout_acknowledged" } };
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!readOrgPlanMeta(readInvoiceSubscriptionMetadata(invoice))) return null;
      return { status: 200, body: { received: true, org_plan: "invoice_acknowledged" } };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const meta = readOrgPlanMeta(sub.metadata);
      if (!meta) return null;
      return upsertOrgSubscription(supabase, sub, meta, event.created);
    }
    default:
      return null;
  }
}

async function upsertOrgSubscription(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
  meta: OrgPlanMeta,
  eventCreated: number,
): Promise<OrgEventResult> {
  const period = readSubscriptionPeriod(sub);
  const customerId = readId(sub.customer);
  if (!period || !customerId) return { status: 400, body: { error: "incomplete_subscription" } };

  const eventAt = new Date(eventCreated * 1000).toISOString();
  const { data: existing, error: readErr } = await supabase
    .from("org_subscriptions")
    .select("updated_at")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (readErr) throw new Error(`org_subscriptions read failed: ${readErr.message}`);
  if (
    existing &&
    Date.parse((existing as { updated_at: string }).updated_at) > eventCreated * 1000
  ) {
    return { status: 200, body: { received: true, org_plan: "stale_event_ignored" } };
  }

  const { error } = await supabase.from("org_subscriptions").upsert(
    {
      user_id: meta.userId,
      plan: meta.plan.id,
      status: sub.status,
      respondent_cap: meta.respondentCap,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      current_period_start: new Date(period.start * 1000).toISOString(),
      current_period_end: new Date(period.end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: eventAt,
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw new Error(`org_subscriptions upsert failed: ${error.message}`);
  return { status: 200, body: { received: true, org_plan: sub.status, subscription: sub.id } };
}

export interface EvidenceSession {
  id: string;
  intake_data: Record<string, unknown> | null;
  score: number | null;
  finished_at: string;
}

export function buildRespondents(sessions: EvidenceSession[]): EvidenceRespondent[] {
  return sessions.map((s) => {
    const intake = s.intake_data ?? {};
    const score = s.score ?? 0;
    return {
      sessionId: s.id,
      name: typeof intake.name === "string" ? intake.name.trim() : "",
      email: typeof intake.email === "string" ? intake.email.trim() : "",
      finishedAt: s.finished_at,
      score,
      passed: score >= EVIDENCE_PASS_SCORE,
    };
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildEvidenceReport(input: {
  id: string;
  orgName: string;
  testTitle: string;
  testVersion: number;
  generatedAt: string;
  sessions: EvidenceSession[];
}): Promise<EvidenceReport> {
  const respondents = buildRespondents(input.sessions);
  const passedCount = respondents.filter((r) => r.passed).length;
  const averageScore = respondents.length
    ? Math.round(respondents.reduce((sum, r) => sum + r.score, 0) / respondents.length)
    : 0;
  const canonical = JSON.stringify({
    id: input.id,
    orgName: input.orgName,
    testTitle: input.testTitle,
    testVersion: input.testVersion,
    generatedAt: input.generatedAt,
    passScore: EVIDENCE_PASS_SCORE,
    respondents: respondents.map((r) => [r.sessionId, r.name, r.email, r.finishedAt, r.score]),
  });
  return {
    id: input.id,
    orgName: input.orgName,
    testTitle: input.testTitle,
    testVersion: input.testVersion,
    generatedAt: input.generatedAt,
    passScore: EVIDENCE_PASS_SCORE,
    respondents,
    respondentCount: respondents.length,
    passedCount,
    averageScore,
    sha256: await sha256Hex(canonical),
  };
}

export function normalizeOrgName(raw: string | null): string | null {
  const name = (raw ?? "").replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 160 ? name : null;
}
