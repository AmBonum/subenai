import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { platformPacksAvailable, PACKS_SKIP_MESSAGE } from "../../fixtures/platform-packs";

/**
 * E37 — Browser back/forward history after starting a pack (TC-20).
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-20).
 *
 * TC-20: The "Spustiť pack →" CTA mounts TestFlow inline (component-local
 *        useState; no history entry is pushed and the URL stays
 *        /tests/heslo-2fa). Browser back therefore returns to the PREVIOUS
 *        history entry — the /tests catalog the user arrived from. Browser
 *        forward re-enters /tests/heslo-2fa with the detail hero restored
 *        and the start button re-enabled (the started state died with the
 *        unmount).
 */

// Environment guard — these TCs read live pack rows (no mock layer);
// skip loudly when the configured Supabase project has no published
// platform packs. See e2e/fixtures/platform-packs.ts.
test.beforeEach(async ({ request }) => {
  test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
});

test.describe("/tests/$slug — browser back/forward navigation (TC-20)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-20: Browser back/forward after starting a pack keeps history sane and
  // resets the inline-started state.
  test("TC-20: browser back after starting a pack restores the detail page", async ({
    page,
    testsDirectory,
  }) => {
    await test.step("Open the /tests catalog and click through to heslo-2fa", async () => {
      await testsDirectory.index.open();
      await testsDirectory.index.clickPackCard("heslo-2fa");
      await expect(page).toHaveURL(/\/tests\/heslo-2fa/);
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

    await test.step("Press back — the inline start pushed no entry, so the catalog returns", async () => {
      await page.goBack();
      await expect(page).toHaveURL(/\/tests\/?$/);
      await expect(testsDirectory.index.heading).toBeVisible();
    });

    await test.step("Press forward — the detail page re-enters with the hero restored", async () => {
      await page.goForward();
      await expect(page).toHaveURL(/\/tests\/heslo-2fa/);
      await expect(testsDirectory.pack.heading).toBeVisible();
    });

    await test.step("Verify the start button is re-enabled (component state was reset)", async () => {
      await expect(testsDirectory.pack.startButton).toBeEnabled();
    });
  });
});
