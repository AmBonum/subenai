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
      await expect(library.pageHeader).toContainText("Knižnica otázok");
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
});
