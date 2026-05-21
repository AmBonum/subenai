import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

/**
 * E37 — /tests catalog accessibility verification (Phase I outputs).
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-11, TC-12, TC-13).
 *
 * Phase I (PR #127) added:
 *   - ≥44px touch targets on filter chips + sort control
 *   - Visible focus rings on keyboard navigation
 *   - sr-only h2 above the grid for landmark navigation
 *   - aria-live="polite" on the result-count badge
 *   - <ul role="list"> wrapper around the grid
 */

test.describe("/tests catalog — accessibility (Phase I)", () => {
  test.beforeEach(async ({ page }) => {
    await primeConsent(page);
  });

  // TC-11 — Keyboard focus travels through filter chips → sort → grid.
  test("keyboard tab order: filter chips → sort dropdown → first card link", async ({
    page,
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    // Focus the first interactive element on the page, then tab forward.
    // We don't pin a specific starting node — we tab until the sort
    // select gains focus, then verify the *next* tab reaches a card.
    await page.keyboard.press("Tab");
    // Tab repeatedly until the sort dropdown is focused (header links
    // and filter chips come first; ≤30 tabs is the upper bound).
    for (let i = 0; i < 30; i++) {
      const focused = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.getAttribute("data-testid") ?? "",
      );
      if (focused === "tests-catalog-sort") break;
      await page.keyboard.press("Tab");
    }
    await expect(testsDirectory.index.sortSelect).toBeFocused();
    // One more tab should land on the first card link in the grid.
    await page.keyboard.press("Tab");
    const nextFocused = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.getAttribute("data-testid") ?? "",
    );
    expect(nextFocused).toMatch(/^tests-catalog-card-/);
  });

  // TC-12 — Touch targets ≥ 44px on the catalog header controls.
  test("filter chips and sort control have min-height ≥ 44px", async ({ page, testsDirectory }) => {
    await testsDirectory.index.open();
    // Pick one filter chip + the sort select. Both must satisfy the
    // 44px touch-target minimum (WCAG 2.5.5).
    const sortBox = await testsDirectory.index.sortSelect.boundingBox();
    expect(sortBox).not.toBeNull();
    expect(sortBox!.height).toBeGreaterThanOrEqual(44);

    // Locate any visible filter chip. The chip industry varies based on
    // which packs are loaded; we just need one.
    const anyChip = page.locator('[data-testid^="tests-catalog-filter-"]').first();
    const chipBox = await anyChip.boundingBox();
    if (chipBox) {
      expect(chipBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  // TC-13 — ARIA: grid is a list, result-count is live, sr-only h2 exists.
  test("grid is role='list', result-count has aria-live, sr-only h2 exists", async ({
    page,
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    const gridRole = await testsDirectory.index.grid.getAttribute("role");
    expect(gridRole).toBe("list");
    const liveAttr = await testsDirectory.index.resultCountBadge.getAttribute("aria-live");
    expect(liveAttr).toBe("polite");
    // The sr-only h2 doesn't have a testid but it does have the
    // semantic role + sr-only utility class. Locate by role.
    const srH2Count = await page.locator('h2.sr-only, h2[class*="sr-only"]').count();
    expect(srH2Count).toBeGreaterThanOrEqual(1);
  });
});
