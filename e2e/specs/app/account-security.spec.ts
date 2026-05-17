import { test, expect } from "@playwright/test";
import { AppAccountSecurityPage } from "../../poms/app/AppAccountSecurityPage";

test.describe("/app/account/security", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("2FA toggle is disabled with backend-deferred tooltip", async ({ page }) => {
    const sec = new AppAccountSecurityPage(page);
    await sec.open();
    await expect(sec.twoFaToggle).toBeDisabled();
    await sec.twoFaToggle.hover();
    await expect(sec.twoFaTooltip).toBeVisible();
  });
});
