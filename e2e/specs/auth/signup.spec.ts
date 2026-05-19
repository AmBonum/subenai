import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { SignupPage } from "../../poms/auth/SignupPage";

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

/**
 * Stub `POST /auth/v1/signup` with a success response indicating email
 * confirmation was sent (session: null, confirmation_sent_at set).
 */
async function stubSignupSuccess(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/signup**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: null,
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "test@example.com",
          confirmation_sent_at: new Date().toISOString(),
        },
      }),
    });
  });
}

/**
 * Stub `POST /auth/v1/signup` with a configurable error response.
 */
async function stubSignupError(
  page: import("@playwright/test").Page,
  status: number,
  body?: object,
) {
  await page.route("**/auth/v1/signup**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(
        body ?? { error: "server_error", error_description: "Internal Server Error" },
      ),
    });
  });
}

/**
 * Stub `POST /auth/v1/signup` with a delayed success response (for double-click
 * and in-flight state tests). Delay in ms defaults to 400.
 */
async function stubSignupDelayed(
  page: import("@playwright/test").Page,
  delayMs = 400,
): Promise<{ requestCount: () => number }> {
  let count = 0;
  await page.route("**/auth/v1/signup**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    count++;
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: null,
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "test@example.com",
          confirmation_sent_at: new Date().toISOString(),
        },
      }),
    });
  });
  return { requestCount: () => count };
}

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

test.describe("Signup page — happy paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Page renders all expected UI elements
  test("TC-01: Page renders all expected UI elements", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Navigate to /signup with no active session", async () => {
      await signup.open();
    });

    await test.step("Verify the card heading 'Vytvoriť účet' is visible", async () => {
      await expect(signup.heading).toBeVisible();
      await expect(signup.heading).toHaveText("Vytvoriť účet");
    });

    await test.step("Verify the email input is visible", async () => {
      await expect(signup.emailInput).toBeVisible();
    });

    await test.step("Verify the password input is visible", async () => {
      await expect(signup.passwordInput).toBeVisible();
    });

    await test.step("Verify the password-confirm input is visible", async () => {
      await expect(signup.passwordConfirmInput).toBeVisible();
    });

    await test.step("Verify the submit button is visible and disabled (all fields empty)", async () => {
      await expect(signup.submitButton).toBeVisible();
      await expect(signup.submitButton).toBeDisabled();
    });

    await test.step("Verify the Google OAuth button labelled 'Pokračovať cez Google' is visible", async () => {
      await expect(signup.googleButton).toBeVisible();
    });

    await test.step("Verify the 'Prihlásiť sa' link navigating to /login is visible", async () => {
      await expect(signup.toLoginLink).toBeVisible();
    });
  });

  // TC-02: Valid email + strong password submits and shows the success state
  test("TC-02: Valid email + strong password submits and shows the success state", async ({
    page,
  }) => {
    const signup = new SignupPage(page);

    await test.step("Set up /auth/v1/signup stub before navigation", async () => {
      await stubSignupSuccess(page);
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Fill in email 'test@example.com'", async () => {
      await signup.fillEmail("test@example.com");
    });

    await test.step("Fill in password 'MyStr0ng!Pass'", async () => {
      await signup.fillPassword("MyStr0ng!Pass");
    });

    await test.step("Fill in password confirm 'MyStr0ng!Pass'", async () => {
      await signup.fillPasswordConfirm("MyStr0ng!Pass");
    });

    await test.step("Click 'Vytvoriť účet'", async () => {
      await signup.submitButton.click();
    });

    await test.step("Verify the success panel becomes visible", async () => {
      await expect(signup.successPanel).toBeVisible();
    });

    await test.step("Verify the success panel contains 'Skontroluj si e-mail'", async () => {
      await expect(signup.successPanel).toContainText("Skontroluj si e-mail");
    });

    await test.step("Verify the success panel contains the confirmation body text", async () => {
      await expect(signup.successPanel).toContainText(
        "Poslali sme ti odkaz na overenie účtu. Klikni naň pre dokončenie registrácie.",
      );
    });

    await test.step("Verify the form is no longer visible", async () => {
      await expect(signup.form).toBeHidden();
    });

    await test.step("Verify the 'Prihlásiť sa' link is present inside the success panel", async () => {
      await expect(signup.successToLoginLink).toBeVisible();
    });
  });

  // TC-03: Google OAuth button click triggers signInWithOAuth with the correct provider
  test("TC-03: Google OAuth button click triggers signInWithOAuth with provider=google", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    let capturedUrl: URL | null = null;

    await test.step("Intercept /auth/v1/authorize to capture the OAuth redirect request", async () => {
      await page.route("**/auth/v1/authorize**", async (route) => {
        capturedUrl = new URL(route.request().url());
        await route.fulfill({ status: 302, headers: { location: "about:blank" } });
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Click 'Pokračovať cez Google'", async () => {
      await signup.googleButton.click();
    });

    await test.step("Verify the captured request has provider=google in the query string", async () => {
      await expect
        .poll(() => capturedUrl?.searchParams.get("provider"), { timeout: 5000 })
        .toBe("google");
    });

    await test.step("Verify the redirectTo parameter contains /auth/callback", async () => {
      const redirectTo =
        capturedUrl?.searchParams.get("redirect_to") ??
        capturedUrl?.searchParams.get("redirectTo") ??
        "";
      expect(redirectTo).toContain("/auth/callback");
    });
  });
});

// ---------------------------------------------------------------------------
// Negative scenarios
// ---------------------------------------------------------------------------

test.describe("Signup page — negative scenarios", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-04: Password mismatch shows the mismatch error message
  test("TC-04: Password mismatch shows the mismatch error message", async ({ page }) => {
    const signup = new SignupPage(page);
    let signupRequestFired = false;

    await test.step("Register a request spy for /auth/v1/signup", async () => {
      await page.route("**/auth/v1/signup**", async (route) => {
        signupRequestFired = true;
        await route.fallback();
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Fill in email 'test@example.com'", async () => {
      await signup.fillEmail("test@example.com");
    });

    await test.step("Fill in password 'MyStr0ng!Pass'", async () => {
      await signup.fillPassword("MyStr0ng!Pass");
    });

    await test.step("Fill in mismatched password-confirm 'DifferentPass1!'", async () => {
      await signup.fillPasswordConfirm("DifferentPass1!");
    });

    await test.step("Click 'Vytvoriť účet'", async () => {
      await signup.submitButton.click();
    });

    await test.step("Verify the error element shows 'Heslá sa nezhodujú.'", async () => {
      await expect(signup.errorMessage).toBeVisible();
      await expect(signup.errorMessage).toHaveText("Heslá sa nezhodujú.");
    });

    await test.step("Verify no request reached /auth/v1/signup", async () => {
      expect(signupRequestFired).toBe(false);
    });

    await test.step("Verify the browser URL remains /signup", async () => {
      await expect(page).toHaveURL(/\/signup$/);
    });
  });

  // TC-05: Password shorter than 8 characters shows the weak-password error message
  test("TC-05: Password shorter than 8 characters shows the weak-password error message", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    let signupRequestFired = false;

    await test.step("Register a request spy for /auth/v1/signup", async () => {
      await page.route("**/auth/v1/signup**", async (route) => {
        signupRequestFired = true;
        await route.fallback();
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Fill in email 'test@example.com'", async () => {
      await signup.fillEmail("test@example.com");
    });

    await test.step("Fill in short password 'abc'", async () => {
      await signup.fillPassword("abc");
    });

    await test.step("Fill in matching confirm 'abc'", async () => {
      await signup.fillPasswordConfirm("abc");
    });

    await test.step("Click 'Vytvoriť účet'", async () => {
      await signup.submitButton.click();
    });

    await test.step("Verify the error element shows the weak-password message", async () => {
      await expect(signup.errorMessage).toBeVisible();
      await expect(signup.errorMessage).toHaveText("Heslo je príliš slabé. Použi aspoň 8 znakov.");
    });

    await test.step("Verify no request reached /auth/v1/signup", async () => {
      expect(signupRequestFired).toBe(false);
    });
  });

  // TC-06: Email already registered shows the email-exists error message
  test("TC-06: Email already registered shows the email-exists error message", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup with HTTP 400 user_already_exists", async () => {
      await stubSignupError(page, 400, {
        error: "user_already_exists",
        error_description: "User already registered",
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Fill valid email, matching 8-character passwords and submit", async () => {
      await signup.fillAndSubmit("existing@example.com", "ValidPass1!");
    });

    await test.step("Verify the error element shows 'Tento e-mail je už registrovaný.'", async () => {
      await expect(signup.errorMessage).toBeVisible();
      await expect(signup.errorMessage).toHaveText("Tento e-mail je už registrovaný.");
    });

    await test.step("Verify the success panel does NOT appear", async () => {
      await expect(signup.successPanel).toBeHidden();
    });

    await test.step("Verify the browser URL remains /signup", async () => {
      await expect(page).toHaveURL(/\/signup$/);
    });
  });

  // TC-07: Server error (500) shows the generic error message
  test("TC-07: Server error (500) shows the generic error message", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup with HTTP 500", async () => {
      await stubSignupError(page, 500);
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Fill valid email and matching 8-character passwords and submit", async () => {
      await signup.fillAndSubmit("test@example.com", "ValidPass1!");
    });

    await test.step("Verify the error element shows 'Registrácia zlyhala. Skús to znovu.'", async () => {
      await expect(signup.errorMessage).toBeVisible();
      await expect(signup.errorMessage).toHaveText("Registrácia zlyhala. Skús to znovu.");
    });

    await test.step("Verify the success panel does NOT appear", async () => {
      await expect(signup.successPanel).toBeHidden();
    });

    await test.step("Verify the submit button returns to the enabled state", async () => {
      await expect(signup.submitButton).toBeEnabled();
    });
  });

  // TC-08: Submit button stays disabled while any of the three fields is empty
  test("TC-08: Submit button stays disabled while any of the three fields is empty", async ({
    page,
  }) => {
    const signup = new SignupPage(page);

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Fill password fields but leave email empty — button must be disabled", async () => {
      await signup.fillPassword("ValidPass1!");
      await signup.fillPasswordConfirm("ValidPass1!");
      await expect(signup.submitButton).toBeDisabled();
    });

    await test.step("Fill email, clear password — button must be disabled", async () => {
      await signup.fillEmail("test@example.com");
      await signup.fillPassword("");
      await expect(signup.submitButton).toBeDisabled();
    });

    await test.step("Fill email and password, leave confirm empty — button must be disabled", async () => {
      await signup.fillPassword("ValidPass1!");
      await signup.fillPasswordConfirm("");
      await expect(signup.submitButton).toBeDisabled();
    });
  });

  // TC-09: "Prihlásiť sa" link navigates to /login
  test("TC-09: 'Prihlásiť sa' link navigates to /login", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Click the 'Prihlásiť sa' link", async () => {
      await signup.toLoginLink.click();
    });

    await test.step("Verify navigation to /login", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test.describe("Signup page — edge cases", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-10: Password-strength meter appears and updates while typing the password
  test("TC-10: Password-strength meter appears and updates while typing", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Verify strength meter is NOT visible when the password field is empty", async () => {
      await expect(signup.passwordStrength).toBeHidden();
    });

    await test.step("Type 'abc' into the password field", async () => {
      await signup.fillPassword("abc");
    });

    await test.step("Verify the strength meter becomes visible showing 'Sila hesla: Slabé'", async () => {
      await expect(signup.passwordStrength).toBeVisible();
      await expect(signup.passwordStrength).toContainText("Sila hesla: Slabé");
    });

    await test.step("Type 'MyStr0ng!Pass' into the password field", async () => {
      await signup.fillPassword("MyStr0ng!Pass");
    });

    await test.step("Verify the strength label updates to 'Sila hesla: Silné'", async () => {
      await expect(signup.passwordStrength).toContainText("Sila hesla: Silné");
    });
  });

  // TC-11: Email with leading and trailing whitespace is trimmed before the signup call
  test("TC-11: Email with surrounding whitespace is trimmed in the signup request body", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    let capturedEmail: string | null = null;

    await test.step("Intercept /auth/v1/signup to capture the request body", async () => {
      await page.route("**/auth/v1/signup**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        try {
          const body = JSON.parse(route.request().postData() ?? "{}") as { email?: string };
          capturedEmail = body.email ?? null;
        } catch {
          capturedEmail = null;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: null,
            user: { id: "test", confirmation_sent_at: new Date().toISOString() },
          }),
        });
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Type '  test@example.com  ' (with surrounding spaces) into the email field", async () => {
      await signup.fillEmail("  test@example.com  ");
    });

    await test.step("Fill matching 8-character passwords and submit", async () => {
      await signup.fillPassword("ValidPass1!");
      await signup.fillPasswordConfirm("ValidPass1!");
      await signup.submitButton.click();
    });

    await test.step("Verify the captured request body contains the trimmed email", async () => {
      await expect.poll(() => capturedEmail, { timeout: 5000 }).toBe("test@example.com");
    });
  });

  // TC-12: Double-clicking the submit button does not send two signup requests
  test("TC-12: Double-clicking the submit button sends exactly one signup request", async ({
    page,
  }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup with a 400 ms delay then success, and count requests", async () => {
      // stubSignupDelayed returns a counter accessor; we store it for the assertion
    });

    let requestCount = 0;
    await page.route("**/auth/v1/signup**", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      requestCount++;
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: null,
          user: { id: "test", confirmation_sent_at: new Date().toISOString() },
        }),
      });
    });

    await test.step("Navigate to /signup and fill all fields with valid values", async () => {
      await signup.open();
      await signup.fillEmail("test@example.com");
      await signup.fillPassword("ValidPass1!");
      await signup.fillPasswordConfirm("ValidPass1!");
    });

    await test.step("Double-click 'Vytvoriť účet' rapidly", async () => {
      await signup.submitButton.dblclick();
    });

    await test.step("Verify the button is disabled during the in-flight request", async () => {
      await expect(signup.submitButton).toBeDisabled();
    });

    await test.step("Wait for the success panel to appear", async () => {
      await expect(signup.successPanel).toBeVisible({ timeout: 6000 });
    });

    await test.step("Verify exactly one request reached /auth/v1/signup", async () => {
      expect(requestCount).toBe(1);
    });
  });

  // TC-13: XSS payload in the email field does not execute
  test("TC-13: XSS payload in the email field does not execute", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup with HTTP 400 user_already_exists to exercise the error path", async () => {
      await stubSignupError(page, 400, {
        error: "user_already_exists",
        error_description: "User already registered",
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Type the XSS payload into the email field and fill matching passwords", async () => {
      await signup.fillEmail("<script>window.__xss=1</script>@example.com");
      await signup.fillPassword("ValidPass1!");
      await signup.fillPasswordConfirm("ValidPass1!");
    });

    await test.step("Submit the form", async () => {
      await signup.submitButton.click();
    });

    await test.step("Verify window.__xss is undefined (script did not execute)", async () => {
      const xssValue = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__xss,
      );
      expect(xssValue).toBeUndefined();
    });

    await test.step("Verify the error element renders the raw error string, not injected HTML", async () => {
      await expect(signup.errorMessage).toBeVisible();
      await expect(signup.errorMessage).toHaveText("Tento e-mail je už registrovaný.");
    });
  });

  // TC-14: Network abort during submit shows the generic error
  test("TC-14: Network abort during submit shows the generic error", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup to abort the request", async () => {
      await page.route("**/auth/v1/signup**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.abort();
      });
    });

    await test.step("Navigate to /signup and fill all fields with valid values", async () => {
      await signup.open();
      await signup.fillAndSubmit("test@example.com", "ValidPass1!");
    });

    await test.step("Verify the error element shows 'Registrácia zlyhala. Skús to znovu.'", async () => {
      await expect(signup.errorMessage).toBeVisible();
      await expect(signup.errorMessage).toHaveText("Registrácia zlyhala. Skús to znovu.");
    });

    await test.step("Verify the submit button returns to the enabled state after failure", async () => {
      await expect(signup.submitButton).toBeEnabled();
    });
  });

  // TC-15: Keyboard-only user can complete the signup flow without a mouse
  test("TC-15: Keyboard-only user can complete the signup flow without a mouse", async ({
    page,
  }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup with a success response", async () => {
      await stubSignupSuccess(page);
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Focus the email field and type a valid email address", async () => {
      await signup.emailInput.focus();
      await signup.emailInput.fill("test@example.com");
    });

    await test.step("Tab to the password field and type a valid password", async () => {
      await page.keyboard.press("Tab");
      await signup.passwordInput.fill("ValidPass1!");
    });

    await test.step("Tab to the password-confirm field and type the same password", async () => {
      await page.keyboard.press("Tab");
      await signup.passwordConfirmInput.fill("ValidPass1!");
    });

    await test.step("Tab to the submit button and press Enter", async () => {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
    });

    await test.step("Verify the success panel becomes visible", async () => {
      await expect(signup.successPanel).toBeVisible({ timeout: 5000 });
    });
  });

  // TC-16: Mobile viewport (375×667) keeps the signup card fully inside the viewport
  test("TC-16: Mobile viewport (375×667) keeps the signup card fully inside the viewport", async ({
    page,
  }) => {
    const signup = new SignupPage(page);

    await test.step("Set mobile viewport (iPhone SE: 375×667)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Verify the signup card is fully within the viewport width (no horizontal overflow)", async () => {
      const cardBox = await signup.card.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(0);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(375);
      }
    });

    await test.step("Verify all key elements are visible without horizontal scrolling", async () => {
      await expect(signup.emailInput).toBeVisible();
      await expect(signup.passwordInput).toBeVisible();
      await expect(signup.passwordConfirmInput).toBeVisible();
      await expect(signup.submitButton).toBeVisible();
      await expect(signup.googleButton).toBeVisible();
    });
  });

  // TC-17: Google OAuth button shows a loading label while the redirect is in progress
  //
  // FINDING (plan-vs-live discrepancy — do not auto-fix):
  //   `supabase.auth.signInWithOAuth` calls `window.location.href = <authorize URL>`
  //   synchronously once the SDK resolves. Playwright follows this browser-level
  //   navigation immediately; the `googleLoading=true` React state update and the
  //   page navigation happen in the same tick from Playwright's perspective.
  //   The button text "Presmerovávam na Google..." is therefore never observable
  //   after the click before the page context closes — regardless of route stall
  //   strategy. This matches the identical limitation documented in login.spec.ts TC-13.
  //
  //   The plan asserts this loading state, but the Supabase client would need to be
  //   made injectable (Open Questions section) to test it. The test below verifies
  //   the proxy observable: that the authorize request fires with the correct
  //   provider (the loading state is a cosmetic consequence of the click handler
  //   running; the real testable invariant is that the OAuth flow was triggered).
  test("TC-17: Google OAuth button triggers the authorize redirect (loading label unobservable — see finding above)", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    let capturedUrl: URL | null = null;

    await test.step("Intercept /auth/v1/authorize to capture the request and redirect to about:blank", async () => {
      await page.route("**/auth/v1/authorize**", async (route) => {
        capturedUrl = new URL(route.request().url());
        await route.fulfill({ status: 302, headers: { location: "about:blank" } });
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Click 'Pokračovať cez Google'", async () => {
      await signup.googleButton.click();
    });

    await test.step("Verify the authorize request was sent with provider=google (the click handler fired)", async () => {
      await expect
        .poll(() => capturedUrl?.searchParams.get("provider"), { timeout: 5000 })
        .toBe("google");
    });

    // The button-disabled + label assertions from the plan require an injectable
    // Supabase client. Reported as a finding to the product/platform team.
  });

  // TC-18: Success-state "Prihlásiť sa" link navigates to /login
  test("TC-18: Success-state 'Prihlásiť sa' link navigates to /login", async ({ page }) => {
    const signup = new SignupPage(page);

    await test.step("Stub /auth/v1/signup with a success response", async () => {
      await stubSignupSuccess(page);
    });

    await test.step("Navigate to /signup and submit the form to reach the success state", async () => {
      await signup.open();
      await signup.fillAndSubmit("test@example.com", "ValidPass1!");
      await expect(signup.successPanel).toBeVisible({ timeout: 5000 });
    });

    await test.step("Click the 'Prihlásiť sa' link inside the success panel", async () => {
      await signup.successToLoginLink.click();
    });

    await test.step("Verify navigation to /login", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // TC-19: Very long email input (1 000 characters) is accepted without crashing
  test("TC-19: Very long email input (1 000 characters) does not crash the component", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    const longEmail = "a".repeat(994) + "@b.com"; // 994 + 6 = 1000 chars total

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Type a 1 000-character string into the email field", async () => {
      await signup.fillEmail(longEmail);
    });

    await test.step("Verify no React error boundary was triggered (form is still present)", async () => {
      await expect(signup.form).toBeVisible();
    });

    await test.step("Verify the email input still reflects the typed value without component-level truncation", async () => {
      const value = await signup.emailInput.inputValue();
      expect(value.length).toBeGreaterThanOrEqual(1000);
    });
  });

  // TC-20: Slovak diacritics in the email field are preserved in the signup request body
  test("TC-20: Slovak diacritics in the email field are preserved in the signup request body", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    let capturedEmail: string | null = null;

    await test.step("Intercept /auth/v1/signup to capture the request body", async () => {
      await page.route("**/auth/v1/signup**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        try {
          const body = JSON.parse(route.request().postData() ?? "{}") as { email?: string };
          capturedEmail = body.email ?? null;
        } catch {
          capturedEmail = null;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: null,
            user: { id: "test", confirmation_sent_at: new Date().toISOString() },
          }),
        });
      });
    });

    await test.step("Navigate to /signup", async () => {
      await signup.open();
    });

    await test.step("Type 'ján.novák@príklad.sk' into the email field", async () => {
      await signup.fillEmail("ján.novák@príklad.sk");
    });

    await test.step("Fill matching 8-character passwords and submit", async () => {
      await signup.fillPassword("ValidPass1!");
      await signup.fillPasswordConfirm("ValidPass1!");
      await signup.submitButton.click();
    });

    await test.step("Verify the captured request body contains 'ján.novák@príklad.sk' with diacritics intact", async () => {
      await expect.poll(() => capturedEmail, { timeout: 5000 }).toBe("ján.novák@príklad.sk");
    });
  });
});
