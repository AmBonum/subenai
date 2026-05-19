import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppHelpPage } from "../../poms/app/AppHelpPage";

test.describe("/app/help", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-01: Page renders page header, search input, FAQ list and contact card
  test("TC-01: renders page header, search input, FAQ list and contact card", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify page header is visible and contains the title copy", async () => {
      await expect(help.pageHeader).toBeVisible();
      await expect(help.pageHeader).toContainText("Najčastejšie otázky");
    });

    await test.step("Verify search input is visible", async () => {
      await expect(help.searchInput).toBeVisible();
    });

    await test.step("Verify FAQ accordion list is visible and contains at least one item", async () => {
      await expect(help.faqList).toBeVisible();
      await expect(help.faqItem(0)).toBeVisible();
    });

    await test.step("Verify contact card is visible with CTA and subtitle", async () => {
      await expect(help.contactCard).toBeVisible();
      await expect(help.contactSubtitle).toContainText("support@subenai.sk");
      await expect(help.contactCta).toBeVisible();
    });
  });

  // TC-02: Search filters FAQ items and can be cleared to restore full list
  test("TC-02: search filters FAQ items and clearing restores the full list", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify multiple FAQ items are visible before filtering", async () => {
      await expect(help.faqItem(0)).toBeVisible();
      await expect(help.faqItem(1)).toBeVisible();
    });

    await test.step('Type "vytvorím nový test" into the search input', async () => {
      await help.searchInput.fill("vytvorím nový test");
    });

    await test.step("Verify the matching FAQ item (item 0) is still visible", async () => {
      await expect(help.faqItem(0)).toBeVisible();
    });

    await test.step("Verify item 1 (unrelated to query) is no longer rendered", async () => {
      await expect(help.faqItem(1)).toHaveCount(0);
    });

    await test.step("Clear the search input", async () => {
      await help.searchInput.fill("");
    });

    await test.step("Verify the full list is restored (item 1 is visible again)", async () => {
      await expect(help.faqItem(1)).toBeVisible();
    });
  });

  // TC-03: FAQ accordion expands on trigger click and collapses on second click
  test("TC-03: FAQ accordion item expands and collapses on trigger click", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify FAQ content for item 0 is not visible before interaction", async () => {
      await expect(help.faqContent(0)).toBeHidden();
    });

    await test.step("Click the trigger for FAQ item 0", async () => {
      await help.faqTrigger(0).click();
    });

    await test.step("Verify FAQ content for item 0 is now visible and contains the answer copy", async () => {
      await expect(help.faqContent(0)).toBeVisible();
      await expect(help.faqContent(0)).toContainText("Klikni na 'Nový test'");
    });

    await test.step("Click the trigger again to collapse FAQ item 0", async () => {
      await help.faqTrigger(0).click();
    });

    await test.step("Verify FAQ content for item 0 is hidden again", async () => {
      await expect(help.faqContent(0)).toBeHidden();
    });
  });
});
