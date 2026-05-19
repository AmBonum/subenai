import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

import { STRIPE_API_VERSION } from "./stripe-webhook";

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

export type DonationStatus = "ready" | "pending" | "unpaid" | "not_found";

export interface DonationStatusBody {
  status: DonationStatus;
  is_subscription?: boolean;
  donation?: {
    amount_eur: number;
    currency: string;
    kind: "oneoff" | "subscription_invoice";
    created_at: string;
    invoice_pdf_url: string | null;
  };
  sponsor_display_name?: string | null;
  has_customer?: boolean;
}

function readId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function jsonResponse(status: number, body: DonationStatusBody | { error: string }): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";

  if (!sessionId.startsWith("cs_") || sessionId.length > 200) {
    return jsonResponse(400, { error: "invalid_session_id" });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["invoice", "subscription"],
    });
  } catch {
    return jsonResponse(404, { status: "not_found" });
  }

  const isSubscription = session.mode === "subscription";
  const customerId = readId(session.customer);

  const paid =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";
  const sessionComplete = session.status === "complete";
  if (!paid && !sessionComplete) {
    return jsonResponse(200, {
      status: "unpaid",
      is_subscription: isSubscription,
      has_customer: customerId !== null,
    });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const paymentIntentId = isSubscription
    ? readInvoicePaymentIntent(session.invoice)
    : readId(session.payment_intent);

  let donation: DonationStatusBody["donation"] | undefined;
  if (paymentIntentId) {
    const { data, error } = await supabase
      .from("donations")
      .select("amount_eur, currency, kind, created_at, invoice_pdf_url")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    if (error) {
      // Don't 500 here: the frontend polls every 3s for up to 30s, and a
      // transient Supabase blip (cold start, conn pool warmup) right after
      // Stripe redirects to /thank-you shouldn't abort the success page
      // permanently. Log loudly so persistent breakage is visible in CF
      // Pages function logs; donation stays undefined and the response is
      // "pending" so the poller retries.
      console.error("donation-status donations lookup", {
        sessionId,
        message: error.message,
      });
    } else if (data) {
      donation = {
        amount_eur: Number(data.amount_eur),
        currency: data.currency as string,
        kind: data.kind as "oneoff" | "subscription_invoice",
        created_at: data.created_at as string,
        invoice_pdf_url: (data.invoice_pdf_url as string | null) ?? null,
      };
    }
  }

  let sponsorDisplayName: string | null = null;
  if (customerId) {
    const { data, error } = await supabase
      .from("sponsors")
      .select("display_name")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (error) {
      // Sponsor display name is decorative — never block the success page
      // on a sponsors-table read failure. Without this guard the unhandled
      // error would bubble up and the CF runtime would return 500, which
      // the frontend treats as terminal "error" state (no retry).
      console.error("donation-status sponsors lookup", {
        sessionId,
        message: error.message,
      });
    } else {
      sponsorDisplayName = (data?.display_name as string | null | undefined) ?? null;
    }
  }

  if (!donation) {
    return jsonResponse(200, {
      status: "pending",
      is_subscription: isSubscription,
      sponsor_display_name: sponsorDisplayName,
      has_customer: customerId !== null,
    });
  }

  return jsonResponse(200, {
    status: "ready",
    is_subscription: isSubscription,
    donation,
    sponsor_display_name: sponsorDisplayName,
    has_customer: customerId !== null,
  });
}

function readInvoicePaymentIntent(invoice: Stripe.Invoice | string | null): string | null {
  if (!invoice || typeof invoice === "string") return null;
  return readId(invoice.payment_intent);
}
