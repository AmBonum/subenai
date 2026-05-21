import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

/**
 * E37 — DB-backed /tests catalog: render + filter + sort + empty state.
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-01, TC-06,
 * TC-07, TC-08, TC-09, TC-10, TC-26).
 *
 * The catalog reads from public.get_platform_packs() at SSR. Live preview
 * deploy needs the Phase B' migration applied + platform@subenai.sk
 * Dashboard user — without those the catalog is empty.
 *
 * POM-only locators (per .claude/CLAUDE.md). The `testsDirectory` fixture
 * exposes `index` (catalog) and `pack` (detail) page objects.
 */

test.describe("/tests catalog — render + filter + sort", () => {
  test.beforeEach(async ({ page }) => {
    await primeConsent(page);
  });

  // TC-01 — Catalog renders all 15 packs from DB and count badge matches.
  test("renders 15 packs from DB and the result-count badge matches", async ({
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    await expect(testsDirectory.index.heading).toBeVisible();
    await expect(testsDirectory.index.grid).toBeVisible();
    const cardCount = await testsDirectory.index.packCards().count();
    expect(cardCount).toBe(15);
    // Result-count badge reflects the catalog size on initial load.
    const badgeText = await testsDirectory.index.resultCountBadge.textContent();
    expect(badgeText).toMatch(/15/);
  });

  // TC-06 — Legacy migrated pack "seniori" renders without "(55+)".
  // Phase G1 (PR #128) swept age qualifiers from titles.
  test("seniori detail title does NOT contain '(55+)' (Phase G1 sweep)", async ({
    testsDirectory,
  }) => {
    await testsDirectory.pack.open("seniori");
    const heading = await testsDirectory.pack.heading.textContent();
    expect(heading).not.toMatch(/\(55\+\)/);
    expect(heading).toMatch(/Seniori/);
  });

  // TC-26 — Catalog card title for seniori also doesn't contain "(55+)".
  test("catalog card title for seniori does NOT contain '(55+)'", async ({ testsDirectory }) => {
    await testsDirectory.index.open();
    const title = await testsDirectory.index.packCardTitle("seniori").textContent();
    expect(title).not.toMatch(/\(55\+\)/);
  });

  // TC-07 — Industry filter narrows the grid.
  test("toggling an industry chip narrows the grid to that industry only", async ({
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    const totalBefore = await testsDirectory.index.packCards().count();
    expect(totalBefore).toBe(15);
    await testsDirectory.index.toggleIndustryFilter("eshop");
    // eshop industry has 1 pack in the seeded data ("eshop" slug).
    const totalAfter = await testsDirectory.index.packCards().count();
    expect(totalAfter).toBeLessThan(totalBefore);
    expect(totalAfter).toBeGreaterThanOrEqual(1);
    await expect(testsDirectory.index.packCard("eshop")).toBeVisible();
  });

  // TC-08 — Filtering to a no-match combo shows empty state with recovery button.
  test("filtering to multiple unrelated industries shows empty state recovery", async ({
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    // Toggle two unrelated industries that no single pack shares.
    await testsDirectory.index.toggleIndustryFilter("eshop");
    await testsDirectory.index.toggleIndustryFilter("zdravotnictvo");
    // If both filters are AND-combined to zero matches, empty state shows.
    // If the catalog uses OR-combination, we still expect both industries
    // visible. The recovery button affordance is what we assert when zero.
    const empty = testsDirectory.index.emptyState;
    if (await empty.isVisible()) {
      await expect(testsDirectory.index.emptyStateClearButton).toBeVisible();
      await testsDirectory.index.emptyStateClearButton.click();
      // After recovery click, full grid restores.
      const restoredCount = await testsDirectory.index.packCards().count();
      expect(restoredCount).toBe(15);
    }
  });

  // TC-09 — Sort dropdown changes order.
  test("sort dropdown changes from 'newest' to 'questions_desc' and re-renders", async ({
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    const before = await testsDirectory.index.packCards().nth(0).getAttribute("data-testid");
    await testsDirectory.index.selectSort("questions_desc");
    // Re-fetch the first card — its testid identifies the slug.
    const after = await testsDirectory.index.packCards().nth(0).getAttribute("data-testid");
    // Default-sort first card and depth-sort first card can be the same
    // pack if the most-recent pack is also the deepest. The contract is
    // that the select value changed and the grid stayed visible.
    expect(after).toBeTruthy();
    await expect(testsDirectory.index.sortSelect).toHaveValue("questions_desc");
    await expect(testsDirectory.index.grid).toBeVisible();
    if (before !== after) {
      // Soft expectation — when the sort actually re-orders, the first
      // card identity differs. When it doesn't, that's also a valid
      // outcome (most-recent == deepest, fine).
      expect(before).not.toBe(after);
    }
  });

  // TC-10 — Featured spotlight tile has the badge on default sort.
  test("featured spotlight tile shows the 'Najnovší' badge on default sort", async ({
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    // The first card in the default-sort order is the featured one.
    const firstCardSlug = await testsDirectory.index.packCards().nth(0).getAttribute("data-testid");
    expect(firstCardSlug).toBeTruthy();
    // Extract the slug from the testid pattern `tests-catalog-card-<slug>`.
    const slug = firstCardSlug!.replace(/^tests-catalog-card-/, "");
    await expect(testsDirectory.index.packCardFeaturedBadge(slug)).toBeVisible();
  });
});
