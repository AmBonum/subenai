import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

import { authenticateUser } from "../../_lib/auth-user";
import {
  buildOrgCheckoutParams,
  isFirstPartyRequest,
  json,
  readBearer,
  validateOrgCheckout,
} from "../../_lib/billing";
import { consumeDailyQuota, ipRateLimit, readClientIp } from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";
import { STRIPE_API_VERSION } from "../stripe-webhook";
import { isActiveSubscription, type OrgSubscription } from "../../../src/lib/billing/plans";

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const PER_IP_PER_HOUR = 10;
const PER_USER_PER_DAY = 20;

export async function onRequestPost({ request, env }: RequestContext): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return json(500, { error: "not_configured" });
  }
  if (!isFirstPartyRequest(request)) return json(403, { error: "forbidden_origin" });
  if (!ipRateLimit.consume(`billing-checkout:${readClientIp(request)}`, PER_IP_PER_HOUR, 3600)) {
    return json(429, { error: "rate_limited" }, 3600);
  }

  const user = await authenticateUser(readBearer(request), env.SUPABASE_ANON_KEY);
  if (!user) return json(401, { error: "unauthorized" });
  if (!consumeDailyQuota(`billing-checkout:${user.id}`, PER_USER_PER_DAY)) {
    return json(429, { error: "rate_limited" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_payload" });
  }
  const validation = validateOrgCheckout(body);
  if (!validation.ok) return json(400, { error: validation.error });

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: subs, error: subErr } = await supabase
    .from("org_subscriptions")
    .select(
      "plan, status, respondent_cap, current_period_start, current_period_end, stripe_customer_id",
    )
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1);
  if (subErr) return json(500, { error: "lookup_failed" });
  const latest = (subs?.[0] ?? null) as (OrgSubscription & { stripe_customer_id: string }) | null;
  if (isActiveSubscription(latest, new Date())) return json(409, { error: "already_subscribed" });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
  try {
    const session = await stripe.checkout.sessions.create(
      buildOrgCheckoutParams({
        plan: validation.plan,
        userId: user.id,
        email: user.email,
        customerId: latest?.stripe_customer_id ?? null,
        origin: new URL(request.url).origin,
        consentAt: new Date().toISOString(),
      }),
    );
    if (!session.url) return json(502, { error: "stripe_no_url" });
    return json(200, { url: session.url });
  } catch (err) {
    console.error("billing-checkout", { message: err instanceof Error ? err.message : "unknown" });
    return json(502, { error: "stripe_error" });
  }
}
