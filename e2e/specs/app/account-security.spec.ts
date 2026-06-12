import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppAccountSecurityPage } from "../../poms/app/AppAccountSecurityPage";

// The password card drives the real supabase.auth.updateUser flow
// (PUT /auth/v1/user). The auth fixture already fulfills every method on
// **/auth/v1/user** with the session user; per-test routes below override
// the PUT to capture the payload or simulate GoTrue error responses.

interface CapturedPut {
  body: Record<string, unknown> | null;
}

async function interceptPasswordPut(page: Page, captured: CapturedPut, userJson: string) {
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() === "PUT") {
      captured.body = route.request().postDataJSON() as Record<string, unknown>;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: userJson });
  });
}

const EDUCATOR_USER_JSON = JSON.stringify({
  id: "00000000-0000-0000-0000-000000000002",
  email: "educator@e2e.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { has_role: ["educator"] },
  identities: [{ provider: "email" }],
  created_at: "2026-05-19T00:00:00.000Z",
  updated_at: "2026-05-19T00:00:00.000Z",
});

test.describe("/app/account/security", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-01: Page renders the real password form + fallback link; the old mock sessions card is gone
  test("TC-01: renders password form, forgot-password fallback and 2FA CTA; no fabricated sessions card", async ({
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

    await test.step("Verify the /forgot-password fallback link is present", async () => {
      await expect(sec.forgotLink).toBeVisible();
      await expect(sec.forgotLink).toHaveAttribute("href", "/forgot-password");
    });

    await test.step("Verify the fabricated 'Aktívne sedenia' card no longer renders", async () => {
      await expect(sec.legacySessionsList).toHaveCount(0);
      await expect(sec.root).not.toContainText("Aktívne sedenia");
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

  // TC-03: Submit stays disabled until both password fields are filled
  test("TC-03: 'Zmeniť heslo' submit stays disabled until both inputs are non-empty", async ({
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
      await sec.newPassword.fill("Tajne-Heslo-2026!");
    });

    await test.step("Verify the submit button stays disabled while the confirm is empty", async () => {
      await expect(sec.submitPassword).toBeDisabled();
    });

    await test.step("Fill the confirm field", async () => {
      await sec.confirmPassword.fill("Tajne-Heslo-2026!");
    });

    await test.step("Verify the submit button is now enabled", async () => {
      await expect(sec.submitPassword).toBeEnabled();
    });
  });

  // TC-04: Mismatching passwords surface the inline Slovak error without any network call
  test("TC-04: mismatching passwords show 'Heslá sa nezhodujú.' and skip the API call", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);
    const captured: CapturedPut = { body: null };

    await test.step("Navigate and intercept PUT /auth/v1/user", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
      await interceptPasswordPut(page, captured, EDUCATOR_USER_JSON);
    });

    await test.step("Fill mismatching passwords and submit", async () => {
      await sec.newPassword.fill("Tajne-Heslo-2026!");
      await sec.confirmPassword.fill("Ine-Heslo-2026!");
      await sec.submitPassword.click();
    });

    await test.step("Verify the mismatch error renders verbatim", async () => {
      await expect(sec.passwordError).toBeVisible();
      await expect(sec.passwordError).toHaveText("Heslá sa nezhodujú.");
    });

    await test.step("Verify no PUT request reached the auth API", async () => {
      expect(captured.body).toBeNull();
    });
  });

  // TC-05: Successful change PUTs the new password and confirms via toast
  test("TC-05: submitting a valid password pair calls supabase updateUser and shows the success toast", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);
    const captured: CapturedPut = { body: null };

    await test.step("Navigate and intercept PUT /auth/v1/user", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
      await interceptPasswordPut(page, captured, EDUCATOR_USER_JSON);
    });

    await test.step("Fill a valid matching password pair and submit", async () => {
      await sec.newPassword.fill("Nove-Tajne-Heslo-2026");
      await sec.confirmPassword.fill("Nove-Tajne-Heslo-2026");
      await sec.submitPassword.click();
    });

    await test.step("Verify the success toast 'Heslo bolo zmenené.' appears", async () => {
      await expect(sec.toast).toBeVisible({ timeout: 4000 });
      await expect(sec.toast).toContainText("Heslo bolo zmenené.");
    });

    await test.step("Verify the PUT body carried the new password", async () => {
      expect(captured.body).not.toBeNull();
      expect(captured.body!.password).toBe("Nove-Tajne-Heslo-2026");
    });

    await test.step("Verify both password fields are cleared after the change", async () => {
      await expect(sec.newPassword).toHaveValue("");
      await expect(sec.confirmPassword).toHaveValue("");
    });
  });

  // TC-06: GoTrue reauthentication error maps to the Slovak message with the /forgot-password path
  test("TC-06: reauthentication-required error maps to a message linking /forgot-password", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Navigate and stub PUT /auth/v1/user with a reauthentication_needed error", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
      await page.route("**/auth/v1/user**", async (route) => {
        if (route.request().method() === "PUT") {
          await route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              code: 403,
              error_code: "reauthentication_needed",
              msg: "Reauthentication needed.",
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: EDUCATOR_USER_JSON,
        });
      });
    });

    await test.step("Fill a valid matching password pair and submit", async () => {
      await sec.newPassword.fill("Nove-Tajne-Heslo-2026");
      await sec.confirmPassword.fill("Nove-Tajne-Heslo-2026");
      await sec.submitPassword.click();
    });

    await test.step("Verify the reauthentication message with the /forgot-password link renders", async () => {
      await expect(sec.passwordError).toBeVisible();
      await expect(sec.passwordError).toContainText("Z bezpečnostných dôvodov");
      await expect(sec.reauthForgotLink).toBeVisible();
      await expect(sec.reauthForgotLink).toHaveAttribute("href", "/forgot-password");
    });
  });

  // TC-07: OAuth-only account hides the password form and explains the Google path
  test("TC-07: OAuth-only account sees the explanatory note instead of the password form", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Override GET /auth/v1/user with a Google-only identity", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "00000000-0000-0000-0000-000000000002",
            email: "educator@e2e.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: { provider: "google", providers: ["google"] },
            user_metadata: { has_role: ["educator"] },
            identities: [{ provider: "google" }],
            created_at: "2026-05-19T00:00:00.000Z",
            updated_at: "2026-05-19T00:00:00.000Z",
          }),
        });
      });
      await page.setViewportSize({ width: 1280, height: 800 });
      await sec.open();
    });

    await test.step("Verify the OAuth-only notice replaces the password form", async () => {
      await expect(sec.oauthOnlyNotice).toBeVisible();
      await expect(sec.oauthOnlyNotice).toContainText("Prihlasuješ sa cez Google");
      await expect(sec.passwordForm).toHaveCount(0);
    });
  });
});

test.describe("/app/account/security @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-08: Password form renders full-width without horizontal overflow on mobile
  test("TC-08: password form and 2FA CTA render full-width on mobile without horizontal overflow", async ({
    page,
  }) => {
    const sec = new AppAccountSecurityPage(page);

    await test.step("Open /app/account/security at Pixel 7 viewport", async () => {
      await sec.open();
    });

    await test.step("Verify the password form and 2FA CTA are visible", async () => {
      await expect(sec.passwordForm).toBeVisible();
      await expect(sec.twoFaActivateButton).toBeVisible();
    });

    await test.step("Verify the password inputs span most of the viewport width", async () => {
      const newBox = await sec.newPassword.boundingBox();
      const confirmBox = await sec.confirmPassword.boundingBox();
      expect(newBox?.width).toBeGreaterThan(300);
      expect(confirmBox?.width).toBeGreaterThan(300);
    });

    await test.step("Verify the document body does not horizontally overflow the viewport", async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
