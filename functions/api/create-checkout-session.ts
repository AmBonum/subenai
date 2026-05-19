import Stripe from "stripe";

import { MAX_AML_AMOUNT_EUR, STRIPE_API_VERSION } from "./stripe-webhook";

interface Env {
  STRIPE_SECRET_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const ALLOWED_MONTHLY_TIERS_EUR = new Set([5, 10, 25]);
const FOOTER_TIER_ONEOFF_EUR = 50;
const FOOTER_TIER_MONTHLY_EUR = 25;
const MIN_ONEOFF_EUR = 5;
const DISPLAY_MESSAGE_MAX = 80;

export interface CheckoutCreateInput {
  mode: "oneoff" | "monthly";
  amount_eur: number;
  email: string;
  name: string;
  tax_id?: string;
  show_in_list?: boolean;
  display_name?: string;
  display_link?: string;
  display_message?: string;
  show_in_footer?: boolean;
  consent_immediate_start: boolean;
  consent_data_processing: boolean;
}

export type ValidationResult =
  | { ok: true; clean: ValidatedInput }
  | { ok: false; error: string; field?: keyof CheckoutCreateInput };

export interface ValidatedInput {
  mode: "oneoff" | "monthly";
  amountEur: number;
  amountCents: number;
  email: string;
  name: string;
  taxId: string | null;
  qualifiesForFooter: boolean;
  metadata: Record<string, string>;
}

export function validateInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "invalid_payload" };
  }
  const input = raw as Partial<CheckoutCreateInput>;

  if (input.mode !== "oneoff" && input.mode !== "monthly") {
    return { ok: false, error: "invalid_mode", field: "mode" };
  }

  const amount = Number(input.amount_eur);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount", field: "amount_eur" };
  }

  if (input.mode === "oneoff") {
    if (amount < MIN_ONEOFF_EUR || amount > MAX_AML_AMOUNT_EUR) {
      return { ok: false, error: "amount_out_of_range", field: "amount_eur" };
    }
  } else if (!ALLOWED_MONTHLY_TIERS_EUR.has(amount)) {
    return { ok: false, error: "invalid_monthly_tier", field: "amount_eur" };
  }

  const email = (input.email ?? "").trim();
  if (!isEmail(email)) return { ok: false, error: "invalid_email", field: "email" };

  const name = (input.name ?? "").trim();
  if (name.length < 1 || name.length > 200) {
    return { ok: false, error: "invalid_name", field: "name" };
  }

  const taxId = (input.tax_id ?? "").trim() || null;
  if (taxId && taxId.length > 64) {
    return { ok: false, error: "invalid_tax_id", field: "tax_id" };
  }

  if (input.consent_immediate_start !== true) {
    return {
      ok: false,
      error: "missing_consent_immediate_start",
      field: "consent_immediate_start",
    };
  }
  if (input.consent_data_processing !== true) {
    return {
      ok: false,
      error: "missing_consent_data_processing",
      field: "consent_data_processing",
    };
  }

  const metadata: Record<string, string> = {};

  if (input.show_in_list === true) {
    const displayName = (input.display_name ?? "").trim();
    if (displayName.length < 1 || displayName.length > 100) {
      return { ok: false, error: "invalid_display_name", field: "display_name" };
    }
    metadata.display_name = displayName;

    const displayLink = (input.display_link ?? "").trim();
    if (displayLink) {
      if (!displayLink.startsWith("https://") || displayLink.length > 200) {
        return { ok: false, error: "invalid_display_link", field: "display_link" };
      }
      metadata.display_link = displayLink;
    } else {
      metadata.display_link = "";
    }

    const displayMessage = (input.display_message ?? "").trim();
    if (displayMessage.length > DISPLAY_MESSAGE_MAX) {
      return { ok: false, error: "display_message_too_long", field: "display_message" };
    }
    metadata.display_message = displayMessage;
  } else {
    metadata.display_name = "";
    metadata.display_link = "";
    metadata.display_message = "";
  }

  const footerThreshold =
    input.mode === "oneoff" ? FOOTER_TIER_ONEOFF_EUR : FOOTER_TIER_MONTHLY_EUR;
  const qualifiesForFooter = amount >= footerThreshold;
  const wantsFooter = input.show_in_footer === true && input.show_in_list === true;
  metadata.show_in_footer = (wantsFooter && qualifiesForFooter).toString();

  return {
    ok: true,
    clean: {
      mode: input.mode,
      amountEur: amount,
      amountCents: Math.round(amount * 100),
      email,
      name,
      taxId,
      qualifiesForFooter,
      metadata,
    },
  };
}

export async function buildCheckoutSession(
  stripe: Stripe,
  origin: string,
  input: ValidatedInput,
): Promise<Stripe.Checkout.Session> {
  const customer = await findOrCreateCustomer(stripe, input);

  const productName =
    input.mode === "oneoff"
      ? "Podpora rozvoja subenai — jednorazovo"
      : `Podpora rozvoja subenai — ${input.amountEur} €/mes`;

  // Stripe's index re-export collapses Checkout.SessionCreateParams to a type
  // alias, so the nested LineItem namespace path is gone — index into the
  // line_items field instead, which keeps full schema fidelity.
  type LineItem = NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]>[number];
  const lineItems: LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: input.amountCents,
        product_data: { name: productName },
        ...(input.mode === "monthly" ? { recurring: { interval: "month" } } : {}),
      },
    },
  ];

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: input.mode === "monthly" ? "subscription" : "payment",
    customer: customer.id,
    line_items: lineItems,
    locale: "sk",
    success_url: `${origin}/thank-you/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/support?cancelled=1`,
    metadata: input.metadata,
    consent_collection: { terms_of_service: "none" },
    custom_text: {
      submit: {
        message:
          "Stlačením potvrdzujete súhlas so začatím poskytovania okamžite a stratu práva na odstúpenie (§ 7 ods. 6 zákona č. 102/2014 Z. z.).",
      },
    },
  };

  if (input.mode === "monthly") {
    params.subscription_data = { metadata: input.metadata };
  } else {
    params.payment_intent_data = { metadata: input.metadata };
  }

  return stripe.checkout.sessions.create(params);
}

async function findOrCreateCustomer(
  stripe: Stripe,
  input: ValidatedInput,
): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email: input.email, limit: 1 });
  if (existing.data[0]) {
    const updated = await stripe.customers.update(existing.data[0].id, {
      name: input.name,
    });
    return updated;
  }
  return stripe.customers.create({
    email: input.email,
    name: input.name,
  });
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const validation = validateInput(raw);
  if (!validation.ok) {
    return jsonResponse(400, { error: validation.error, field: validation.field });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const origin = new URL(request.url).origin;
    const session = await buildCheckoutSession(stripe, origin, validation.clean);
    if (!session.url) {
      return jsonResponse(500, { error: "session_url_missing" });
    }
    return jsonResponse(200, { url: session.url, id: session.id });
  } catch (err) {
    const stripeErr = err as Record<string, unknown>;
    console.error("create-checkout-session", {
      message: err instanceof Error ? err.message : "unknown",
      code: stripeErr?.code,
      type: stripeErr?.type,
      statusCode: stripeErr?.statusCode,
    });
    return jsonResponse(500, { error: "stripe_error" });
  }
}
