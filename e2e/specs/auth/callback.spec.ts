import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { AuthCallbackPage } from "../../poms/auth/AuthCallbackPage";

// This spec must run against the wrangler/Cloudflare Pages dev server
// (port 8788), NOT the Vite dev server (8080). The callback page calls
// `navigate()` from inside `useEffect` + `setTimeout` (post-exchange
// redirect, error redirect). In Vite's CSR-only dev mode that programmatic
// navigation silently no-ops; the URL never changes, so URL assertions
// hang. On the wrangler runtime the router behaves correctly. Verified
// 2026-05-19 (9/17 fail on 8080, 17/17 pass on 8788).
//
// Start the wrangler server with: npm run dev:api
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

const ONBOARDED_AT = "2026-05-01T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Route intercept helpers — registered BEFORE navigation in each test
// ---------------------------------------------------------------------------

/**
 * Stub POST /auth/v1/token to return a successful EDUCATOR_SESSION immediately.
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
 * Stub POST /auth/v1/token with a configurable delay before returning
 * EDUCATOR_SESSION. Also counts each intercepted request so the caller
 * can assert on the total.
 */
async function stubTokenDelayed(
  page: import("@playwright/test").Page,
  delayMs: number,
  requestLog: { count: number },
) {
  await page.route("**/auth/v1/token**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    requestLog.count++;
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EDUCATOR_SESSION),
    });
  });
}

/**
 * Stub POST /auth/v1/token with an HTTP error.
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
      body: JSON.stringify(body ?? {}),
    });
  });
}

/**
 * Stub POST /auth/v1/token to abort the request (simulates offline).
 */
async function stubTokenAbort(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/token**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.abort();
  });
}

/**
 * Stub GET /auth/v1/user (used by supabase.auth.getSession) to return the
 * educator user, so the session check after exchangeCodeForSession succeeds.
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

/**
 * Stub GET /rest/v1/rpc/has_role to return false (non-admin user).
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
 * Stub GET /rest/v1/profile_preferences to simulate an onboarded user.
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

// ---------------------------------------------------------------------------

test.describe("Auth callback page — happy paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Loading state is visible immediately on mount before exchange completes
  test("TC-01: Loading state is visible immediately on mount before exchange completes", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up delayed token exchange intercept (500 ms) before navigation", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EDUCATOR_SESSION),
        });
      });
    });

    await test.step("Navigate to /auth/callback?code=demo-code", async () => {
      void page.goto("/auth/callback?code=demo-code");
    });

    await test.step("Verify the loading paragraph is visible before the delay elapses", async () => {
      await expect(callback.loading).toBeVisible({ timeout: 3000 });
      await expect(callback.loading).toHaveText("Overujem prihlásenie...");
    });

    await test.step("Verify the error paragraph is not in the DOM during the loading state", async () => {
      await expect(callback.error).toBeHidden();
    });

    await test.step("Verify the page title is 'Prihlasujem · SubenAI'", async () => {
      await expect(page).toHaveTitle("Prihlasujem · SubenAI");
    });
  });

  // TC-02: Valid PKCE code exchange routes a regular onboarded user to /app
  test("TC-02: Valid PKCE code exchange routes a regular onboarded user to /app", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up successful token exchange, auth user, has_role, and profile_preferences intercepts", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /auth/callback?code=valid-code", async () => {
      await callback.open("?code=valid-code");
    });

    await test.step("Verify the browser navigates to /app", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 8000 });
    });

    await test.step("Verify the error paragraph never appeared during the transition", async () => {
      await expect(callback.error).toBeHidden();
    });
  });

  // TC-03: Explicit ?redirect path overrides role-based routing
  test("TC-03: Explicit ?redirect path overrides role-based routing", async ({ page }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up successful token exchange, auth user, has_role, and profile_preferences intercepts", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      // has_role IS called by the SiteHeader's useAuth hook after the session is
      // established — this is expected. Stub it to return non-admin so the
      // header renders correctly without hanging.
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /auth/callback?code=valid-code&redirect=/forgot-password (public route — no beforeLoad guard)", async () => {
      await callback.open("?code=valid-code&redirect=/forgot-password");
    });

    await test.step("Verify the browser navigates to /forgot-password (explicit redirect wins over decidePostLoginTarget)", async () => {
      // The callback's 'if (search.redirect && search.redirect.startsWith("/"))'
      // guard fires and calls navigate({ to: "/forgot-password" }) directly,
      // before decidePostLoginTarget is ever invoked. The final URL proves this:
      // decidePostLoginTarget for a non-admin onboarded user would route to /app,
      // not /forgot-password.
      await expect(page).toHaveURL(/\/forgot-password/, { timeout: 8000 });
    });

    await test.step("Verify the error element never appeared (exchange succeeded)", async () => {
      await expect(callback.error).toBeHidden();
    });
  });

  // TC-04: Provider error param shows error UI then redirects to /login
  test("TC-04: Provider error param shows error UI then redirects to /login", async ({ page }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Navigate to /auth/callback?error=access_denied&error_description=User+cancelled+the+flow", async () => {
      await callback.open("?error=access_denied&error_description=User+cancelled+the+flow");
    });

    await test.step("Verify the error paragraph is visible with the generic error text", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the loading paragraph is no longer in the DOM", async () => {
      await expect(callback.loading).toBeHidden();
    });

    await test.step("Verify the browser navigates to /login after approximately 1.5 seconds", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 4000 });
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Auth callback page — negative scenarios", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-05: Failed code exchange (invalid code) shows error UI then redirects to /login
  test("TC-05: Failed code exchange (invalid code) shows error UI then redirects to /login", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up token exchange intercept returning HTTP 400 invalid_grant before navigation", async () => {
      await stubTokenError(page, 400, {
        error: "invalid_grant",
        error_description: "Invalid code",
      });
    });

    await test.step("Navigate to /auth/callback?code=bad-code", async () => {
      await callback.open("?code=bad-code");
    });

    await test.step("Verify the error paragraph is visible with the generic error text", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the browser navigates to /login after approximately 1.5 seconds", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 4000 });
    });
  });

  // TC-06: No code and no session — bare callback URL shows error then redirects
  test("TC-06: No code and no session — bare callback URL shows error then redirects to /login", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up GET /auth/v1/user intercept returning null session before navigation", async () => {
      await page.route("**/auth/v1/user**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { session: null }, error: null }),
        });
      });
    });

    await test.step("Navigate to /auth/callback with no query params", async () => {
      await callback.open();
    });

    await test.step("Verify the error paragraph is visible with the generic error text", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the browser navigates to /login after approximately 1.5 seconds", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 4000 });
    });
  });

  // TC-07: Token exchange returns a 500 server error — error UI shown, no crash
  test("TC-07: Token exchange returns a 500 server error — error UI shown, no crash", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);
    const consoleErrors: string[] = [];

    await test.step("Register console error listener and HTTP 500 token intercept before navigation", async () => {
      page.on("pageerror", (err) => consoleErrors.push(err.message));
      await stubTokenError(page, 500);
    });

    await test.step("Navigate to /auth/callback?code=any-code", async () => {
      await callback.open("?code=any-code");
    });

    await test.step("Verify the error paragraph is visible with the generic error text", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify no unhandled JavaScript exception was recorded", async () => {
      expect(consoleErrors).toHaveLength(0);
    });

    await test.step("Verify the browser navigates to /login after approximately 1.5 seconds", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 4000 });
    });
  });

  // TC-08: Network abort during exchange shows error UI, does not hang
  test("TC-08: Network abort during exchange shows error UI, does not hang", async ({ page }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up token exchange intercept that aborts the request before navigation", async () => {
      await stubTokenAbort(page);
    });

    await test.step("Navigate to /auth/callback?code=any-code", async () => {
      await callback.open("?code=any-code");
    });

    await test.step("Verify the error paragraph is visible with the generic error text", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the browser navigates to /login after approximately 1.5 seconds", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 4000 });
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Auth callback page — edge cases", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-09: startedRef invariant — exchangeCodeForSession fires exactly once despite re-renders
  test("TC-09: startedRef invariant — exchangeCodeForSession fires exactly once despite re-renders", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);
    const requestLog = { count: 0 };

    await test.step("Set up 200 ms delayed token exchange intercept that counts requests before navigation", async () => {
      await stubTokenDelayed(page, 200, requestLog);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /auth/callback?code=valid-code", async () => {
      await callback.open("?code=valid-code");
    });

    await test.step("Wait for navigation to /app to complete", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 8000 });
    });

    await test.step("Wait an additional 500 ms for any potential deferred re-fires", async () => {
      await page.waitForTimeout(500);
    });

    await test.step("Verify the total number of requests to /auth/v1/token is exactly 1", async () => {
      expect(requestLog.count).toBe(1);
    });

    await test.step("Verify the browser URL is /app (not stuck in a redirect loop)", async () => {
      await expect(page).toHaveURL(/\/app/);
    });
  });

  // TC-10: ?redirect with an external origin is rejected — routing falls back to decidePostLoginTarget
  test("TC-10: ?redirect with an external origin is rejected — routing falls back to decidePostLoginTarget", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up successful token exchange, auth user, has_role, and profile_preferences intercepts", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /auth/callback?code=valid-code&redirect=https://evil.example.com/steal", async () => {
      await callback.open("?code=valid-code&redirect=https%3A%2F%2Fevil.example.com%2Fsteal");
    });

    await test.step("Verify the browser does NOT navigate to evil.example.com", async () => {
      await expect(page).not.toHaveURL(/evil\.example\.com/, { timeout: 8000 });
    });

    await test.step("Verify the browser navigates to /app (redirect guard rejected the absolute URL)", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 8000 });
    });
  });

  // TC-11: ?redirect with a relative path that does not start with / is also rejected
  test("TC-11: ?redirect with a non-rooted relative path is rejected — falls back to /app", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up successful token exchange, auth user, has_role, and profile_preferences intercepts", async () => {
      await stubTokenSuccess(page);
      await stubAuthUser(page);
      await stubHasRoleFalse(page);
      await stubProfilePrefsOnboarded(page);
    });

    await test.step("Navigate to /auth/callback?code=valid-code&redirect=evil-relative", async () => {
      await callback.open("?code=valid-code&redirect=evil-relative");
    });

    await test.step("Verify the browser navigates to /app (startsWith('/') guard rejected the non-rooted path)", async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 8000 });
    });

    await test.step("Verify the browser URL never contains 'evil-relative'", async () => {
      await expect(page).not.toHaveURL(/evil-relative/);
    });
  });

  // TC-12: Cancellation flag prevents navigate after component unmount
  test("TC-12: Cancellation flag prevents navigate after component unmount", async ({ page }) => {
    const callback = new AuthCallbackPage(page);
    const consoleWarnings: string[] = [];

    await test.step("Register console warning listener and 2000 ms delayed token intercept before navigation", async () => {
      page.on("console", (msg) => {
        if (msg.type() === "warning") consoleWarnings.push(msg.text());
      });
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EDUCATOR_SESSION),
        });
      });
    });

    await test.step("Navigate to /auth/callback?code=slow-code", async () => {
      void page.goto("/auth/callback?code=slow-code");
    });

    await test.step("Wait 200 ms then navigate away from the callback page (simulate user pressing back)", async () => {
      await page.waitForTimeout(200);
      await page.goto("/login");
    });

    await test.step("Wait for the 2000 ms exchange to complete and any deferred effects to settle", async () => {
      await page.waitForTimeout(2500);
    });

    await test.step("Verify no unmounted-component state-update warning was emitted", async () => {
      const unmountWarnings = consoleWarnings.filter((w) => w.includes("unmounted component"));
      expect(unmountWarnings).toHaveLength(0);
    });

    await test.step("Verify the browser URL is still /login and not /auth/callback", async () => {
      await expect(page).not.toHaveURL(/\/auth\/callback/);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // TC-13: Page is indexed as noindex — robots meta tag present
  test("TC-13: Page has noindex,nofollow robots meta tag", async ({ page }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up delayed token intercept so the page stays mounted long enough to read the head", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EDUCATOR_SESSION),
        });
      });
    });

    await test.step("Navigate to /auth/callback?code=any", async () => {
      void page.goto("/auth/callback?code=any");
      await expect(callback.loading).toBeVisible({ timeout: 3000 });
    });

    await test.step("Verify the <meta name='robots'> content is 'noindex,nofollow'", async () => {
      const robotsContent = await callback.robotsMetaContent();
      expect(robotsContent).toBe("noindex,nofollow");
    });
  });

  // TC-14: Error paragraph has role="alert" for screen-reader announcement
  test("TC-14: Error paragraph has role='alert' for screen-reader announcement", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Navigate to /auth/callback?error=access_denied&error_description=x", async () => {
      await callback.open("?error=access_denied&error_description=x");
    });

    await test.step("Verify the error paragraph is visible", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
    });

    await test.step("Verify the error element has role='alert' for assistive technology", async () => {
      await expect(callback.error).toHaveAttribute("role", "alert");
    });

    await test.step("Verify the error text is announced without requiring user focus", async () => {
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });
  });

  // TC-15: Keyboard-only user sees no focus trap — loading paragraph is not interactive
  test("TC-15: Keyboard-only user sees no focus trap in the loading state", async ({ page }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set up 2000 ms delayed token intercept before navigation", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EDUCATOR_SESSION),
        });
      });
    });

    await test.step("Navigate to /auth/callback?code=slow-code and verify loading state", async () => {
      void page.goto("/auth/callback?code=slow-code");
      await expect(callback.loading).toBeVisible({ timeout: 3000 });
    });

    await test.step("Press Tab and verify focus is not trapped inside auth-callback-root", async () => {
      await page.keyboard.press("Tab");
      const focusedTestId = await page.evaluate(
        () => document.activeElement?.getAttribute("data-testid") ?? null,
      );
      expect(focusedTestId).not.toBe("auth-callback-loading");
      expect(focusedTestId).not.toBe("auth-callback-root");
    });

    await test.step("Verify no interactive elements exist inside the callback root during loading", async () => {
      const interactiveCount = await callback.root.evaluate((el) => {
        return el.querySelectorAll("button, a, input, select, textarea, [tabindex]").length;
      });
      expect(interactiveCount).toBe(0);
    });
  });

  // TC-16: Mobile viewport (375×667) — loading paragraph is fully visible without horizontal scroll
  test("TC-16: Mobile viewport (375×667) — loading paragraph visible without horizontal scroll", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Set mobile viewport (iPhone SE: 375×667)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Set up 2000 ms delayed token intercept before navigation", async () => {
      await page.route("**/auth/v1/token**", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EDUCATOR_SESSION),
        });
      });
    });

    await test.step("Navigate to /auth/callback?code=slow-code and verify loading state is visible", async () => {
      void page.goto("/auth/callback?code=slow-code");
      await expect(callback.loading).toBeVisible({ timeout: 3000 });
    });

    await test.step("Verify the loading element is within the viewport bounds (no horizontal overflow)", async () => {
      const box = await callback.loading.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
    });

    await test.step("Verify no horizontal scrollbar is present on the body", async () => {
      const hasHorizontalScroll = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    });
  });

  // TC-17: XSS in error_description param does not execute injected script
  test("TC-17: XSS in error_description param does not execute injected script", async ({
    page,
  }) => {
    const callback = new AuthCallbackPage(page);

    await test.step("Navigate to /auth/callback?error=access_denied with a script XSS payload in error_description", async () => {
      await callback.open(
        "?error=access_denied&error_description=%3Cscript%3Ewindow.__xss%3D1%3C%2Fscript%3E",
      );
    });

    await test.step("Verify window.__xss is undefined (injected script did not execute)", async () => {
      const xssValue = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__xss,
      );
      expect(xssValue).toBeUndefined();
    });

    await test.step("Verify the error element displays the generic Slovak string, not the raw error_description", async () => {
      await expect(callback.error).toBeVisible({ timeout: 4000 });
      await expect(callback.error).toHaveText("Prihlásenie zlyhalo. Skús to znovu.");
    });
  });
});
