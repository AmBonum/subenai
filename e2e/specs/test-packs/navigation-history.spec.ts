import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

/**
 * E37 — Browser back/forward history after starting a pack (TC-20).
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-20).
 *
 * TC-20: After the user clicks "Spustiť pack →" and TestFlow mounts, pressing
 *        the browser back button must return to /tests/heslo-2fa with the
 *        detail heading visible and the start button re-enabled (component-
 *        local state is reset on navigation).
 *
 * Implementation note: the "Spustiť pack →" CTA on the detail page launches
 * the TestFlow inline (the hero is replaced, not a full navigation). The back
 * button therefore returns to the /tests/heslo-2fa URL as recorded in the
 * history stack from the detail page load itself, not to a separate TestFlow
 * URL. The assertion confirms the detail layout is visible again after goBack().
 */

test.describe("/tests/$slug — browser back/forward navigation (TC-20)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-20: Browser back/forward after starting a pack returns to the detail page intact.
  test("TC-20: browser back after starting a pack restores the detail page", async ({
    page,
    testsDirectory,
  }) => {
    await test.step("Navigate to /tests/heslo-2fa detail page", async () => {
      await testsDirectory.pack.open("heslo-2fa");
    });

    await test.step("Verify the detail page heading and start button are visible", async () => {
      await expect(testsDirectory.pack.heading).toBeVisible();
      await expect(testsDirectory.pack.startButton).toBeEnabled();
    });

    await test.step("Click 'Spustiť pack →' to boot the TestFlow", async () => {
      await testsDirectory.pack.clickStart();
      // TestFlow mounts inline — wait for the start button to disappear,
      // confirming the flow has replaced the detail hero.
      await expect(testsDirectory.pack.startButton).not.toBeVisible({ timeout: 8_000 });
    });

    await test.step("Press the browser back button", async () => {
      await page.goBack();
    });

    await test.step("Verify the browser returned to /tests/heslo-2fa", async () => {
      await expect(page).toHaveURL(/\/tests\/heslo-2fa/);
    });

    await test.step("Verify the detail heading is visible again", async () => {
      await expect(testsDirectory.pack.heading).toBeVisible();
    });

    await test.step("Verify the start button is re-enabled (component state was reset)", async () => {
      await expect(testsDirectory.pack.startButton).toBeEnabled();
    });
  });
});
