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

  // TC-04: Submit button stays disabled while password fields mismatch
  test("TC-04: 'Zmeniť heslo' submit stays disabled until the two password inputs match", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate to /app/account/security at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Verify the submit button is disabled while both fields are empty", async () => {
      await expect(sec.submitPassword).toBeDisabled();
    });

    await test.step("Fill only the new-password field", async () => {
      await sec.currentPassword.fill("Tajne-Heslo-2026!");
    });

    await test.step("Verify the submit button stays disabled while the confirm is empty", async () => {
      await expect(sec.submitPassword).toBeDisabled();
    });

    await test.step("Fill the confirm field with a non-matching value", async () => {
      await sec.newPassword.fill("Tajne-Heslo-Inych");
    });

    await test.step("Verify the submit button is still disabled because the fields differ", async () => {
      await expect(sec.submitPassword).toBeDisabled();
    });

    await test.step("Correct the confirm field so both inputs match", async () => {
      await sec.newPassword.fill("Tajne-Heslo-2026!");
    });

    await test.step("Verify the submit button is now enabled", async () => {
      await expect(sec.submitPassword).toBeEnabled();
    });
  });

  // TC-05: Submitting matching passwords surfaces the AH-11 deferred toast
  test("TC-05: submitting a matching password pair surfaces the AH-11 deferred toast", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate to /app/account/security at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Fill the new-password and confirm fields with matching values", async () => {
      await sec.currentPassword.fill("Tajne-Heslo-2026!");
      await sec.newPassword.fill("Tajne-Heslo-2026!");
    });

    await test.step("Click 'Zmeniť heslo'", async () => {
      await sec.submitPassword.click();
    });

    await test.step("Verify the deferred toast is shown verbatim", async () => {
      await expect(sec.toast).toBeVisible({ timeout: 4000 });
      await expect(sec.toast).toContainText("Funkcia ešte nie je dostupná — backend pripravujeme.");
    });

    await test.step("Verify both password fields are cleared after submit", async () => {
      await expect(sec.currentPassword).toHaveValue("");
      await expect(sec.newPassword).toHaveValue("");
    });
  });

  // TC-06: Current session row renders the "aktuálne" badge and has no revoke control
  test("TC-06: current session row shows the 'aktuálne' badge and exposes no revoke button", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate to /app/account/security at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Verify the current session row (s1) is visible and labelled 'aktuálne'", async () => {
      await expect(sec.sessionRow("s1")).toBeVisible();
      await expect(sec.sessionRow("s1")).toContainText("aktuálne");
    });

    await test.step("Verify the current session has no revoke button", async () => {
      await expect(sec.revoke("s1")).toHaveCount(0);
    });

    await test.step("Verify the non-current rows (s2, s3) DO expose a revoke button", async () => {
      await expect(sec.revoke("s2")).toBeVisible();
      await expect(sec.revoke("s3")).toBeVisible();
    });
  });
});

test.describe("/app/account/security @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-07: Password form and sessions list render full-width without horizontal overflow on mobile
  test("TC-07: password form and sessions list render full-width on mobile without horizontal overflow", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Open /app/account/security at Pixel 7 viewport", async () => {
      await sec.open();
    });

    await test.step("Verify the password form, sessions list, and 2FA CTA are visible", async () => {
      await expect(sec.passwordForm).toBeVisible();
      await expect(sec.sessionsList).toBeVisible();
      await expect(sec.twoFaActivateButton).toBeVisible();
    });

    await test.step("Verify the password inputs span most of the viewport width", async () => {
      const currentBox = await sec.currentPassword.boundingBox();
      const newBox = await sec.newPassword.boundingBox();
      expect(currentBox?.width).toBeGreaterThan(300);
      expect(newBox?.width).toBeGreaterThan(300);
    });

    await test.step("Verify the document body does not horizontally overflow the viewport", async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
