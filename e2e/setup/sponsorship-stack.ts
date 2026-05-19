import { request, type FullConfig } from "@playwright/test";
import { assertStripeStackReady } from "../fixtures/stripe";

/**
 * Global setup for the sponsorship test suite.
 *
 * Pings /api/donation-status to confirm wrangler pages dev is running
 * at BASE_URL (default http://localhost:8788 for sponsorship tests).
 * Fails fast with a human-readable message if the stack is not ready.
 *
 * This runs once before any test in the suite. The three-terminal
 * sequence required is documented in e2e/specs/sponsorship/README.md.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    process.env.BASE_URL ?? config.projects[0]?.use?.baseURL ?? "http://localhost:8788";

  const apiContext = await request.newContext({ baseURL });
  try {
    await assertStripeStackReady(apiContext, baseURL);
  } finally {
    await apiContext.dispose();
  }
}
