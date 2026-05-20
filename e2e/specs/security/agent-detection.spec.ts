// E35.6 — agent / headless-browser detection.
//
// **This spec documents CURRENT behaviour, not desired behaviour.**
//
// Today, subenai performs no detection of automated browsers — no
// `navigator.webdriver` check, no user-agent sniff, no behavioural
// heuristics. A headless Playwright client can complete the quiz
// flow exactly like a human. That's a deliberate Phase-0 posture
// (Turnstile is sufficient on the /manage-support entry point;
// rate-limit covers the bulk-creation surface; the quiz itself is
// not a scoring leaderboard that incentivises bots in v1).
//
// If/when the threat model changes (mass scraping of question bank,
// AI-driven test farming for leaderboard glory), implement detection
// and FLIP these expectations to `not.toBe()`. The test name makes
// the current posture visible in every CI run.

import { test, expect } from "../../fixtures/base";

test.describe("Agent detection — current behaviour (see E40 follow-up)", () => {
  test("TC-AD-01: should NOT block headless browsers (no detection in place today)", async ({
    page,
  }) => {
    await test.step("Visit home with default headless Playwright fingerprint", async () => {
      await page.goto("/");
    });

    await test.step("navigator.webdriver is true in headless Chromium (Playwright default)", async () => {
      const webdriver = await page.evaluate(() => navigator.webdriver === true);
      expect(webdriver).toBe(true);
    });

    await test.step("The page still serves a 200 — no detection / no block", async () => {
      // If the response was blocked, page.title() would return "" or an
      // error page; here we just assert the page rendered.
      const title = await page.title();
      expect(title.length, "expected a non-empty page title").toBeGreaterThan(0);
    });
  });

  test("TC-AD-02: should NOT block requests with Playwright user-agent", async ({ request }) => {
    // Direct request with a user-agent that loosely resembles automation.
    const response = await request.get("/", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) PlaywrightTest/1.59 Safari/537.36",
      },
    });
    expect(response.status()).toBe(200);
  });
});
