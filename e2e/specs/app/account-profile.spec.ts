import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppAccountProfilePage } from "../../poms/app/AppAccountProfilePage";

test.describe("/app/account/profile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  test("renders the profile form with name/email/avatar fields", async ({ page }) => {
    const profile = new AppAccountProfilePage(page);
    await profile.open();
    await expect(profile.form).toBeVisible();
    await expect(profile.nameInput).toBeVisible();
    await expect(profile.emailInput).toBeVisible();
    await expect(profile.submit).toBeVisible();
  });
});
