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
