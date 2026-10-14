import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

import { authenticateUser } from "../../_lib/auth-user";
import { isFirstPartyRequest, json, readBearer } from "../../_lib/billing";
import { ipRateLimit, readClientIp } from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";
import { STRIPE_API_VERSION } from "../stripe-webhook";

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

export async function onRequestPost({ request, env }: RequestContext): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return json(500, { error: "not_configured" });
  }
  if (!isFirstPartyRequest(request)) return json(403, { error: "forbidden_origin" });
  if (!ipRateLimit.consume(`billing-portal:${readClientIp(request)}`, 30, 3600)) {
    return json(429, { error: "rate_limited" }, 3600);
  }
  const user = await authenticateUser(readBearer(request), env.SUPABASE_ANON_KEY);
  if (!user) return json(401, { error: "unauthorized" });

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("org_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1);
  if (error) return json(500, { error: "lookup_failed" });
  const customerId = (data?.[0] as { stripe_customer_id?: string } | undefined)?.stripe_customer_id;
  if (!customerId) return json(404, { error: "no_subscription" });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${new URL(request.url).origin}/app/billing`,
      locale: "sk",
    });
    return json(200, { url: portal.url });
  } catch (err) {
    console.error("billing-portal", { message: err instanceof Error ? err.message : "unknown" });
    return json(502, { error: "stripe_error" });
  }
}
