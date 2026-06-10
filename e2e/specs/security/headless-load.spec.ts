// E35.6 — headless-load rate-limit live verification.
//
// `functions/api/portal-magic-link.ts` documents:
//   - IP cap: PORTAL_LINK_PER_IP_PER_HOUR (default 10/h)
//   - Email cooldown: PORTAL_LINK_COOLDOWN_SECONDS (default 900s)
//   - Daily quota: PORTAL_LINK_DAILY_CAP (default 200/day)
//
// The Vitest contract test locks the bucket maths in-process. THIS spec
// verifies the wired-up handler returns the documented response shape
// after a burst, regardless of the underlying primitive.
//
// Notes:
//  - Runs ONLY against the local dev API (`http://localhost:8788` via
//    `npm run dev:api`) to avoid hammering the preview deploy.
//  - If the API is not running, the spec is skipped with a clear
//    message — this is the right behaviour for cross-environment
//    consistency.

import type { APIRequestContext } from "@playwright/test";

import { test, expect } from "../../fixtures/base";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8788";

async function pingApi(request: APIRequestContext): Promise<boolean> {
  try {
    const resp = await request.head(`${API_BASE}/api/portal-magic-link`);
    // Any response — even 405 / 404 — means the server is up.
    return resp.status() > 0;
  } catch {
    return false;
  }
}

test.describe("headless-load — portal magic link rate limit", () => {
  test("TC-HL-01: burst of requests trips the IP rate limit", async ({ request }) => {
    test.skip(
      !(await pingApi(request)),
      `Skipping: API at ${API_BASE} not reachable. Run \`npm run dev:api\` first.`,
    );

    const responses: number[] = [];
    // Default IP cap is 10/h; send 15 to be comfortably over even if the
    // env was raised somewhere. Use the same email + IP to maximise hit.
    for (let i = 0; i < 15; i++) {
      const resp = await request.post(`${API_BASE}/api/portal-magic-link`, {
        data: {
          email: `headless-load-${Date.now()}@example.test`,
          // Force the same fake IP across requests via x-forwarded-for
          // (server reads `cf-connecting-ip` first, then falls back).
        },
        headers: { "x-forwarded-for": "203.0.113.42" },
      });
      responses.push(resp.status());
    }

    const refused = responses.filter((s) => s === 429).length;
    expect(
      refused,
      `expected at least one 429 within 15 burst requests, got statuses ${JSON.stringify(responses)}`,
    ).toBeGreaterThan(0);
  });
});
