import { describe, it, expect, beforeEach } from "vitest";

import { __test__ } from "../../functions/_lib/security";
import {
  CHECKOUT_PER_IP_PER_HOUR,
  onRequestPost as checkoutPost,
} from "../../functions/api/create-checkout-session";
import {
  PORTAL_PER_IP_PER_HOUR,
  onRequestPost as portalPost,
} from "../../functions/api/customer-portal";
import {
  DONATION_STATUS_PER_IP_PER_WINDOW,
  onRequestGet as donationStatusGet,
} from "../../functions/api/donation-status";

const env = {
  STRIPE_SECRET_KEY: "sk_test_stub",
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
};

function post(path: string, ip: string): Request {
  return new Request(`https://subenai.sk${path}`, {
    method: "POST",
    headers: { "cf-connecting-ip": ip, "content-type": "application/json" },
    body: "not json",
  });
}

function getStatus(ip: string): Request {
  return new Request("https://subenai.sk/api/donation-status?session_id=bad", {
    headers: { "cf-connecting-ip": ip },
  });
}

const cases = [
  {
    name: "create-checkout-session",
    limit: CHECKOUT_PER_IP_PER_HOUR,
    call: (ip: string) => checkoutPost({ request: post("/api/create-checkout-session", ip), env }),
  },
  {
    name: "customer-portal",
    limit: PORTAL_PER_IP_PER_HOUR,
    call: (ip: string) => portalPost({ request: post("/api/customer-portal", ip), env }),
  },
  {
    name: "donation-status",
    limit: DONATION_STATUS_PER_IP_PER_WINDOW,
    call: (ip: string) => donationStatusGet({ request: getStatus(ip), env }),
  },
];

beforeEach(() => __test__.resetAll());

describe.each(cases)("$name per-IP rate limit", ({ limit, call }) => {
  it("returns 429 JSON with retry-after once the IP exceeds the limit", async () => {
    for (let i = 0; i < limit; i++) {
      expect((await call("203.0.113.7")).status).toBe(400);
    }
    const blocked = await call("203.0.113.7");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await blocked.json()).toEqual({ error: "rate_limited" });
  });

  it("keeps other IPs unaffected", async () => {
    for (let i = 0; i <= limit; i++) await call("203.0.113.7");
    expect((await call("198.51.100.9")).status).toBe(400);
  });
});
