import { test, expect } from "@playwright/test";
import { AppHelpPage } from "../../poms/app/AppHelpPage";

test.describe("/app/help", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("renders FAQ list and contact CTA", async ({ page }) => {
    const help = new AppHelpPage(page);
    await help.open();
    await expect(help.faqList).toBeVisible();
    await expect(help.contactCta).toBeVisible();
    await expect(help.searchInput).toBeVisible();
  });
});
