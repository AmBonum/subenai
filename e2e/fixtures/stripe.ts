import type { APIRequestContext } from "@playwright/test";

/**
 * Stripe test-mode card constants shared across sponsorship specs.
 *
 * basic — no 3DS challenge, completes immediately.
 * sca   — triggers 3DS authentication modal (4000 0027 6000 3184).
 */
export const STRIPE_TEST_CARDS = {
  basic: {
    number: "4242 4242 4242 4242",
    exp: "12 / 34",
    cvc: "123",
    zip: "94110",
  },
  sca: {
    number: "4000 0027 6000 3184",
    exp: "12 / 34",
    cvc: "123",
    zip: "94110",
  },
} as const;

/**
 * Assert the wrangler pages dev stack is reachable before any test runs.
 *
 * Pings /api/donation-status?session_id=cs_test_PROBE. Accepts HTTP
 * 200 | 400 | 404 as "stack ready" (the endpoint validates the ID and
 * may reject it, but a non-network response proves wrangler is up).
 * Any other outcome — connection refused, 5xx, network error — fails
 * fast with a human-readable message.
 */
export async function assertStripeStackReady(
  request: APIRequestContext,
  baseURL: string,
): Promise<void> {
  const url = `${baseURL}/api/donation-status?session_id=cs_test_PROBE`;
  let response: Awaited<ReturnType<APIRequestContext["get"]>>;
  try {
    response = await request.get(url, { timeout: 10_000 });
  } catch (err) {
    throw new Error(
      `[sponsorship-stack] Wrangler pages dev is not reachable at ${baseURL}.\n` +
        `Start it with: npm run dev:api\n` +
        `Original error: ${String(err)}`,
    );
  }
  const status = response.status();
  if (status !== 200 && status !== 400 && status !== 404) {
    throw new Error(
      `[sponsorship-stack] /api/donation-status returned unexpected HTTP ${status}.\n` +
        `Expected 200 | 400 | 404. Is wrangler running and .dev.vars populated?`,
    );
  }
}
