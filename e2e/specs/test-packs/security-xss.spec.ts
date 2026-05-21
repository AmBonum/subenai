import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

/**
 * E37 — XSS payload in a pack slug does not execute script (TC-28).
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-28).
 *
 * TC-28: Navigating to a URL whose slug is a URL-encoded XSS payload
 *        (/tests/<script>alert(1)</script>) must NOT trigger a dialog
 *        or log a console XSS marker. The page renders the not-found
 *        content because the slug is absent from the DB.
 *
 * Defences verified:
 *   1. No `alert` / `confirm` / `prompt` dialog fires (page.on("dialog")).
 *   2. No `console.log("xss")` or similar XSS-marker message is emitted.
 *   3. The not-found layout renders (router threw `notFound()`).
 *
 * URL-encoding: %3Cscript%3Ealert(1)%3C/script%3E
 */

test.describe("/tests XSS slug — script injection does not execute (TC-28)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-28: XSS payload in a pack slug does not execute script.
  test("TC-28: URL-encoded script slug does not fire a dialog or console XSS marker", async ({
    page,
    notFound,
  }) => {
    let dialogFired = false;
    const xssConsoleLogs: string[] = [];

    await test.step("Attach dialog handler to fail if any dialog fires", async () => {
      page.on("dialog", async (dialog) => {
        dialogFired = true;
        await dialog.dismiss();
      });
    });

    await test.step("Attach console handler to capture XSS-marker messages", async () => {
      page.on("console", (msg) => {
        const text = msg.text().toLowerCase();
        if (text.includes("xss") || text === "1" || text.includes("alert")) {
          xssConsoleLogs.push(msg.text());
        }
      });
    });

    await test.step("Navigate to /tests/%3Cscript%3Ealert(1)%3C/script%3E", async () => {
      await page.goto("/tests/%3Cscript%3Ealert(1)%3C/script%3E");
    });

    await test.step("Verify no alert dialog was triggered", async () => {
      expect(dialogFired).toBe(false);
    });

    await test.step("Verify no XSS-marker console messages were emitted", async () => {
      expect(xssConsoleLogs).toHaveLength(0);
    });

    await test.step("Verify the not-found layout is rendered", async () => {
      await expect(notFound.heading).toBeVisible();
    });

    await test.step("Verify the not-found subheading is visible", async () => {
      await expect(notFound.subheading).toBeVisible();
    });
  });
});
