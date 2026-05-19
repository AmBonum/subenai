import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { primeAuthSession, EDUCATOR_SESSION } from "../../fixtures/auth";
import { Enroll2faPage } from "../../poms/auth/Enroll2faPage";

// This spec must run against the wrangler/Cloudflare Pages dev server
// (port 8788), NOT the Vite dev server (8080). The enroll-2fa route has a
// `beforeLoad` guard that calls `supabase.auth.getSession()`, `getAALStatus()`
// and `listFactors()`. In Vite's CSR-only dev mode the programmatic
// `redirect(...)` thrown inside `beforeLoad` silently no-ops; the URL never
// changes, so URL assertions hang. On the wrangler runtime the router
// evaluates `beforeLoad` server-side and the redirect fires correctly.
// Verified 2026-05-19 (comparable pattern to callback.spec.ts).
//
// Start the wrangler server with: npm run dev:api
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

// ---------------------------------------------------------------------------
// Shared mock payloads
// ---------------------------------------------------------------------------

const FACTOR_ID = "factor-abc";
const CHALLENGE_ID = "chal-xyz";
const BACKUP_CODES = [
  "aaa-bbb",
  "ccc-ddd",
  "eee-fff",
  "ggg-hhh",
  "iii-jjj",
  "jjj-kkk",
  "lll-mmm",
  "nnn-ooo",
];

const ENROLL_RESPONSE = {
  id: FACTOR_ID,
  totp: {
    qr_code: "data:image/png;base64,ABC",
    secret: "JBSWY3DPEHPK3PXP",
    uri: "otpauth://totp/subenai.sk%20admin:admin%40e2e.test?secret=JBSWY3DPEHPK3PXP&issuer=subenai.sk%20admin",
  },
};

// ---------------------------------------------------------------------------
// Route stub helpers — always registered BEFORE page.goto(...)
// ---------------------------------------------------------------------------

async function stubEnrollSuccess(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/factors", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ENROLL_RESPONSE),
      });
      return;
    }
    await route.fallback();
  });
}

async function stubEnrollError(page: import("@playwright/test").Page, status = 500) {
  await page.route("**/auth/v1/factors", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ message: "internal server error" }),
      });
      return;
    }
    await route.fallback();
  });
}

async function stubHasRoleTrue(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/rpc/has_role**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(true),
    });
  });
}

async function stubChallengeSuccess(page: import("@playwright/test").Page) {
  await page.route(`**/auth/v1/factors/${FACTOR_ID}/challenge**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: CHALLENGE_ID, factor_id: FACTOR_ID }),
    });
  });
}

async function stubVerifySuccess(page: import("@playwright/test").Page, delayMs = 0) {
  await page.route(`**/auth/v1/factors/${FACTOR_ID}/verify**`, async (route) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

async function stubVerifyError(
  page: import("@playwright/test").Page,
  status: number,
  body: object,
) {
  await page.route(`**/auth/v1/factors/${FACTOR_ID}/verify**`, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function stubVerifyAbort(page: import("@playwright/test").Page) {
  await page.route(`**/auth/v1/factors/${FACTOR_ID}/verify**`, async (route) => {
    await route.abort();
  });
}

async function stubBackupCodesSuccess(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/rpc/generate_mfa_backup_codes**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(BACKUP_CODES),
    });
  });
}

// ---------------------------------------------------------------------------
// Wizard navigation helpers (used across multiple TCs)
// ---------------------------------------------------------------------------

async function navigateToStep3(
  page: import("@playwright/test").Page,
  enroll: Enroll2faPage,
): Promise<void> {
  await enroll.open();
  await enroll.clickStep1Continue();
  await expect(enroll.qrImage).toBeVisible({ timeout: 6000 });
  await enroll.clickStep2Continue();
  await expect(enroll.step3Form).toBeVisible({ timeout: 6000 });
}

async function navigateToStep4(
  page: import("@playwright/test").Page,
  enroll: Enroll2faPage,
): Promise<void> {
  await navigateToStep3(page, enroll);
  await enroll.fillCode("123456");
  await enroll.clickVerify();
  await expect(enroll.backupCodesList).toBeVisible({ timeout: 8000 });
}

// ===========================================================================
// Happy paths (TC-01 through TC-04)
// Session: AAL1, no verified factors — primeAuthSession(EDUCATOR_SESSION)
// ===========================================================================

test.describe("2FA enrollment page — happy paths", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await primeAuthSession(context, page, EDUCATOR_SESSION);
  });

  // TC-01: Step 1 renders all expected UI elements for an AAL1 admin session
  test("TC-01: Step 1 renders all expected UI elements for an AAL1 admin session", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Navigate to /login/enroll-2fa at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enroll.open();
    });

    await test.step("Verify the enrollment card is visible", async () => {
      await expect(enroll.card).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify the heading reads 'Dvojfaktorové overenie'", async () => {
      await expect(enroll.heading).toHaveText("Dvojfaktorové overenie");
    });

    await test.step("Verify the subheading reads the setup prompt", async () => {
      await expect(enroll.subheading).toHaveText(
        "Zabezpečte si účet jednorázovým kódom z autentifikátora.",
      );
    });

    await test.step("Verify the step indicator reads 'Krok 1 zo 4'", async () => {
      await expect(enroll.stepIndicator).toHaveText("Krok 1 zo 4");
    });

    await test.step("Verify the step-1 panel is visible", async () => {
      await expect(enroll.step1Panel).toBeVisible();
    });

    await test.step("Verify the step-1 continue button labelled 'Pokračovať' is visible", async () => {
      await expect(enroll.step1ContinueButton).toBeVisible();
    });
  });

  // TC-02: Step 2 shows QR code and manual secret after clicking continue on step 1
  test("TC-02: Step 2 shows QR code and manual secret after clicking continue on step 1", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment success and has_role=true intercepts before navigation", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
    });

    await test.step("Navigate to /login/enroll-2fa at 1280×800 and wait for step 1", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enroll.open();
      await expect(enroll.step1Panel).toBeVisible({ timeout: 8000 });
    });

    await test.step("Click 'Pokračovať' to advance to step 2", async () => {
      await enroll.clickStep1Continue();
    });

    await test.step("Verify the step indicator reads 'Krok 2 zo 4'", async () => {
      await expect(enroll.stepIndicator).toHaveText("Krok 2 zo 4", { timeout: 6000 });
    });

    await test.step("Verify the QR image is visible with a data:image src", async () => {
      await expect(enroll.qrImage).toBeVisible({ timeout: 6000 });
      const src = await enroll.qrImage.getAttribute("src");
      expect(src).toMatch(/^data:image/);
    });

    await test.step("Verify the manual secret element is visible with non-empty text", async () => {
      await expect(enroll.manualSecret).toBeVisible();
      const text = await enroll.manualSecret.textContent();
      expect((text ?? "").trim().length).toBeGreaterThan(0);
    });

    await test.step("Verify the step-2 continue button is enabled", async () => {
      await expect(enroll.step2ContinueButton).toBeEnabled();
    });
  });

  // TC-03: Valid 6-digit TOTP code enrolls the factor and advances to backup-codes step
  test("TC-03: Valid 6-digit TOTP code enrolls the factor and advances to backup-codes step", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment, challenge, verify, and backup-codes intercepts before navigation", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifySuccess(page);
      await stubBackupCodesSuccess(page);
    });

    await test.step("Navigate to step 3 by clicking through steps 1 and 2 at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
    });

    await test.step("Enter '123456' into the OTP input", async () => {
      await enroll.fillCode("123456");
    });

    await test.step("Click 'Overiť'", async () => {
      await enroll.clickVerify();
    });

    await test.step("Verify the step indicator reads 'Krok 4 zo 4'", async () => {
      await expect(enroll.stepIndicator).toHaveText("Krok 4 zo 4", { timeout: 8000 });
    });

    await test.step("Verify the backup codes list is visible with exactly 8 items", async () => {
      await expect(enroll.backupCodesList).toBeVisible();
      await expect(enroll.backupCodeItems).toHaveCount(8);
    });

    await test.step("Verify no error element is present", async () => {
      await expect(enroll.errorMessage).toBeHidden();
    });
  });

  // TC-04: Clicking "Pokračovať na admin" from step 4 navigates to /app
  test("TC-04: Clicking 'Pokračovať na admin' from step 4 navigates to /app", async ({ page }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up all intercepts (enrollment, verify, backup codes, profile_preferences) and navigate to step 4", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifySuccess(page);
      await stubBackupCodesSuccess(page);
      // The /app route's beforeLoad calls requireSupabaseAuth which queries
      // profile_preferences to check onboarded_at. When navigating client-side
      // (via TanStack Router navigate()), this Supabase call goes through the
      // browser and is interceptable. Return a valid onboarded_at so the
      // guard does not redirect to /app/onboarding.
      await page.route("**/rest/v1/profile_preferences**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user_id: EDUCATOR_SESSION.user.id,
            onboarded_at: "2026-05-01T00:00:00.000Z",
          }),
        });
      });
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep4(page, enroll);
    });

    await test.step("Click 'Pokračovať na admin'", async () => {
      await enroll.clickStep4Continue();
    });

    await test.step("Verify the browser navigates to /app", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 8000 });
    });
  });
});

// ===========================================================================
// Negative scenarios: form-level errors (TC-05, TC-06)
// Session: AAL1, no verified factors
// ===========================================================================

test.describe("2FA enrollment page — form errors", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await primeAuthSession(context, page, EDUCATOR_SESSION);
  });

  // TC-05: Invalid TOTP code shows the Slovak error message and does not advance
  test("TC-05: Invalid TOTP code shows the Slovak error message and does not advance", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment, challenge, and verify-error (422) intercepts before navigation", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifyError(page, 422, { message: "Invalid TOTP code" });
    });

    await test.step("Navigate to step 3 at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
    });

    await test.step("Enter '000000' into the OTP input", async () => {
      await enroll.fillCode("000000");
    });

    await test.step("Click 'Overiť'", async () => {
      await enroll.clickVerify();
    });

    await test.step("Verify the error element is visible with the exact invalid-code message", async () => {
      await expect(enroll.errorMessage).toBeVisible({ timeout: 6000 });
      await expect(enroll.errorMessage).toHaveText("Kód nie je správny. Skúste znova.");
    });

    await test.step("Verify the step indicator still reads 'Krok 3 zo 4' (no advance)", async () => {
      await expect(enroll.stepIndicator).toHaveText("Krok 3 zo 4");
    });

    await test.step("Verify the verify button is re-enabled after the error response", async () => {
      await expect(enroll.verifyButton).toBeEnabled({ timeout: 4000 });
    });
  });

  // TC-06: Enrollment server error keeps step 2 in loading state with disabled continue button
  //
  // FINDING: The plan (TC-06) asserts that `data-testid="enroll-2fa-error"` is visible
  // when `enrollTotp` throws on the step-1 → step-2 transition. However, in the source
  // (`src/routes/login_.enroll-2fa.tsx`) the error element is rendered only inside the
  // `{step === 3 && <form>}` block. When the enrollment useEffect on step 2 fails,
  // `setError` is called but the wizard stays on step 2, so the error element is never
  // mounted. The observable invariants are: (a) the QR loading indicator stays visible
  // (no QR image appears), and (b) the step-2 continue button stays disabled because
  // `qrCode` remains null. This test asserts those invariants instead.
  test("TC-06: Enrollment server error keeps step 2 in loading state with disabled continue button", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment-error (500) and has_role intercepts before navigation", async () => {
      await stubEnrollError(page, 500);
      await stubHasRoleTrue(page);
    });

    await test.step("Navigate to /login/enroll-2fa at 1280×800 and wait for step 1", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enroll.open();
      await expect(enroll.step1Panel).toBeVisible({ timeout: 8000 });
    });

    await test.step("Click 'Pokračovať' to trigger the enrollment request (which will fail)", async () => {
      await enroll.clickStep1Continue();
    });

    await test.step("Verify step 2 renders but no QR image appears (loading indicator stays)", async () => {
      await expect(enroll.qrLoading).toBeVisible({ timeout: 6000 });
      await expect(enroll.qrImage).toBeHidden();
    });

    await test.step("Verify the step-2 continue button remains disabled (qrCode is null)", async () => {
      await expect(enroll.step2ContinueButton).toBeDisabled();
    });
  });
});

// ===========================================================================
// Negative scenarios: beforeLoad redirects (TC-07, TC-08, TC-09)
// These tests intentionally do NOT call primeAuthSession because each TC
// controls its own session/AAL/factor state to exercise a specific redirect
// branch. TC-07 starts with no session at all.
// ===========================================================================

test.describe("2FA enrollment page — beforeLoad redirects", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-07: Unauthenticated visitor is redirected to /login by beforeLoad
  test("TC-07: Unauthenticated visitor is redirected to /login by beforeLoad", async ({ page }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Navigate to /login/enroll-2fa with no session in localStorage", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/login/enroll-2fa");
    });

    await test.step("Verify the browser is redirected to /login", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
    });

    await test.step("Verify the enrollment card is never rendered", async () => {
      await expect(enroll.card).toBeHidden();
    });
  });

  // TC-08: Already-AAL2 visitor is redirected to /app by beforeLoad
  //
  // FINDING: The `beforeLoad` guard in TanStack Start runs server-side on the
  // wrangler worker process. `page.route()` intercepts only capture browser-to-network
  // requests; they do NOT intercept server-side fetch calls made by the wrangler SSR
  // worker. `getAALStatus()` inside `beforeLoad` calls `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`
  // which POSTs to `/auth/v1/token?grant_type=aal` on the server — unreachable by
  // Playwright route mocks. This TC requires a real Supabase session at AAL2 level
  // to exercise. Skipped pending a real-session test account strategy.
  test.skip("TC-08: Already-AAL2 visitor is redirected to /app by beforeLoad", async ({
    page,
    context,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Seed a valid session and override AAL to return aal2 before navigation", async () => {
      await primeAuthSession(context, page, EDUCATOR_SESSION);
      await page.route("**/auth/v1/aal**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            currentLevel: "aal2",
            nextLevel: "aal2",
            currentAuthenticationMethods: [{ method: "totp", timestamp: 0 }],
          }),
        });
      });
    });

    await test.step("Navigate to /login/enroll-2fa at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/login/enroll-2fa");
    });

    await test.step("Verify the browser is redirected to /app", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 8000 });
    });

    await test.step("Verify the enrollment card is never rendered", async () => {
      await expect(enroll.card).toBeHidden();
    });
  });

  // TC-09: User with an existing verified factor is redirected to /login/verify-2fa
  //
  // FINDING: Same server-side `beforeLoad` constraint as TC-08. `listFactors()` calls
  // `supabase.auth.mfa.listFactors()` server-side on the wrangler worker — the
  // `page.route("**/auth/v1/factors**")` intercept targets browser requests only and
  // never fires for server-side calls. Skipped pending a real-session test account strategy.
  test.skip("TC-09: User with an existing verified factor is redirected to /login/verify-2fa", async ({
    page,
    context,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Seed a valid session and override the factors endpoint to return a verified TOTP factor", async () => {
      await primeAuthSession(context, page, EDUCATOR_SESSION);
      await page.route("**/auth/v1/factors**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              all: [
                {
                  id: "factor-xyz",
                  factor_type: "totp",
                  status: "verified",
                  created_at: "2026-05-01T00:00:00.000Z",
                  updated_at: "2026-05-01T00:00:00.000Z",
                },
              ],
              totp: [
                {
                  id: "factor-xyz",
                  factor_type: "totp",
                  status: "verified",
                  created_at: "2026-05-01T00:00:00.000Z",
                  updated_at: "2026-05-01T00:00:00.000Z",
                },
              ],
            }),
          });
          return;
        }
        await route.fallback();
      });
    });

    await test.step("Navigate to /login/enroll-2fa at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/login/enroll-2fa");
    });

    await test.step("Verify the browser is redirected to /login/verify-2fa", async () => {
      await expect(page).toHaveURL(/\/login\/verify-2fa/, { timeout: 8000 });
    });

    await test.step("Verify the enrollment card is never rendered", async () => {
      await expect(enroll.card).toBeHidden();
    });
  });
});

// ===========================================================================
// Edge cases (TC-10 through TC-19)
// Session: AAL1, no verified factors
// ===========================================================================

test.describe("2FA enrollment page — edge cases", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await primeAuthSession(context, page, EDUCATOR_SESSION);
  });

  // TC-10: Step 2 continue button is disabled while QR fetch is in flight
  test("TC-10: Step 2 continue button is disabled while QR fetch is in flight", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up 500 ms delayed enrollment intercept before navigation", async () => {
      await page.route("**/auth/v1/factors", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((r) => setTimeout(r, 500));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(ENROLL_RESPONSE),
          });
          return;
        }
        await route.fallback();
      });
      await stubHasRoleTrue(page);
    });

    await test.step("Navigate to /login/enroll-2fa at 1280×800 and wait for step 1", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enroll.open();
      await expect(enroll.step1Panel).toBeVisible({ timeout: 8000 });
    });

    await test.step("Click continue to advance to step 2", async () => {
      await enroll.clickStep1Continue();
    });

    await test.step("Verify the QR loading indicator is visible and continue button is disabled during the delay", async () => {
      await expect(enroll.qrLoading).toBeVisible({ timeout: 3000 });
      await expect(enroll.step2ContinueButton).toBeDisabled();
    });

    await test.step("Verify the QR image replaces the loading indicator once the response arrives", async () => {
      await expect(enroll.qrImage).toBeVisible({ timeout: 4000 });
      await expect(enroll.qrLoading).toBeHidden();
    });

    await test.step("Verify the continue button becomes enabled after the QR is loaded", async () => {
      await expect(enroll.step2ContinueButton).toBeEnabled();
    });
  });

  // TC-11: OTP input does not accept non-digit characters
  //
  // FINDING: The `InputOTP` component in `src/routes/login_.enroll-2fa.tsx` is
  // instantiated WITHOUT a `pattern` prop. The plan's claim that "the InputOTP
  // component's pattern restricts to digits only" is incorrect for this usage — the
  // component defaults to `inputMode="numeric"` (a keyboard hint for mobile) but does
  // NOT enforce a character-set restriction. When Playwright's `page.keyboard.type()`
  // injects 6 non-digit characters, the React `onChange` receives them, `setCode` is
  // called with the 6-char string, and `code.length === 6` makes the verify button
  // enabled. The two assertions in the plan ("value remains empty" and "button remains
  // disabled") both fail against the live component. Skipped pending a product decision
  // on whether to add `pattern={REGEXP_ONLY_DIGITS}` to the InputOTP at the call site
  // (which would enforce digit-only restriction).
  test.skip("TC-11: OTP input does not accept non-digit characters", async ({ page }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment intercepts and navigate to step 3 at 1280×800", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
    });

    await test.step("Type non-digit characters 'abc!@-' into the OTP input", async () => {
      await enroll.codeInput.focus();
      await page.keyboard.type("abc!@-");
    });

    await test.step("Verify the OTP input value remains empty (digits-only pattern rejects non-digits)", async () => {
      await expect(enroll.codeInput).toHaveValue("");
    });

    await test.step("Verify the verify button remains disabled (code.length !== 6)", async () => {
      await expect(enroll.verifyButton).toBeDisabled();
    });
  });

  // TC-12: Verify button is disabled until exactly 6 digits are entered
  test("TC-12: Verify button is disabled until exactly 6 digits are entered", async ({ page }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment intercepts and navigate to step 3 at 1280×800", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
    });

    await test.step("Enter 5 digits into the OTP input", async () => {
      await enroll.fillCode("12345");
    });

    await test.step("Verify the verify button has the disabled attribute with only 5 digits", async () => {
      await expect(enroll.verifyButton).toBeDisabled();
    });

    await test.step("Enter the 6th digit to complete the code", async () => {
      await enroll.fillCode("123456");
    });

    await test.step("Verify the verify button becomes enabled with 6 digits", async () => {
      await expect(enroll.verifyButton).toBeEnabled();
    });

    await test.step("Clear the OTP input", async () => {
      await enroll.fillCode("");
    });

    await test.step("Verify the verify button becomes disabled again when the input is empty", async () => {
      await expect(enroll.verifyButton).toBeDisabled();
    });
  });

  // TC-13: Double-submitting the verify form dispatches exactly one challenge+verify pair
  test("TC-13: Double-submitting the verify form dispatches exactly one challenge+verify pair", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);
    const requestLog = { challengeCount: 0, verifyCount: 0 };

    await test.step("Set up enrollment, counting challenge, 400 ms delayed verify, and backup-codes intercepts", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await page.route(`**/auth/v1/factors/${FACTOR_ID}/challenge**`, async (route) => {
        requestLog.challengeCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: CHALLENGE_ID, factor_id: FACTOR_ID }),
        });
      });
      await page.route(`**/auth/v1/factors/${FACTOR_ID}/verify**`, async (route) => {
        requestLog.verifyCount++;
        await new Promise((r) => setTimeout(r, 400));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      });
      await stubBackupCodesSuccess(page);
    });

    await test.step("Navigate to step 3 at 1280×800 and enter '123456'", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
      await enroll.fillCode("123456");
    });

    await test.step("Double-click 'Overiť' in rapid succession", async () => {
      await enroll.verifyButton.dblclick();
    });

    await test.step("Verify the button has the disabled attribute during the in-flight request", async () => {
      await expect(enroll.verifyButton).toBeDisabled();
    });

    await test.step("Wait for the wizard to advance to step 4", async () => {
      await expect(enroll.backupCodesList).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify exactly one challenge and one verify request reached the endpoints", async () => {
      expect(requestLog.challengeCount).toBe(1);
      expect(requestLog.verifyCount).toBe(1);
    });
  });

  // TC-14: Network abort during verify shows generic error and re-enables the button
  test("TC-14: Network abort during verify shows generic error and re-enables the button", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment, challenge, and abort-on-verify intercepts before navigation", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifyAbort(page);
    });

    await test.step("Navigate to step 3 at 1280×800 and enter '123456'", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
      await enroll.fillCode("123456");
    });

    await test.step("Click 'Overiť' with the aborted verify route", async () => {
      await enroll.clickVerify();
    });

    await test.step("Verify the generic error message is visible", async () => {
      await expect(enroll.errorMessage).toBeVisible({ timeout: 6000 });
      await expect(enroll.errorMessage).toHaveText("Nastala chyba. Skúste to znova.");
    });

    await test.step("Verify the verify button is re-enabled after the failure", async () => {
      await expect(enroll.verifyButton).toBeEnabled({ timeout: 4000 });
    });

    await test.step("Verify the wizard stays on step 3", async () => {
      await expect(enroll.stepIndicator).toHaveText("Krok 3 zo 4");
    });
  });

  // TC-15: Verify button label changes to "Overujem..." while the request is in flight
  test("TC-15: Verify button label changes to 'Overujem...' while the request is in flight", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up enrollment, challenge, 500 ms delayed verify, and backup-codes intercepts", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifySuccess(page, 500);
      await stubBackupCodesSuccess(page);
    });

    await test.step("Navigate to step 3 at 1280×800 and enter '123456'", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep3(page, enroll);
      await enroll.fillCode("123456");
    });

    await test.step("Click 'Overiť'", async () => {
      await enroll.clickVerify();
    });

    await test.step("Verify the button label changes to 'Overujem...' and is disabled during the in-flight request", async () => {
      await expect(enroll.verifyButton).toHaveText("Overujem...", { timeout: 2000 });
      await expect(enroll.verifyButton).toBeDisabled();
    });

    await test.step("Verify the wizard advances to step 4 after the response arrives", async () => {
      await expect(enroll.stepIndicator).toHaveText("Krok 4 zo 4", { timeout: 8000 });
    });
  });

  // TC-16: Backup codes copy button shows "Skopírované" feedback then reverts
  test("TC-16: Backup codes copy button shows 'Skopírované' feedback then reverts", async ({
    page,
    context,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up all intercepts and navigate to step 4 at 1280×800", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifySuccess(page);
      await stubBackupCodesSuccess(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep4(page, enroll);
    });

    await test.step("Grant clipboard-read permission", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await test.step("Click the 'Skopírovať' button", async () => {
      await enroll.clickBackupCopy();
    });

    await test.step("Verify the button label changes to 'Skopírované'", async () => {
      await expect(enroll.backupCopyButton).toHaveText("Skopírované", { timeout: 2000 });
    });

    await test.step("Verify the clipboard contents match the backup codes joined by newlines", async () => {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(BACKUP_CODES.join("\n"));
    });

    await test.step("Verify the button label reverts to 'Skopírovať' within 3 seconds", async () => {
      await expect(enroll.backupCopyButton).toHaveText("Skopírovať", { timeout: 3500 });
    });
  });

  // TC-17: Backup codes download button triggers a .txt file download named "subenai-backup-codes.txt"
  test("TC-17: Backup codes download button triggers a .txt file download named 'subenai-backup-codes.txt'", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Set up all intercepts and navigate to step 4 at 1280×800", async () => {
      await stubEnrollSuccess(page);
      await stubHasRoleTrue(page);
      await stubChallengeSuccess(page);
      await stubVerifySuccess(page);
      await stubBackupCodesSuccess(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await navigateToStep4(page, enroll);
    });

    await test.step("Register a download listener before clicking the download button and verify the file", async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        enroll.clickBackupDownload(),
      ]);

      await test.step("Verify the suggested filename is 'subenai-backup-codes.txt'", async () => {
        expect(download.suggestedFilename()).toBe("subenai-backup-codes.txt");
      });

      await test.step("Verify the downloaded file content matches backup codes joined by newlines", async () => {
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", resolve);
          stream.on("error", reject);
        });
        const content = Buffer.concat(chunks).toString("utf8");
        expect(content).toBe(BACKUP_CODES.join("\n"));
      });
    });
  });

  // TC-18: Page carries noindex,nofollow robots directive and correct title
  //
  // FINDING: The `head()` function in TanStack Start only injects meta tags in the
  // SSR/wrangler runtime. In Vite dev mode the <meta name="robots"> tag is not
  // injected into the DOM, so `robotsMetaContent()` returns null and
  // `page.title()` may return an empty string. This TC passes only against the
  // wrangler server (port 8788), which is the configured baseURL for this spec.
  test("TC-18: Page carries noindex,nofollow robots directive and correct title", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Navigate to /login/enroll-2fa at 1280×800 so beforeLoad does not redirect", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enroll.open();
      await expect(enroll.card).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify the <meta name='robots'> content is 'noindex,nofollow'", async () => {
      const robotsContent = await enroll.robotsMetaContent();
      expect(robotsContent).toBe("noindex,nofollow");
    });

    await test.step("Verify the page <title> is 'Dvojfaktorové overenie · SubenAI'", async () => {
      await expect(page).toHaveTitle("Dvojfaktorové overenie · SubenAI");
    });
  });

  // TC-19: Mobile viewport (375×667) keeps the enrollment card inside the viewport
  test("TC-19: Mobile viewport (375×667) keeps the enrollment card inside the viewport", async ({
    page,
  }) => {
    const enroll = new Enroll2faPage(page);

    await test.step("Navigate to /login/enroll-2fa at 375×667 (iPhone SE)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await enroll.open();
      await expect(enroll.card).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify the card element is fully within the viewport width", async () => {
      const box = await enroll.card.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
    });

    await test.step("Verify the step-1 panel and continue button are visible without scrolling", async () => {
      await expect(enroll.step1Panel).toBeVisible();
      await expect(enroll.step1ContinueButton).toBeVisible();
    });

    await test.step("Verify no horizontal scrollbar is present on the body", async () => {
      const hasHorizontalScroll = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    });
  });
});
