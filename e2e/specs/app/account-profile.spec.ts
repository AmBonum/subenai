import { test, expect } from "@playwright/test";
import { AppAccountProfilePage } from "../../poms/app/AppAccountProfilePage";

test.describe("/app/account/profile", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("renders the profile form with name/email/avatar fields", async ({ page }) => {
    const profile = new AppAccountProfilePage(page);
    await profile.open();
    await expect(profile.form).toBeVisible();
    await expect(profile.nameInput).toBeVisible();
    await expect(profile.emailInput).toBeVisible();
    await expect(profile.submit).toBeVisible();
  });
});
