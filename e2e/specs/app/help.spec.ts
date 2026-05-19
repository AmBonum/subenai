import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppHelpPage } from "../../poms/app/AppHelpPage";

test.describe("/app/help", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  test("renders FAQ list and contact CTA", async ({ page }) => {
    const help = new AppHelpPage(page);
    await help.open();
    await expect(help.faqList).toBeVisible();
    await expect(help.contactCta).toBeVisible();
    await expect(help.searchInput).toBeVisible();
  });
});
