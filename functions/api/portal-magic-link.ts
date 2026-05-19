import Stripe from "stripe";

import { sendEmail, isPlausibleEmail } from "../_lib/email";
import { magicLinkPortalEmail } from "../_lib/email-templates";
import {
  consumeDailyQuota,
  emailCooldown,
  ipRateLimit,
  parsePositiveInt,
  readClientIp,
  verifyTurnstile,
} from "../_lib/security";
import { STRIPE_API_VERSION } from "./stripe-webhook";

interface Env {
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  TURNSTILE_SECRET_KEY: string;
  PORTAL_LINK_DAILY_CAP?: string;
  PORTAL_LINK_COOLDOWN_SECONDS?: string;
  PORTAL_LINK_PER_IP_PER_HOUR?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const SUCCESS_RESPONSE = {
  ok: true,
  message: "Ak existuje podpora pre tento e-mail, poslali sme naň odkaz na Stripe Customer Portal.",
};

const DAILY_QUOTA_SCOPE = "portal_magic_link";

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  let payload: { email?: string; turnstile_token?: string };
  try {
    payload = (await request.json()) as { email?: string; turnstile_token?: string };
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const ip = readClientIp(request);
  const ipLimit = parsePositiveInt(env.PORTAL_LINK_PER_IP_PER_HOUR, 10);
  if (!ipRateLimit.consume(`portal:${ip}`, ipLimit, 3600)) {
    return jsonResponse(200, SUCCESS_RESPONSE);
  }

  const turnstileResult = await verifyTurnstile(
    env.TURNSTILE_SECRET_KEY,
    payload.turnstile_token ?? "",
    ip,
  );
  if (!turnstileResult.ok) {
    return jsonResponse(400, { error: "turnstile_failed", reason: turnstileResult.reason });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!isPlausibleEmail(email)) {
    return jsonResponse(200, SUCCESS_RESPONSE);
  }

  const cooldownSeconds = parsePositiveInt(env.PORTAL_LINK_COOLDOWN_SECONDS, 900);
  if (!emailCooldown.consume(`portal:${email}`, cooldownSeconds)) {
    return jsonResponse(200, SUCCESS_RESPONSE);
  }

  const dailyCap = parsePositiveInt(env.PORTAL_LINK_DAILY_CAP, 200);
  if (!consumeDailyQuota(DAILY_QUOTA_SCOPE, dailyCap)) {
    console.warn("portal-magic-link daily cap reached", { ip });
    return jsonResponse(200, SUCCESS_RESPONSE);
  }

  if (
    !env.RESEND_API_KEY ||
    env.RESEND_API_KEY.includes("replace_me") ||
    !env.EMAIL_FROM ||
    !env.EMAIL_REPLY_TO
  ) {
    console.error("portal-magic-link missing email infra config");
    return jsonResponse(500, { error: "email_not_configured" });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });

  let customer: Stripe.Customer | null = null;
  try {
    const list = await stripe.customers.list({ email, limit: 1 });
    customer = list.data[0] ?? null;
  } catch (err) {
    console.error("portal-magic-link customer lookup", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return jsonResponse(200, SUCCESS_RESPONSE);
  }

  if (!customer) return jsonResponse(200, SUCCESS_RESPONSE);

  const origin = new URL(request.url).origin;
  let portalUrl: string;
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/about`,
      locale: "sk",
    });
    portalUrl = portalSession.url;
  } catch (err) {
    console.error("portal-magic-link portal create", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return jsonResponse(200, SUCCESS_RESPONSE);
  }

  const { subject, html, text } = magicLinkPortalEmail(portalUrl);
  const result = await sendEmail(
    {
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
      EMAIL_REPLY_TO: env.EMAIL_REPLY_TO,
    },
    { to: email, subject, html, text },
  );

  if (!result.ok) {
    console.error("portal-magic-link send failed", { error: result.error });
  }

  return jsonResponse(200, SUCCESS_RESPONSE);
}
