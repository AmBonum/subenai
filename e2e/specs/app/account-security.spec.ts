import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppAccountSecurityPage } from "../../poms/app/AppAccountSecurityPage";

test.describe("/app/account/security", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-01: Page renders password form, sessions list, and 2FA activate CTA (no enrolled factor)
  test("TC-01: renders password form, sessions list, and 2FA activate CTA when no factor enrolled", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate to /app/account/security at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Verify the password form is visible", async () => {
      await expect(sec.passwordForm).toBeVisible();
    });

    await test.step("Verify the sessions list is visible", async () => {
      await expect(sec.sessionsList).toBeVisible();
    });

    await test.step("Verify the 'Aktivovať 2FA' button is visible", async () => {
      await expect(sec.twoFaActivateButton).toBeVisible();
    });

    await test.step("Verify the 2FA active badge and deactivate button are hidden", async () => {
      await expect(sec.twoFaActiveBadge).toBeHidden();
      await expect(sec.twoFaDeactivateButton).toBeHidden();
    });
  });

  // TC-02: Clicking "Aktivovať 2FA" navigates to /login/enroll-2fa
  test("TC-02: clicking 'Aktivovať 2FA' navigates to /login/enroll-2fa", async ({ page }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate to /app/account/security at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Verify the 'Aktivovať 2FA' button is visible before clicking", async () => {
      await expect(sec.twoFaActivateButton).toBeVisible();
    });

    await test.step("Click the 'Aktivovať 2FA' button", async () => {
      await sec.twoFaActivateButton.click();
    });

    await test.step("Verify the browser navigates to /login/enroll-2fa", async () => {
      await expect(page).toHaveURL(/\/login\/enroll-2fa/, { timeout: 8000 });
    });
  });

  // TC-03: Clicking "Odhlásiť" on a non-current session shows the revocation toast
  test("TC-03: clicking 'Odhlásiť' on session s2 shows 'Sedenie ukončené' toast", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate to /app/account/security at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Verify the revoke button for session s2 is visible", async () => {
      await expect(sec.revoke("s2")).toBeVisible();
    });

    await test.step("Click the 'Odhlásiť' button for session s2", async () => {
      await sec.revoke("s2").click();
    });

    await test.step("Verify the 'Sedenie ukončené' toast is visible", async () => {
      await expect(sec.toast).toBeVisible({ timeout: 4000 });
      await expect(sec.toast).toContainText("Sedenie ukončené");
    });
  });
});
