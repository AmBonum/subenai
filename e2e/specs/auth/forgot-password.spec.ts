import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { ForgotPasswordPage } from "../../poms/auth/ForgotPasswordPage";

/**
 * Stub `POST /auth/v1/recover` with a successful empty response.
 */
async function stubRecoverSuccess(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/recover**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

/**
 * Stub `POST /auth/v1/recover` with a configurable delay, then success.
 */
async function stubRecoverDelayed(page: import("@playwright/test").Page, delayMs: number) {
  await page.route("**/auth/v1/recover**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

/**
 * Stub `POST /auth/v1/recover` with HTTP 500.
 */
async function stubRecoverError(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/recover**", async (route) => {
    if (route.request().method() !== "POST") {
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
 * Stub `POST /auth/v1/recover` to abort (simulate offline / network failure).
 */
async function stubRecoverAbort(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/recover**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.abort();
  });
}

// ---------------------------------------------------------------------------

test.describe("Forgot-password page — happy paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Page renders all required UI elements
  test("TC-01: Page renders all required UI elements", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Navigate to /forgot-password with no active session", async () => {
      await forgot.open();
    });

    await test.step("Verify the card heading 'Zabudnuté heslo' is visible", async () => {
      await expect(forgot.heading).toBeVisible();
      await expect(forgot.heading).toHaveText("Zabudnuté heslo");
    });

    await test.step("Verify the subtitle is visible", async () => {
      await expect(
        page.getByText("Zadaj e-mail a pošleme ti odkaz na obnovu hesla."),
      ).toBeVisible();
    });

    await test.step("Verify the e-mail input is visible and empty", async () => {
      await expect(forgot.emailInput).toBeVisible();
      await expect(forgot.emailInput).toHaveValue("");
    });

    await test.step("Verify the submit button is visible and disabled because the input is empty", async () => {
      await expect(forgot.submitButton).toBeVisible();
      await expect(forgot.submitButton).toBeDisabled();
    });

    await test.step("Verify the back-to-login link is visible with correct label", async () => {
      await expect(forgot.backToLoginLink).toBeVisible();
      await expect(forgot.backToLoginLink).toHaveText("Späť na prihlásenie");
    });

    await test.step("Verify no error element is present in the DOM", async () => {
      await expect(forgot.errorMessage).toBeHidden();
    });
  });

  // TC-02: Valid e-mail address transitions the page to the success state
  test("TC-02: Valid e-mail transitions the page to the success state", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Set up route intercept returning HTTP 200 before navigation", async () => {
      await stubRecoverSuccess(page);
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Type 'user@example.com' into the e-mail field", async () => {
      await forgot.fillEmail("user@example.com");
    });

    await test.step("Click the 'Poslať odkaz' submit button", async () => {
      await forgot.submitButton.click();
    });

    await test.step("Verify the form is replaced by the success panel", async () => {
      await expect(forgot.successPanel).toBeVisible();
      await expect(forgot.form).toBeHidden();
    });

    await test.step("Verify the success panel contains the heading 'Skontroluj si e-mail'", async () => {
      await expect(forgot.successPanel).toContainText("Skontroluj si e-mail");
    });

    await test.step("Verify the success panel contains the full body text", async () => {
      await expect(forgot.successPanel).toContainText(
        "Ak účet s týmto e-mailom existuje, do pár minút ti príde odkaz na obnovu. Skontroluj aj spam — odosielateľ je noreply@subenai.sk.",
      );
    });

    await test.step("Verify the success panel contains the back-to-login link", async () => {
      await expect(forgot.successToLoginLink).toBeVisible();
      await expect(forgot.successToLoginLink).toHaveText("Späť na prihlásenie");
    });
  });

  // TC-03: The redirectTo parameter points to /auth/reset-password
  test("TC-03: The redirectTo parameter in the Supabase call points to /auth/reset-password", async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    let capturedUrl: string | null = null;

    await test.step("Intercept /auth/v1/recover to capture the request URL before returning HTTP 200", async () => {
      await page.route("**/auth/v1/recover**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        // Supabase JS client sends redirectTo as a URL query parameter,
        // not in the POST body.
        capturedUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      });
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Enter a valid e-mail and click 'Poslať odkaz'", async () => {
      await forgot.fillAndSubmit("any@example.com");
    });

    await test.step("Verify the request URL contains redirect_to pointing to /auth/reset-password on localhost origin", async () => {
      await expect.poll(() => capturedUrl, { timeout: 5000 }).not.toBeNull();

      const reqUrl = new URL(capturedUrl ?? "");
      const redirectTo = decodeURIComponent(reqUrl.searchParams.get("redirect_to") ?? "");
      expect(redirectTo).toContain("/auth/reset-password");
      expect(redirectTo).toContain("http://localhost:8080");
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Forgot-password page — negative scenarios", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-04: Supabase returns a server error — generic error message shown, form kept in place
  test("TC-04: Supabase server error shows generic error message and keeps the form", async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover to return HTTP 500 before navigation", async () => {
      await stubRecoverError(page);
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Type a valid e-mail and click 'Poslať odkaz'", async () => {
      await forgot.fillAndSubmit("user@example.com");
    });

    await test.step("Verify the error element is visible with exact text", async () => {
      await expect(forgot.errorMessage).toBeVisible();
      await expect(forgot.errorMessage).toHaveText("Žiadosť zlyhala. Skús to znovu.");
    });

    await test.step("Verify the form remains in the DOM (no transition to success)", async () => {
      await expect(forgot.form).toBeVisible();
      await expect(forgot.successPanel).toBeHidden();
    });

    await test.step("Verify the browser URL stays at /forgot-password", async () => {
      await expect(page).toHaveURL(/\/forgot-password$/);
    });
  });

  // TC-05: Submit button is disabled while the field is empty
  test("TC-05: Submit button is disabled while the e-mail field is empty", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    let recoverRequestCount = 0;

    await test.step("Register a request counter for /auth/v1/recover", async () => {
      await page.route("**/auth/v1/recover**", async (route) => {
        recoverRequestCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      });
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Verify the submit button has the disabled attribute with empty field", async () => {
      await expect(forgot.submitButton).toBeDisabled();
    });

    await test.step("Verify clicking the disabled button does not dispatch a request", async () => {
      await forgot.submitButton.click({ force: true });
      expect(recoverRequestCount).toBe(0);
    });
  });

  // TC-06: Back-to-login link navigates to /login
  test("TC-06: Back-to-login link navigates to /login", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Click the 'Späť na prihlásenie' link", async () => {
      await forgot.backToLoginLink.click();
    });

    await test.step("Verify navigation to /login", async () => {
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  // TC-07: Typing a single character enables the submit button
  test("TC-07: Typing a single character enables the submit button", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Type the single character 'a' into the e-mail field", async () => {
      await forgot.fillEmail("a");
    });

    await test.step("Verify the submit button no longer has the disabled attribute", async () => {
      await expect(forgot.submitButton).toBeEnabled();
    });

    await test.step("Verify the button label reads 'Poslať odkaz' (not the in-flight label)", async () => {
      await expect(forgot.submitButton).toHaveText("Poslať odkaz");
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Forgot-password page — edge cases", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-08: Button label changes to "Posielam..." while the request is in flight
  test("TC-08: Button label changes to 'Posielam...' while the request is in flight", async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover with a 500 ms delay before navigation", async () => {
      await stubRecoverDelayed(page, 500);
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Type a valid e-mail and click 'Poslať odkaz'", async () => {
      await forgot.fillEmail("user@example.com");
      await forgot.submitButton.click();
    });

    await test.step("Verify the button label changes to 'Posielam...' while in flight", async () => {
      await expect(forgot.submitButton).toHaveText("Posielam...");
    });

    await test.step("Verify the button is disabled for the duration of the in-flight request", async () => {
      await expect(forgot.submitButton).toBeDisabled();
    });

    await test.step("Verify the page transitions to the success panel after the response arrives", async () => {
      await expect(forgot.successPanel).toBeVisible({ timeout: 5000 });
    });
  });

  // TC-09: Double-clicking submit does not send two requests
  test("TC-09: Double-clicking submit sends exactly one request", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    let requestCount = 0;

    await test.step("Stub /auth/v1/recover with a 300 ms delay, counting requests", async () => {
      await page.route("**/auth/v1/recover**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        requestCount++;
        await new Promise((r) => setTimeout(r, 300));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      });
    });

    await test.step("Navigate to /forgot-password and fill a valid e-mail", async () => {
      await forgot.open();
      await forgot.fillEmail("user@example.com");
    });

    await test.step("Click the submit button to start the in-flight request", async () => {
      await forgot.submitButton.click();
    });

    await test.step("Verify the button becomes disabled while in flight, then attempt a second click", async () => {
      // Wait for React to disable the button (submitting=true)
      await expect(forgot.submitButton).toBeDisabled();
      // Attempt a second click — Playwright will skip it because the
      // button is disabled, keeping the request count at 1.
      await forgot.submitButton.click({ force: false, timeout: 1000 }).catch(() => {
        // expected: click is rejected on a disabled button
      });
    });

    await test.step("Wait for the page to transition to the success panel", async () => {
      await expect(forgot.successPanel).toBeVisible({ timeout: 5000 });
    });

    await test.step("Verify exactly one request reached /auth/v1/recover", async () => {
      expect(requestCount).toBe(1);
    });
  });

  // TC-10: E-mail with leading and trailing whitespace is trimmed before submission
  test("TC-10: E-mail with surrounding whitespace is trimmed in the request body", async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    let capturedEmail: string | null = null;

    await test.step("Intercept /auth/v1/recover to capture the request body before navigation", async () => {
      await page.route("**/auth/v1/recover**", async (route) => {
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
          body: JSON.stringify({}),
        });
      });
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Type '  test@example.com  ' (two leading and two trailing spaces) into the e-mail field", async () => {
      await forgot.fillEmail("  test@example.com  ");
    });

    await test.step("Click 'Poslať odkaz'", async () => {
      await forgot.submitButton.click();
    });

    await test.step("Verify the captured POST body contains the trimmed e-mail", async () => {
      await expect.poll(() => capturedEmail, { timeout: 5000 }).toBe("test@example.com");
    });

    await test.step("Verify the page transitions to the success panel", async () => {
      await expect(forgot.successPanel).toBeVisible();
    });
  });

  // TC-11: Non-registered e-mail still shows the success state (no enumeration)
  test("TC-11: Non-registered e-mail shows the success state (anti-enumeration)", async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover to return HTTP 200 before navigation", async () => {
      await stubRecoverSuccess(page);
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Submit an address that does not belong to any account", async () => {
      await forgot.fillAndSubmit("nobody-registered@example.com");
    });

    await test.step("Verify the success panel appears with the same body text as TC-02", async () => {
      await expect(forgot.successPanel).toBeVisible();
      await expect(forgot.successPanel).toContainText(
        "Ak účet s týmto e-mailom existuje, do pár minút ti príde odkaz na obnovu.",
      );
    });

    await test.step("Verify no element in the DOM reveals that the account does not exist", async () => {
      await expect(forgot.errorMessage).toBeHidden();
    });
  });

  // TC-12: XSS payload in the e-mail field does not execute
  test("TC-12: XSS payload in the e-mail field does not execute", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover to return HTTP 500 to trigger the error path", async () => {
      await stubRecoverError(page);
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Type the XSS payload into the e-mail field and submit", async () => {
      await forgot.fillEmail("<script>window.__xss=1</script>");
      await forgot.submitButton.click();
    });

    await test.step("Verify window.__xss is undefined (script did not execute)", async () => {
      const xssValue = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__xss,
      );
      expect(xssValue).toBeUndefined();
    });

    await test.step("Verify the error element renders the Slovak text as plain text, not injected HTML", async () => {
      await expect(forgot.errorMessage).toBeVisible();
      await expect(forgot.errorMessage).toHaveText("Žiadosť zlyhala. Skús to znovu.");
    });
  });

  // TC-13: Network abort during submit shows the generic error and re-enables the button
  test("TC-13: Network abort shows the generic error and re-enables the submit button", async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover to abort the request before navigation", async () => {
      await stubRecoverAbort(page);
    });

    await test.step("Navigate to /forgot-password and fill a valid e-mail", async () => {
      await forgot.open();
      await forgot.fillEmail("user@example.com");
    });

    await test.step("Click 'Poslať odkaz' and trigger the network abort", async () => {
      await forgot.submitButton.click();
    });

    await test.step("Verify the error element shows 'Žiadosť zlyhala. Skús to znovu.'", async () => {
      await expect(forgot.errorMessage).toBeVisible();
      await expect(forgot.errorMessage).toHaveText("Žiadosť zlyhala. Skús to znovu.");
    });

    await test.step("Verify the submit button returns to its enabled, non-loading state", async () => {
      await expect(forgot.submitButton).toBeEnabled();
      await expect(forgot.submitButton).toHaveText("Poslať odkaz");
    });

    await test.step("Verify the form remains visible (no transition to success panel)", async () => {
      await expect(forgot.form).toBeVisible();
      await expect(forgot.successPanel).toBeHidden();
    });
  });

  // TC-14: Keyboard-only user can submit the form without a mouse
  test("TC-14: Keyboard-only user can submit the form without a mouse", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover to return HTTP 200 before navigation", async () => {
      await stubRecoverSuccess(page);
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Focus the e-mail field and type a valid address", async () => {
      await forgot.emailInput.focus();
      await forgot.emailInput.fill("keyboard@example.com");
    });

    await test.step("Press Tab to move focus to the submit button", async () => {
      await page.keyboard.press("Tab");
    });

    await test.step("Press Enter to activate the submit button", async () => {
      await page.keyboard.press("Enter");
    });

    await test.step("Verify a request was dispatched and the page transitions to the success panel", async () => {
      await expect(forgot.successPanel).toBeVisible({ timeout: 5000 });
    });
  });

  // TC-15: Success-state back-to-login link navigates to /login
  test("TC-15: Success-state back-to-login link navigates to /login", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Stub /auth/v1/recover to return HTTP 200 and reach the success state", async () => {
      await stubRecoverSuccess(page);
    });

    await test.step("Navigate to /forgot-password and submit to reach the success state", async () => {
      await forgot.open();
      await forgot.fillAndSubmit("user@example.com");
      await expect(forgot.successPanel).toBeVisible();
    });

    await test.step("Click the 'Späť na prihlásenie' link inside the success panel", async () => {
      await forgot.successToLoginLink.click();
    });

    await test.step("Verify navigation to /login", async () => {
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  // TC-16: Mobile viewport (375×667) keeps the card inside the viewport
  test("TC-16: Mobile viewport (375×667) keeps the card inside the viewport", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);

    await test.step("Set mobile viewport (iPhone SE: 375×667)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Navigate to /forgot-password", async () => {
      await forgot.open();
    });

    await test.step("Verify the card element is fully within the viewport width (no horizontal overflow)", async () => {
      const cardBox = await forgot.card.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.x).toBeGreaterThanOrEqual(0);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(375);
      }
    });

    await test.step("Verify the e-mail input, submit button, and back-to-login link are all visible", async () => {
      await expect(forgot.emailInput).toBeVisible();
      await expect(forgot.submitButton).toBeVisible();
      await expect(forgot.backToLoginLink).toBeVisible();
    });
  });

  // TC-17: Page is indexed with noindex,nofollow + correct title
  //
  // Re-enabled 2026-05-19 once `<HeadContent />` landed in __root.tsx —
  // the route's `head()` output is now applied to the DOM, so meta robots
  // and document title assertions pass.
  test("TC-17: Page has noindex,nofollow meta robots and the correct title", async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.open();
    const robotsContent = await forgot.robotsMetaContent();
    expect(robotsContent).toBe("noindex,nofollow");
    await expect(page).toHaveTitle("Zabudnuté heslo · SubenAI");
  });
});
