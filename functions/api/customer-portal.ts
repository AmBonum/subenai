import Stripe from "stripe";

import { STRIPE_API_VERSION } from "./stripe-webhook";

interface Env {
  STRIPE_SECRET_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function readCustomerId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export interface PortalEligibilityInput {
  status: string | null;
  mode: string;
  created: number;
}

export const PORTAL_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

// A checkout session id is a bearer credential here — anyone holding it
// can open the customer's billing portal (payment details, cancellation).
// The thank-you page only offers the portal right after a subscription
// checkout, so reject anything else: unpaid sessions, one-time payments
// (returning donors go through /api/portal-magic-link, which verifies
// e-mail ownership) and sessions older than the post-checkout window.
export function checkPortalEligibility(
  session: PortalEligibilityInput,
  nowSeconds: number,
): "session_not_eligible" | "session_expired" | null {
  if (session.status !== "complete" || session.mode !== "subscription") {
    return "session_not_eligible";
  }
  if (nowSeconds - session.created > PORTAL_SESSION_MAX_AGE_SECONDS) {
    return "session_expired";
  }
  return null;
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  let body: { session_id?: string };
  try {
    body = (await request.json()) as { session_id?: string };
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const sessionId = (body.session_id ?? "").trim();
  if (!sessionId.startsWith("cs_") || sessionId.length > 200) {
    return jsonResponse(400, { error: "invalid_session_id" });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return jsonResponse(404, { error: "session_not_found" });
  }

  const eligibilityError = checkPortalEligibility(session, Math.floor(Date.now() / 1000));
  if (eligibilityError) {
    return jsonResponse(403, { error: eligibilityError });
  }

  const customerId = readCustomerId(session.customer);
  if (!customerId) return jsonResponse(400, { error: "no_customer" });

  const origin = new URL(request.url).origin;
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/about`,
      locale: "sk",
    });
    return jsonResponse(200, { url: portalSession.url });
  } catch (err) {
    console.error("customer-portal", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return jsonResponse(500, { error: "portal_create_failed" });
  }
}
