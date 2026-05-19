import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { LoginPage } from "../../poms/auth/LoginPage";

const ONBOARDED_AT = "2026-05-01T00:00:00.000Z";

/**
 * Stub `POST /auth/v1/token` with a successful EDUCATOR_SESSION response.
 */
async function stubTokenSuccess(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/token**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EDUCATOR_SESSION),
    });
  });
}

/**
 * Stub `POST /auth/v1/token` with an error response.
 */
async function stubTokenError(
  page: import("@playwright/test").Page,
  status: number,
  body?: object,
) {
  await page.route("**/auth/v1/token**", async (route) => {
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
 * Stub `GET /rest/v1/rpc/has_role` to indicate non-admin.
 */
async function stubHasRoleFalse(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/rpc/has_role**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(false),
    });
  });
}

/**
 * Stub `GET /rest/v1/profile_preferences` to simulate an onboarded user.
 */
async function stubProfilePrefsOnboarded(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/profile_preferences**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user_id: EDUCATOR_SESSION.user.id,
        onboarded_at: ONBOARDED_AT,
      }),
    });
  });
}

/**
 * Stub `GET /rest/v1/profile_preferences` to simulate a user who has NOT completed onboarding.
 */
async function stubProfilePrefsNotOnboarded(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/profile_preferences**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(null),
    });
  });
}

/**
 * Stub `GET /auth/v1/user` so getSession() works after a token stub.
 */
async function stubAuthUser(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/user**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EDUCATOR_SESSION.user),
    });
  });
}

// ---------------------------------------------------------------------------

test.describe("Login page — happy paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Page renders all expected UI elements
  test("TC-01 — page renders all expected UI elements on load", async ({ page }) => {
    const login = new LoginPage(page);

    await test.step("Navigate to /login with no active session", async () => {
      await login.open();
    });

    await test.step("Verify the card heading 'Prihlásenie' is visible", async () => {
      await expect(login.heading).toBeVisible();
      await expect(login.heading).toHaveText("Prihlásenie");
    });

    await test.step("Verify the email and password inputs are visible", async () => {
      await expect(login.emailInput).toBeVisible();
      await expect(login.passwordInput).toBeVisible();
    });

    await test.step("Verify the submit button is visible and disabled (both fields empty)", async () => {
      await expect(login.submitButton).toBeVisible();
      await expect(login.submitButton).toBeDisabled();
    });

    await test.step("Verify the Google OAuth button is visible", async () => {
      await expect(login.googleButton).toBeVisible();
    });

    await test.step("Verify the forgot-password link is visible", async () => {
      await expect(login.forgotPasswordLink).toBeVisible();
      await expect(login.forgotPasswordLink).toHaveText("Zabudli ste heslo?");
    });

    await test.step("Verify the sign-up link is visible", async () => {
      await expect(login.toSignupLink).toBeVisible();
      await expect(login.toSignupLink).toHaveText("Vytvoriť účet");
    });
  });

  // TC-02: Valid credentials redirect a regular onboarded user to /app
  test("TC-02 — valid credentials redirect an onboarded user to /app", async ({ page }) => {
    const login = new LoginPage(page);

    await test.step("Set up route intercepts before navigation", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Fill in valid email and password", async () => {
      await login.fillEmail("educator@e2e.test");
      await login.fillPassword("correct-password");
    });

    await test.step("Click the submit button", async () => {
      await login.submitButton.click();
    });

    await test.step("Verify navigation to /app", async () => {
      await expect(page).toHaveURL(/\/app/);
    });

    await test.step("Verify no error message appeared", async () => {
      await expect(login.errorMessage).toBeHidden();
    });
  });

  // TC-03: Valid credentials redirect an un-onboarded user to /app/onboarding
  test("TC-03 — valid credentials redirect an un-onboarded user to /app/onboarding", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await test.step("Set up route intercepts before navigation", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsNotOnboarded(page);
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Fill valid credentials and submit", async () => {
      await login.fillAndSubmit("educator@e2e.test", "correct-password");
    });

    await test.step("Verify navigation to /app/onboarding", async () => {
      await expect(page).toHaveURL(/\/app\/onboarding/);
    });

    await test.step("Verify no error message appeared", async () => {
      await expect(login.errorMessage).toBeHidden();
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Login page — negative scenarios", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-04: Wrong credentials show the invalid-credentials error and OAuth-collision hint
  test("TC-04 — wrong credentials show invalid-credentials error and OAuth-collision hint", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await test.step("Stub /auth/v1/token to return HTTP 400 invalid_grant", async () => {
      await stubTokenError(page, 400, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      });
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Fill in mismatched credentials and submit", async () => {
      await login.fillAndSubmit("wrong@example.com", "wrong-password");
    });

    await test.step("Verify the invalid-credentials error message is visible", async () => {
      await expect(login.errorMessage).toBeVisible();
      await expect(login.errorMessage).toHaveText("Neplatný e-mail alebo heslo.");
    });

    await test.step("Verify the OAuth-collision hint panel is visible with correct text", async () => {
      await expect(login.oauthCollision).toBeVisible();
      await expect(login.oauthCollisionTitle).toHaveText(
        "Tento e-mail je zaregistrovaný cez Google.",
      );
    });

    await test.step("Verify the browser URL remains /login", async () => {
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  // TC-05: Server error (500) shows the generic error message
  test("TC-05 — server 500 shows the generic error and no OAuth-collision hint", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await test.step("Stub /auth/v1/token to return HTTP 500", async () => {
      await stubTokenError(page, 500);
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Fill in any credentials and submit", async () => {
      await login.fillAndSubmit("any@example.com", "any-password");
    });

    await test.step("Verify the generic error message is visible", async () => {
      await expect(login.errorMessage).toBeVisible();
      await expect(login.errorMessage).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the OAuth-collision hint panel is NOT visible", async () => {
      await expect(login.oauthCollision).toBeHidden();
    });

    await test.step("Verify the browser URL remains /login", async () => {
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  // TC-06: Submit button stays disabled while password field is empty
  test("TC-06 — submit button stays disabled while password field is empty", async ({ page }) => {
    const login = new LoginPage(page);
    let tokenRequestCount = 0;

    await test.step("Register a request counter for /auth/v1/token", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        tokenRequestCount++;
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "invalid_grant" }),
        });
      });
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Fill the email field but leave password empty", async () => {
      await login.fillEmail("user@example.com");
    });

    await test.step("Verify the submit button has the disabled attribute", async () => {
      await expect(login.submitButton).toBeDisabled();
    });

    await test.step("Verify clicking the disabled button does not send a network request", async () => {
      await login.submitButton.click({ force: true });
      expect(tokenRequestCount).toBe(0);
    });
  });

  // TC-07: Forgot-password link navigates to /forgot-password
  test("TC-07 — forgot-password link navigates to /forgot-password", async ({ page }) => {
    const login = new LoginPage(page);

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Click the 'Zabudli ste heslo?' link", async () => {
      await login.forgotPasswordLink.click();
    });

    await test.step("Verify navigation to /forgot-password", async () => {
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  // TC-08: Sign-up link navigates to /signup
  test("TC-08 — sign-up link navigates to /signup", async ({ page }) => {
    const login = new LoginPage(page);

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Click the 'Vytvoriť účet' link", async () => {
      await login.toSignupLink.click();
    });

    await test.step("Verify navigation to /signup", async () => {
      await expect(page).toHaveURL(/\/signup/);
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Login page — edge cases", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-09: Post-reset banner appears when ?reset=1 is present
  test("TC-09 — ?reset=1 shows the post-reset success banner; /login without param does not", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await test.step("Navigate to /login?reset=1", async () => {
      await login.openWithReset();
    });

    await test.step("Verify the reset-success banner is visible with correct text", async () => {
      await expect(login.resetSuccessBanner).toBeVisible();
      await expect(login.resetSuccessBanner).toHaveText("Heslo zmenené — môžeš sa prihlásiť.");
    });

    await test.step("Navigate to /login without the query parameter", async () => {
      await login.open();
    });

    await test.step("Verify the reset-success banner is NOT visible", async () => {
      await expect(login.resetSuccessBanner).toBeHidden();
    });
  });

  // TC-10: Google OAuth button click triggers signInWithOAuth with provider=google
  test("TC-10 — Google button triggers signInWithOAuth with provider=google and /auth/callback redirectTo", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    let capturedUrl: URL | null = null;

    await test.step("Intercept /auth/v1/authorize to capture the OAuth redirect request", async () => {
      await page.route("**/auth/v1/authorize**", async (route) => {
        capturedUrl = new URL(route.request().url());
        await route.fulfill({ status: 302, headers: { location: "about:blank" } });
      });
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Click the 'Pokračovať cez Google' button", async () => {
      await login.googleButton.click();
    });

    await test.step("Verify the captured request has provider=google", async () => {
      await expect
        .poll(() => capturedUrl?.searchParams.get("provider"), { timeout: 5000 })
        .toBe("google");
    });

    await test.step("Verify redirectTo contains /auth/callback", async () => {
      const redirectTo = capturedUrl?.searchParams.get("redirect_to") ?? "";
      expect(redirectTo).toContain("/auth/callback");
    });
  });

  // TC-11: Double-clicking submit does not send two auth requests
  test("TC-11 — double-clicking submit sends exactly one auth request", async ({ page }) => {
    const login = new LoginPage(page);
    let requestCount = 0;

    await test.step("Stub /auth/v1/token with a 300 ms delay then success", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        requestCount++;
        await new Promise((r) => setTimeout(r, 300));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EDUCATOR_SESSION),
        });
      });
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /login and fill credentials", async () => {
      await login.open();
      await login.fillEmail("educator@e2e.test");
      await login.fillPassword("correct-password");
    });

    await test.step("Double-click the submit button rapidly", async () => {
      await login.submitButton.dblclick();
    });

    await test.step("Wait for the in-flight request to complete", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 5000 });
    });

    await test.step("Verify exactly one token request was sent", async () => {
      expect(requestCount).toBe(1);
    });
  });

  // TC-12: Email with leading/trailing whitespace is trimmed before submission
  test("TC-12 — email with surrounding whitespace is trimmed in the request body", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    let capturedEmail: string | null = null;

    await test.step("Intercept /auth/v1/token to capture the request body", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
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
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "invalid_grant" }),
        });
      });
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Type '  user@example.com  ' (with surrounding spaces) into the email field", async () => {
      await login.fillEmail("  user@example.com  ");
      await login.fillPassword("any-password");
    });

    await test.step("Submit the form", async () => {
      await login.submitButton.click();
    });

    await test.step("Verify the captured request body contains the trimmed email", async () => {
      await expect.poll(() => capturedEmail, { timeout: 5000 }).toBe("user@example.com");
    });
  });

  // TC-13: OAuth-collision Google button re-uses the same onGoogle handler
  test("TC-13 — collision panel Google button triggers the same OAuth flow", async ({ page }) => {
    const login = new LoginPage(page);
    let capturedOAuthUrl: URL | null = null;

    await test.step("Stub /auth/v1/token with 400 to trigger the collision panel", async () => {
      await stubTokenError(page, 400, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      });
    });

    await test.step("Intercept /auth/v1/authorize to capture any OAuth redirect", async () => {
      await page.route("**/auth/v1/authorize**", async (route) => {
        capturedOAuthUrl = new URL(route.request().url());
        await route.fulfill({ status: 302, headers: { location: "about:blank" } });
      });
    });

    await test.step("Navigate to /login and trigger the credentials error", async () => {
      await login.open();
      await login.fillAndSubmit("wrong@example.com", "wrong-password");
    });

    await test.step("Verify the OAuth-collision panel is visible", async () => {
      await expect(login.oauthCollision).toBeVisible();
    });

    await test.step("Click the 'Pokračovať cez Google' button inside the collision panel", async () => {
      await login.oauthCollisionGoogleButton.click();
    });

    await test.step("Verify a request to /auth/v1/authorize with provider=google was captured", async () => {
      await expect
        .poll(() => capturedOAuthUrl?.searchParams.get("provider"), { timeout: 5000 })
        .toBe("google");
    });

    // NOTE: the plan originally asserted the primary Google button is
    // disabled during the redirect. That's unobservable from Playwright —
    // `supabase.auth.signInWithOAuth` sets `window.location.href` directly,
    // navigating the page away before the `googleLoading` state can be
    // observed in the DOM. The handler-fires-same-OAuth-call check above
    // is the actual testable invariant.
  });

  // TC-14: Keyboard-only user can complete the login flow
  test("TC-14 — keyboard-only user can log in by tabbing and pressing Enter", async ({ page }) => {
    const login = new LoginPage(page);

    await test.step("Set up route intercepts before navigation", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Tab to the email field and type a valid address", async () => {
      await login.emailInput.focus();
      await login.emailInput.fill("educator@e2e.test");
    });

    await test.step("Tab to the password field and type a valid password", async () => {
      await page.keyboard.press("Tab");
      await login.passwordInput.fill("correct-password");
    });

    await test.step("Press Enter to submit the form", async () => {
      await page.keyboard.press("Enter");
    });

    await test.step("Verify navigation to /app", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 5000 });
    });
  });

  // TC-15: Mobile viewport keeps the login card inside the viewport
  test("TC-15 — mobile viewport (375×667) shows the login card without horizontal overflow", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await test.step("Set mobile viewport (iPhone SE: 375×667)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Verify the login card is fully within the viewport width", async () => {
      const cardBox = await login.card.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(0);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(375);
      }
    });

    await test.step("Verify all key elements are visible without horizontal scrolling", async () => {
      await expect(login.submitButton).toBeVisible();
      await expect(login.googleButton).toBeVisible();
      await expect(login.forgotPasswordLink).toBeVisible();
      await expect(login.toSignupLink).toBeVisible();
    });
  });

  // TC-16: Already-authenticated user visiting /login is NOT automatically redirected
  test("TC-16 — already-authenticated user visiting /login stays on /login (no redirect guard)", async ({
    page,
    context,
  }) => {
    const login = new LoginPage(page);

    await test.step("Seed a valid EDUCATOR_SESSION into localStorage and prime auth intercepts", async () => {
      const { primeAuthSession } = await import("../../fixtures/auth");
      await primeAuthSession(context, page, EDUCATOR_SESSION);
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Verify the login card remains visible (no redirect happened)", async () => {
      await expect(login.card).toBeVisible();
    });

    await test.step("Verify the browser URL stays at /login", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // TC-17: XSS payload in the email field does not execute
  test("TC-17 — XSS payload in the email field does not execute", async ({ page }) => {
    const login = new LoginPage(page);

    await test.step("Stub /auth/v1/token to return 400 so the error path is exercised", async () => {
      await stubTokenError(page, 400, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      });
    });

    await test.step("Navigate to /login", async () => {
      await login.open();
    });

    await test.step("Type the XSS payload into the email field and submit", async () => {
      await login.fillEmail("<script>window.__xss=1</script>");
      await login.fillPassword("any-password");
      await login.submitButton.click();
    });

    await test.step("Verify window.__xss is undefined (script did not execute)", async () => {
      const xssValue = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__xss,
      );
      expect(xssValue).toBeUndefined();
    });

    await test.step("Verify the error message element renders plain text, not injected HTML", async () => {
      await expect(login.errorMessage).toBeVisible();
      await expect(login.errorMessage).toHaveText("Neplatný e-mail alebo heslo.");
    });
  });

  // TC-18: Network offline during submit shows the generic error
  test("TC-18 — aborted network request during submit shows the generic error", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await test.step("Stub /auth/v1/token to abort the request (simulate offline)", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.abort();
      });
    });

    await test.step("Navigate to /login and fill credentials", async () => {
      await login.open();
      await login.fillAndSubmit("educator@e2e.test", "correct-password");
    });

    await test.step("Verify the generic error message is visible", async () => {
      await expect(login.errorMessage).toBeVisible();
      await expect(login.errorMessage).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the submit button returns to enabled state after the failure", async () => {
      await expect(login.submitButton).toBeEnabled();
    });
  });
});
