import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppAccountSecurityPage } from "../../poms/app/AppAccountSecurityPage";

test.describe("/app/account/security", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // Assertion intentionally rewritten: the page no longer ships a single
  // "disabled toggle" — it surfaces the real TOTP enrollment surface
  // (Activate button when no verified factor exists, Deactivate + active
  // badge when one does). EDUCATOR_SESSION has no factors, so we assert
  // the activate-CTA path.
  test("renders password form, sessions list, and 2FA activate CTA", async ({ page }) => {
    const sec = new AppAccountSecurityPage(page);
    await sec.open();
    await expect(sec.passwordForm).toBeVisible();
    await expect(sec.sessionsList).toBeVisible();
    await expect(sec.twoFaActivateButton).toBeVisible();
  });
});
