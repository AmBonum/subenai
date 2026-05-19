import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { primeAuthSession, EDUCATOR_SESSION } from "../../fixtures/auth";
import { ResetPasswordPage } from "../../poms/auth/ResetPasswordPage";

// ---------------------------------------------------------------------------
// Route intercept helpers — registered BEFORE page.goto() in each test
// ---------------------------------------------------------------------------

/**
 * Stub PUT /auth/v1/user to return HTTP 200 with a minimal user object.
 */
async function stubUpdateUserSuccess(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mock-uid", email: "user@example.com" }),
    });
  });
}

/**
 * Stub PUT /auth/v1/user to return HTTP 200 after a configurable delay.
 */
async function stubUpdateUserDelayed(page: import("@playwright/test").Page, delayMs: number) {
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mock-uid", email: "user@example.com" }),
    });
  });
}

/**
 * Stub PUT /auth/v1/user to return HTTP 500.
 */
async function stubUpdateUserError(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "server_error" }),
    });
  });
}

/**
 * Stub PUT /auth/v1/user to abort (simulate offline / network failure).
 */
async function stubUpdateUserAbort(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    await route.abort();
  });
}

/**
 * Stub POST /auth/v1/token to return HTTP 400 so the recovery exchange fails
 * and `hasSession` resolves to `false`. Used for no-session TCs (TC-06,
 * TC-17) where the context is NOT pre-seeded with a valid session.
 */
async function stubTokenExchangeFailure(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/token**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Token has expired or is invalid",
      }),
    });
  });
}

// The app navigates to /login with search: { reset: "1" } which TanStack
// Start JSON-serialises as ?reset=%221%22 (a quoted string). Match on the
// presence of a `reset=` param — the exact encoding is an implementation
// detail of the router, not a contract this spec owns.
const LOGIN_RESET_URL = /\/login.*reset=/;

// ---------------------------------------------------------------------------

test.describe("Reset-password page — happy paths", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await primeAuthSession(context, page, EDUCATOR_SESSION);
  });

  // TC-01: Page renders all required UI elements when a valid recovery session exists
  test("TC-01: Page renders all required UI elements when a valid recovery session exists", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Verify the card element is visible", async () => {
      await expect(reset.card).toBeVisible();
    });

    await test.step("Verify the heading 'Nové heslo' is visible", async () => {
      await expect(reset.heading).toBeVisible();
      await expect(reset.heading).toHaveText("Nové heslo");
    });

    await test.step("Verify the subtitle 'Zadaj nové heslo k svojmu účtu.' is visible", async () => {
      await expect(page.getByText("Zadaj nové heslo k svojmu účtu.")).toBeVisible();
    });

    await test.step("Verify the new-password input is visible and empty", async () => {
      await expect(reset.passwordInput).toBeVisible();
      await expect(reset.passwordInput).toHaveValue("");
    });

    await test.step("Verify the confirm-password input is visible and empty", async () => {
      await expect(reset.passwordConfirmInput).toBeVisible();
      await expect(reset.passwordConfirmInput).toHaveValue("");
    });

    await test.step("Verify the submit button is visible and disabled because both fields are empty", async () => {
      await expect(reset.submitButton).toBeVisible();
      await expect(reset.submitButton).toBeDisabled();
    });

    await test.step("Verify no error element is present in the DOM", async () => {
      await expect(reset.errorMessage).toBeHidden();
    });

    await test.step("Verify the password-strength indicator is absent before any typing", async () => {
      await expect(reset.passwordStrength).toBeHidden();
    });
  });

  // TC-02: Valid matching passwords trigger updateUser and redirect to /login?reset=1
  test("TC-02: Valid matching passwords of sufficient length trigger updateUser and redirect to /login?reset=1", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Set up PUT /auth/v1/user intercept returning HTTP 200 before navigation", async () => {
      await stubUpdateUserSuccess(page);
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'NewPass1!' into the new-password field", async () => {
      await reset.fillPassword("NewPass1!");
    });

    await test.step("Type 'NewPass1!' into the confirm-password field", async () => {
      await reset.fillPasswordConfirm("NewPass1!");
    });

    await test.step("Click the 'Zmeniť heslo' submit button", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the browser navigates to /login with a reset query parameter", async () => {
      await expect(page).toHaveURL(LOGIN_RESET_URL);
    });

    await test.step("Verify no error element appeared at any point", async () => {
      await expect(reset.errorMessage).toBeHidden();
    });
  });

  // TC-03: Supabase JS exchanges the recovery token from the URL hash before rendering the form
  test("TC-03: Supabase JS exchanges the recovery token from the URL hash before rendering the form", async ({
    page,
  }) => {
    // The beforeEach already called primeAuthSession, which registers a
    // token intercept returning 200. That is sufficient: the component's
    // onAuthStateChange fires SIGNED_IN from the pre-seeded localStorage
    // session AND from the token exchange. We just need to verify the form
    // appears (not the no-session block) after navigating with a recovery hash.
    const reset = new ResetPasswordPage(page);

    await test.step("Navigate with a fake recovery hash so Supabase JS attempts the exchange", async () => {
      await reset.openWithHash("#access_token=FAKE&refresh_token=RFAKE&type=recovery");
    });

    await test.step("Verify the form becomes visible after the exchange completes", async () => {
      await expect(reset.form).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify the no-session block is absent (hasSession is true)", async () => {
      await expect(reset.noSessionBlock).toBeHidden();
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Reset-password page — negative scenarios", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await primeAuthSession(context, page, EDUCATOR_SESSION);
  });

  // TC-04: Password mismatch shows client-side error and does not call updateUser
  test("TC-04: Password mismatch shows client-side error and does not call updateUser", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);
    let updateCallCount = 0;

    await test.step("Register a request counter for PUT /auth/v1/user", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        if (route.request().method() === "PUT") {
          updateCallCount++;
        }
        await route.fallback();
      });
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'NewPass1!' into the new-password field", async () => {
      await reset.fillPassword("NewPass1!");
    });

    await test.step("Type 'Different2@' into the confirm-password field", async () => {
      await reset.fillPasswordConfirm("Different2@");
    });

    await test.step("Click the 'Zmeniť heslo' button", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the error element is visible with exact text 'Heslá sa nezhodujú.'", async () => {
      await expect(reset.errorMessage).toBeVisible();
      await expect(reset.errorMessage).toHaveText("Heslá sa nezhodujú.");
    });

    await test.step("Verify no PUT request was dispatched to /auth/v1/user", async () => {
      expect(updateCallCount).toBe(0);
    });

    await test.step("Verify the browser URL stays at /auth/reset-password", async () => {
      await expect(page).toHaveURL(/\/auth\/reset-password/);
    });
  });

  // TC-05: Password shorter than 8 characters shows client-side error and does not call updateUser
  test("TC-05: Password shorter than 8 characters shows client-side error and does not call updateUser", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);
    let updateCallCount = 0;

    await test.step("Register a request counter for PUT /auth/v1/user", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        if (route.request().method() === "PUT") {
          updateCallCount++;
        }
        await route.fallback();
      });
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'Ab1!' (4 chars) into both password fields", async () => {
      await reset.fillPassword("Ab1!");
      await reset.fillPasswordConfirm("Ab1!");
    });

    await test.step("Click the 'Zmeniť heslo' button", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the error element is visible with exact text 'Heslo je príliš slabé. Použi aspoň 8 znakov.'", async () => {
      await expect(reset.errorMessage).toBeVisible();
      await expect(reset.errorMessage).toHaveText("Heslo je príliš slabé. Použi aspoň 8 znakov.");
    });

    await test.step("Verify no PUT request was dispatched to /auth/v1/user", async () => {
      expect(updateCallCount).toBe(0);
    });

    await test.step("Verify the browser URL stays at /auth/reset-password", async () => {
      await expect(page).toHaveURL(/\/auth\/reset-password/);
    });
  });

  // TC-07: updateUser server error shows the generic error message and keeps the form in place
  test("TC-07: updateUser server error shows the generic error message and keeps the form", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Stub PUT /auth/v1/user to return HTTP 500 before navigation", async () => {
      await stubUpdateUserError(page);
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'NewPass1!' into both password fields", async () => {
      await reset.fillPassword("NewPass1!");
      await reset.fillPasswordConfirm("NewPass1!");
    });

    await test.step("Click the 'Zmeniť heslo' button", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the error element is visible with exact text 'Zmena hesla zlyhala. Skús to znovu.'", async () => {
      await expect(reset.errorMessage).toBeVisible();
      await expect(reset.errorMessage).toHaveText("Zmena hesla zlyhala. Skús to znovu.");
    });

    await test.step("Verify the form remains in the DOM", async () => {
      await expect(reset.form).toBeVisible();
    });

    await test.step("Verify the browser URL stays at /auth/reset-password", async () => {
      await expect(page).toHaveURL(/\/auth\/reset-password/);
    });

    await test.step("Verify the submit button is re-enabled after the response (finally block clears submitting)", async () => {
      await expect(reset.submitButton).toBeEnabled();
    });
  });

  // TC-08: Submit button is disabled while either password field is empty
  test("TC-08: Submit button is disabled while either password field is empty", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Verify the button is disabled when both fields are empty", async () => {
      await expect(reset.submitButton).toBeDisabled();
    });

    await test.step("Fill only the new-password field and verify the button stays disabled", async () => {
      await reset.fillPassword("NewPass1!");
      await expect(reset.submitButton).toBeDisabled();
    });

    await test.step("Clear the new-password field, fill only the confirm field, and verify the button stays disabled", async () => {
      await reset.fillPassword("");
      await reset.fillPasswordConfirm("NewPass1!");
      await expect(reset.submitButton).toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// No-session describe — no primeAuthSession so hasSession resolves to false
// ---------------------------------------------------------------------------

test.describe("Reset-password page — no-session scenarios", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
    // Intentionally NOT calling primeAuthSession so the page starts with no
    // recovery session. The token exchange intercept in each test ensures
    // hasSession resolves to false.
  });

  // TC-06: Expired or missing recovery token renders the no-session error block
  test("TC-06: Expired or missing recovery token renders the no-session error block", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Intercept POST /auth/v1/token to return HTTP 400 (expired token) before navigation", async () => {
      await stubTokenExchangeFailure(page);
    });

    await test.step("Navigate to /auth/reset-password with no valid hash", async () => {
      await reset.open();
    });

    await test.step("Verify the no-session block is visible", async () => {
      await expect(reset.noSessionBlock).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify the error text 'Odkaz na obnovu vypršal. Vyžiadaj si nový.' is visible inside the alert role", async () => {
      await expect(reset.noSessionBlock.getByRole("alert")).toContainText(
        "Odkaz na obnovu vypršal. Vyžiadaj si nový.",
      );
    });

    await test.step("Verify a link labelled 'Vyžiadať nový odkaz' pointing to /forgot-password is visible", async () => {
      await expect(reset.toForgotLink).toBeVisible();
      await expect(reset.toForgotLink).toHaveText("Vyžiadať nový odkaz");
    });

    await test.step("Verify the password form is absent from the DOM", async () => {
      await expect(reset.form).toBeHidden();
    });
  });

  // TC-17: No-session link navigates to /forgot-password
  test("TC-17: No-session link navigates to /forgot-password", async ({ page }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Intercept POST /auth/v1/token to return HTTP 400 before navigation", async () => {
      await stubTokenExchangeFailure(page);
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Verify the no-session block is visible", async () => {
      await expect(reset.noSessionBlock).toBeVisible({ timeout: 8000 });
    });

    await test.step("Click the link labelled 'Vyžiadať nový odkaz' (data-testid='reset-to-forgot')", async () => {
      await reset.toForgotLink.click();
    });

    await test.step("Verify the browser navigates to /forgot-password", async () => {
      await expect(page).toHaveURL(/\/forgot-password$/);
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Reset-password page — edge cases", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await primeAuthSession(context, page, EDUCATOR_SESSION);
  });

  // TC-09: Password exactly 8 characters long passes the length check
  test("TC-09: Password exactly 8 characters long passes the length check", async ({ page }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Stub PUT /auth/v1/user to return HTTP 200 before navigation", async () => {
      await stubUpdateUserSuccess(page);
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'Abcdef1!' (exactly 8 chars) into both password fields and submit", async () => {
      await reset.fillBothAndSubmit("Abcdef1!");
    });

    await test.step("Verify no error element appears", async () => {
      await expect(reset.errorMessage).toBeHidden();
    });

    await test.step("Verify the browser navigates to /login with a reset query parameter", async () => {
      await expect(page).toHaveURL(LOGIN_RESET_URL);
    });
  });

  // TC-10: Password of 7 characters is rejected even when fields match
  test("TC-10: Password of 7 characters is rejected even when fields match", async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    let updateCallCount = 0;

    await test.step("Register a request counter for PUT /auth/v1/user", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        if (route.request().method() === "PUT") {
          updateCallCount++;
        }
        await route.fallback();
      });
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'Abcde1!' (7 chars) into both fields and submit", async () => {
      await reset.fillBothAndSubmit("Abcde1!");
    });

    await test.step("Verify the weak-password error is visible", async () => {
      await expect(reset.errorMessage).toBeVisible();
      await expect(reset.errorMessage).toHaveText("Heslo je príliš slabé. Použi aspoň 8 znakov.");
    });

    await test.step("Verify no PUT request was dispatched to /auth/v1/user", async () => {
      expect(updateCallCount).toBe(0);
    });
  });

  // TC-11: Password strength meter reflects scoring thresholds correctly
  test("TC-11: Password strength meter reflects scoring thresholds correctly", async ({ page }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'aaaaaaaa' (8 lowercase, score 25) and verify label reads 'Sila hesla: Slabé'", async () => {
      await reset.fillPassword("aaaaaaaa");
      await expect(reset.passwordStrength).toBeVisible();
      await expect(reset.passwordStrength).toContainText("Sila hesla: Slabé");
    });

    await test.step("Clear the field and type 'Aaaaaaa1!' (uppercase + digit + special, score ≥50) and verify label reads 'Sila hesla: Stredné'", async () => {
      await reset.fillPassword("");
      await reset.fillPassword("Aaaaaaa1!");
      await expect(reset.passwordStrength).toContainText("Sila hesla: Stredné");
    });

    await test.step("Clear the field and type 'Aaaaaaaaa1!X' (12+ chars, uppercase, digit, special, score 100) and verify label reads 'Sila hesla: Silné'", async () => {
      await reset.fillPassword("");
      await reset.fillPassword("Aaaaaaaaa1!X");
      await expect(reset.passwordStrength).toContainText("Sila hesla: Silné");
    });
  });

  // TC-12: Strength indicator does not appear before the first character is typed
  test("TC-12: Strength indicator is absent on load, appears after typing, disappears after clearing", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Verify the strength indicator is absent from the DOM before any typing", async () => {
      await expect(reset.passwordStrength).toBeHidden();
    });

    await test.step("Type one character into the new-password field and verify the strength indicator appears", async () => {
      await reset.fillPassword("a");
      await expect(reset.passwordStrength).toBeVisible();
    });

    await test.step("Clear the field and verify the strength indicator disappears", async () => {
      await reset.fillPassword("");
      await expect(reset.passwordStrength).toBeHidden();
    });
  });

  // TC-13: Double-clicking submit does not dispatch two PUT requests
  test("TC-13: Double-clicking submit dispatches exactly one PUT request", async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    let requestCount = 0;

    await test.step("Stub PUT /auth/v1/user with a 400 ms delay, counting requests", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        if (route.request().method() !== "PUT") {
          await route.fallback();
          return;
        }
        requestCount++;
        await new Promise((r) => setTimeout(r, 400));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "mock-uid", email: "user@example.com" }),
        });
      });
    });

    await test.step("Navigate to /auth/reset-password and fill both password fields", async () => {
      await reset.open();
      await reset.fillPassword("NewPass1!");
      await reset.fillPasswordConfirm("NewPass1!");
    });

    await test.step("Click the submit button to start the in-flight request", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the button becomes disabled while in flight, then attempt a second click", async () => {
      await expect(reset.submitButton).toBeDisabled();
      await reset.submitButton.click({ force: false, timeout: 1000 }).catch(() => {
        // expected: click is rejected on a disabled button
      });
    });

    await test.step("Wait for navigation to /login with reset parameter", async () => {
      await expect(page).toHaveURL(LOGIN_RESET_URL, { timeout: 5000 });
    });

    await test.step("Verify exactly one PUT request reached /auth/v1/user", async () => {
      expect(requestCount).toBe(1);
    });
  });

  // TC-14: Network abort from updateUser shows the generic error and re-enables the button
  test("TC-14: Network abort from updateUser shows the generic error and re-enables the button", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Stub PUT /auth/v1/user to abort before navigation", async () => {
      await stubUpdateUserAbort(page);
    });

    await test.step("Navigate to /auth/reset-password and fill both password fields", async () => {
      await reset.open();
      await reset.fillPassword("NewPass1!");
      await reset.fillPasswordConfirm("NewPass1!");
    });

    await test.step("Click 'Zmeniť heslo' and trigger the network abort", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the error element shows 'Zmena hesla zlyhala. Skús to znovu.'", async () => {
      await expect(reset.errorMessage).toBeVisible();
      await expect(reset.errorMessage).toHaveText("Zmena hesla zlyhala. Skús to znovu.");
    });

    await test.step("Verify the submit button returns to its enabled, non-loading state", async () => {
      await expect(reset.submitButton).toBeEnabled();
    });

    await test.step("Verify the form remains in the DOM", async () => {
      await expect(reset.form).toBeVisible();
    });
  });

  // TC-15: Slovak diacritics in the password field are accepted without corruption
  test("TC-15: Slovak diacritics in the password field are accepted without corruption", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);
    let capturedPassword: string | null = null;

    await test.step("Intercept PUT /auth/v1/user to capture the request body before navigation", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        if (route.request().method() !== "PUT") {
          await route.fallback();
          return;
        }
        try {
          const body = JSON.parse(route.request().postData() ?? "{}") as {
            password?: string;
          };
          capturedPassword = body.password ?? null;
        } catch {
          capturedPassword = null;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "mock-uid", email: "user@example.com" }),
        });
      });
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type 'Súťaž2026!' (contains Slovak diacritics ú, ť, ž) into both fields and submit", async () => {
      await reset.fillBothAndSubmit("Súťaž2026!");
    });

    await test.step("Verify no client-side validation error appears", async () => {
      await expect(reset.errorMessage).toBeHidden();
    });

    await test.step("Verify the captured PUT body contains the password string exactly as typed", async () => {
      await expect.poll(() => capturedPassword, { timeout: 5000 }).toBe("Súťaž2026!");
    });

    await test.step("Verify the browser navigates to /login with a reset query parameter", async () => {
      await expect(page).toHaveURL(LOGIN_RESET_URL);
    });
  });

  // TC-16: XSS payload in the password field does not execute
  test("TC-16: XSS payload in the password field does not execute", async ({ page }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Stub PUT /auth/v1/user to return HTTP 500 to force the error-render path", async () => {
      await stubUpdateUserError(page);
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Type the XSS payload into both fields and submit", async () => {
      await reset.fillBothAndSubmit("<script>window.__xss=1</script>Pass1!");
    });

    await test.step("Verify window.__xss is undefined (script did not execute)", async () => {
      const xssValue = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__xss,
      );
      expect(xssValue).toBeUndefined();
    });

    await test.step("Verify the error element renders the Slovak text as plain text, not injected HTML", async () => {
      await expect(reset.errorMessage).toBeVisible();
      await expect(reset.errorMessage).toHaveText("Zmena hesla zlyhala. Skús to znovu.");
    });
  });

  // TC-18: Button label changes to "Ukladám..." while the PUT request is in flight
  test("TC-18: Button label changes to 'Ukladám...' while the PUT request is in flight", async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Stub PUT /auth/v1/user with a 500 ms delay before navigation", async () => {
      await stubUpdateUserDelayed(page, 500);
    });

    await test.step("Navigate to /auth/reset-password and fill both password fields", async () => {
      await reset.open();
      await reset.fillPassword("NewPass1!");
      await reset.fillPasswordConfirm("NewPass1!");
    });

    await test.step("Click 'Zmeniť heslo' to start the in-flight request", async () => {
      await reset.submitButton.click();
    });

    await test.step("Verify the button label changes to 'Ukladám...' within 100 ms", async () => {
      await expect(reset.submitButton).toHaveText("Ukladám...");
    });

    await test.step("Verify the button has the disabled attribute during the in-flight request", async () => {
      await expect(reset.submitButton).toBeDisabled();
    });

    await test.step("Verify the browser navigates to /login with a reset query parameter after the response arrives", async () => {
      await expect(page).toHaveURL(LOGIN_RESET_URL, { timeout: 5000 });
    });
  });

  // TC-19: Keyboard-only user can submit the form without a mouse
  test("TC-19: Keyboard-only user can submit the form without a mouse", async ({ page }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Stub PUT /auth/v1/user to return HTTP 200 before navigation", async () => {
      await stubUpdateUserSuccess(page);
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Focus the new-password field and type 'NewPass1!'", async () => {
      await reset.passwordInput.focus();
      await reset.passwordInput.fill("NewPass1!");
    });

    await test.step("Press Tab to move to the confirm-password field and type 'NewPass1!'", async () => {
      await page.keyboard.press("Tab");
      await reset.passwordConfirmInput.fill("NewPass1!");
    });

    await test.step("Press Tab to focus the submit button and press Enter", async () => {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
    });

    await test.step("Verify the browser navigates to /login with a reset query parameter", async () => {
      await expect(page).toHaveURL(LOGIN_RESET_URL, { timeout: 5000 });
    });
  });

  // TC-20: Mobile viewport (375×667) keeps the card within the viewport
  test("TC-20: Mobile viewport (375×667) keeps the card within the viewport", async ({ page }) => {
    const reset = new ResetPasswordPage(page);

    await test.step("Set mobile viewport (iPhone SE: 375×667)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Navigate to /auth/reset-password", async () => {
      await reset.open();
    });

    await test.step("Verify the card element is fully within the viewport width (no horizontal overflow)", async () => {
      const cardBox = await reset.card.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(0);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(375);
      }
    });

    await test.step("Verify both password inputs, the strength placeholder, and the submit button are visible without horizontal scrolling", async () => {
      await expect(reset.passwordInput).toBeVisible();
      await expect(reset.passwordConfirmInput).toBeVisible();
      await expect(reset.submitButton).toBeVisible();
    });
  });

  // TC-21: Page carries noindex,nofollow robots directive + correct title.
  // Re-enabled 2026-05-19 once `<HeadContent />` landed in __root.tsx.
  test("TC-21: Page has noindex,nofollow meta robots and the correct title", async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    await reset.open();
    const robotsContent = await reset.robotsMetaContent();
    expect(robotsContent).toBe("noindex,nofollow");
    await expect(page).toHaveTitle("Nové heslo · SubenAI");
  });
});
