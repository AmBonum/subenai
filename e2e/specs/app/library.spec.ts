import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppLibraryPage } from "../../poms/app/AppLibraryPage";

test.describe("/app/library", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-01: Page renders with toolbar and populated question grid
  test("TC-01: page renders with toolbar and populated question grid", async ({ page }) => {
    const library = new AppLibraryPage(page);

    await test.step("Navigate to /app/library", async () => {
      await library.open();
    });

    await test.step("Verify library root is visible", async () => {
      await expect(library.root).toBeVisible();
    });

    await test.step('Verify page heading reads "Knižnica otázok"', async () => {
      // PageHeader splits the title into head/accent <span>s without a
      // space text node — `textContent` reads them concatenated. Use a
      // regex with `\s*` so the assertion is tolerant of that markup.
      await expect(library.pageHeader).toContainText(/Knižnica\s*otázok/);
    });

    await test.step("Verify search input and filter controls are visible", async () => {
      await expect(library.searchInput).toBeVisible();
      await expect(library.branchFilter).toBeVisible();
      await expect(library.difficultyFilter).toBeVisible();
    });

    await test.step("Verify first question card is rendered (non-empty grid)", async () => {
      await expect(library.questionRow("qp_0001")).toBeVisible();
    });
  });

  // TC-02: Search filters the question list
  test("TC-02: search filters the question list", async ({ page }) => {
    const library = new AppLibraryPage(page);

    await test.step("Navigate to /app/library and record unfiltered row count", async () => {
      await library.open();
      await expect(library.questionRow("qp_0001")).toBeVisible();
    });

    await test.step('Type "Otázka #1:" into the search input', async () => {
      await library.searchInput.fill("Otázka #1:");
    });

    await test.step("Verify the first question card is still visible", async () => {
      await expect(library.questionRow("qp_0001")).toBeVisible();
    });

    await test.step("Verify the empty-state card is NOT visible", async () => {
      await expect(library.emptyState).toHaveCount(0);
    });

    await test.step("Verify the grid shows exactly one card (only question #1 matches)", async () => {
      await expect(library.allRows).toHaveCount(1);
    });
  });

  // TC-03: Unmatched search shows empty state
  test("TC-03: unmatched search shows empty state", async ({ page }) => {
    const library = new AppLibraryPage(page);

    await test.step("Navigate to /app/library", async () => {
      await library.open();
    });

    await test.step("Type a non-matching string into the search input", async () => {
      await library.searchInput.fill("xyzzy_no_match_42");
    });

    await test.step("Verify the empty-state card is visible", async () => {
      await expect(library.emptyState).toBeVisible();
    });

    await test.step("Verify empty-state contains the Slovak copy", async () => {
      await expect(library.emptyState).toContainText(
        "Žiadne otázky neboli nájdené pre zvolené filtre.",
      );
    });

    await test.step("Verify the first question card is NOT visible", async () => {
      await expect(library.questionRow("qp_0001")).toHaveCount(0);
    });
  });

  // TC-04: Showing-capped sentinel renders when the result set exceeds 60
  test("TC-04: showing-capped sentinel renders for unfiltered 120-question seed", async ({
    page,
  }) => {
    const library = new AppLibraryPage(page);

    await test.step("Navigate to /app/library", async () => {
      await library.open();
    });

    await test.step("Verify the 'showing capped' notice is visible", async () => {
      // SEED_QUESTIONS has 120 rows; the unfiltered set exceeds the 60-card
      // cap, so the helper line renders with the total interpolated.
      await expect(library.showingCapped).toBeVisible();
      await expect(library.showingCapped).toContainText("Zobrazených prvých 60 z 120");
    });

    await test.step("Narrow the search so the result set drops below the cap", async () => {
      await library.searchInput.fill("Otázka #1:");
    });

    await test.step("Verify the sentinel is no longer rendered below the cap", async () => {
      await expect(library.showingCapped).toHaveCount(0);
    });
  });

  // TC-05: Combined branch + difficulty filters narrow the result set
  test("TC-05: combined branch + difficulty filters intersect on row category", async ({
    page,
  }) => {
    const library = new AppLibraryPage(page);

    await test.step("Navigate to /app/library", async () => {
      await library.open();
    });

    await test.step("Pick the 'phishing' branch from the branch filter", async () => {
      // Branch values mirror SEED_QUESTIONS.category — the first CATS entry
      // is "phishing", so it's guaranteed to be in the dropdown.
      await library.branchFilter.click();
      await library.filterOption("phishing").click();
    });

    await test.step("Pick the 'Ľahká' difficulty from the difficulty filter", async () => {
      await library.difficultyFilter.click();
      await library.filterOption("Ľahká").click();
    });

    await test.step("Verify the empty state is not shown — intersection is non-empty", async () => {
      await expect(library.emptyState).toHaveCount(0);
    });

    await test.step("Verify the qp_0001 card is visible (phishing + easy)", async () => {
      // qp_0001 is the first seeded question: category[0] = "phishing",
      // difficulty index 0 → "easy". The intersection must include it.
      await expect(library.questionRow("qp_0001")).toBeVisible();
    });

    await test.step("Verify a row that violates the branch filter is excluded", async () => {
      // qp_0002 has category "eshop" (CATS[1]); the active filter is
      // "phishing", so it must not appear in the grid.
      await expect(library.questionRow("qp_0002")).toHaveCount(0);
    });
  });
});

test.describe("/app/library — mobile responsive @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  test("toolbar wraps and grid degrades to a single column on Pixel 7", async ({ page }) => {
    const library = new AppLibraryPage(page);
    await library.open();

    await expect(library.root).toBeVisible();
    await expect(library.searchInput).toBeVisible();
    await expect(library.branchFilter).toBeVisible();

    // The grid uses `md:grid-cols-2`; at <md (Pixel 7 = 412px) it collapses
    // to a single column. Comparing the bounding boxes of the first two
    // rows: row 2 must sit *below* row 1, never beside it.
    const row1 = await library.questionRow("qp_0001").boundingBox();
    const row2 = await library.questionRow("qp_0002").boundingBox();
    expect(row1).not.toBeNull();
    expect(row2).not.toBeNull();
    expect(row2!.y).toBeGreaterThan(row1!.y + row1!.height - 1);

    // Mobile must not introduce horizontal overflow — viewport width is
    // 412 (Pixel 7); the page's scrollWidth must stay within a 1px
    // browser-rounding allowance.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // Search input must remain a comfortable tap target — at 412px the
    // toolbar gives it the full content width minus the filter chips.
    const searchBox = await library.searchInput.boundingBox();
    expect(searchBox?.width).toBeGreaterThan(200);
  });
});
