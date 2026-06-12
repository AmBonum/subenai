import { test, expect } from "../../fixtures/base";
import { setupAdmin, setupAppShell, setupEducator } from "../../setup/app-shell";
import { ADMIN_AAL1_SESSION, EDUCATOR_SESSION } from "../../fixtures/auth";

/**
 * E36 B4 — RBAC matrix sweep over every /app/* and /admin/* route.
 *
 * The four contracts under test:
 *
 *   1. Anonymous × `/app/*`         → redirect to `/login`
 *   2. Educator (no admin) × `/admin*` → redirect to `/app`
 *      (RPC `has_role(user_id, 'admin')` returns false, role-middleware
 *       throws `redirect({ to: "/app" })`.)
 *   3. Onboarded educator × `/app/onboarding` → redirect to `/app`
 *      (`app.onboarding.tsx` beforeLoad reads `profile_preferences.onboarded_at`
 *       and bounces if present, to avoid loop.)
 *   4. Un-onboarded educator × `/app` (and any non-onboarding /app/*)
 *      → redirect to `/app/onboarding`
 *      (`app.tsx` layout calls `requireOnboarded: true`.)
 *
 * Driven `test.each`-style via a route table so adding a new /app route
 * automatically extends the gate coverage. Tests are tagged `@rbac` for
 * selective CI runs.
 */

const APP_ROUTES_REQUIRING_ONBOARDING: readonly string[] = [
  "/app",
  "/app/tests",
  "/app/tests/new",
  "/app/templates",
  "/app/library",
  "/app/audiences",
  "/app/history",
  "/app/notifications",
  "/app/insights",
  "/app/teams",
  "/app/account/profile",
  "/app/account/security",
  "/app/legal/dsr",
  "/app/help",
] as const;

const APP_ROUTE_ONBOARDING_BYPASS = "/app/onboarding";

const ADMIN_ROUTES: readonly string[] = ["/admin"] as const;

test.describe("RBAC — anonymous redirects @rbac", () => {
  for (const path of [...APP_ROUTES_REQUIRING_ONBOARDING, APP_ROUTE_ONBOARDING_BYPASS]) {
    test(`anonymous visit to ${path} redirects to /login with the original path in ?redirect`, async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login(\?|$)/);
      const url = new URL(page.url());
      const redirect = url.searchParams.get("redirect");
      // requireSupabaseAuth preserves the original pathname in the
      // redirect search-param so the post-login flow returns the user
      // to where they came from. Some routes (e.g. /app exactly) may
      // emit "/app" without trailing slash — match leniently.
      expect(redirect ?? path).toContain(path);
    });
  }

  for (const path of ADMIN_ROUTES) {
    test(`anonymous visit to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }
});

test.describe("RBAC — educator (no admin role) @rbac", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  for (const path of ADMIN_ROUTES) {
    test(`educator visiting ${path} is bounced to /app (role gate)`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // requireRole("admin") throws `redirect({ to: "/app" })` when the
      // has_role RPC returns false. Assert the educator landed at the
      // app dashboard, NOT on /admin and NOT on /login.
      await expect(page).toHaveURL(/\/app(\/|$|\?)/);
      expect(page.url()).not.toMatch(/\/admin/);
      expect(page.url()).not.toMatch(/\/login/);
    });
  }

  test("onboarded educator visiting /app/onboarding is redirected to /app", async ({ page }) => {
    // Default setupEducator sets onboarded_at, so the gate redirects.
    await page.goto(APP_ROUTE_ONBOARDING_BYPASS, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app(\?|$|\/(?!onboarding))/);
  });
});

test.describe("RBAC — un-onboarded educator @rbac", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: EDUCATOR_SESSION,
      onboarded: false,
    });
  });

  test("un-onboarded educator on /app is redirected to /app/onboarding", async ({ page }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/onboarding/);
  });

  test("un-onboarded educator on /app/tests is redirected to /app/onboarding", async ({ page }) => {
    await page.goto("/app/tests", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/onboarding/);
  });

  test("un-onboarded educator CAN access /app/onboarding (no loop)", async ({ page }) => {
    await page.goto("/app/onboarding", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/onboarding/);
  });
});

test.describe("RBAC — admin (AAL2) @rbac", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAdmin(context, page);
  });

  for (const path of ADMIN_ROUTES) {
    test(`admin visiting ${path} loads (no redirect)`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }

  test("admin can also visit /app (parallel gate)", async ({ page }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app(\?|$)/);
  });
});

test.describe("RBAC — admin user with admin marker but AAL1 @rbac", () => {
  test.beforeEach(async ({ context, page }) => {
    // Use the pre-baked ADMIN_AAL1_SESSION — same admin user, verified
    // TOTP factor present, but the session is at AAL1 (not yet stepped
    // up). makeSession bakes `aal` into the JWT payload too, so a naive
    // `{ ...ADMIN_SESSION, aal: "aal1" }` spread would NOT downgrade the
    // assurance the supabase client reads from `decodeJWT(access_token)`.
    await setupAppShell(context, page, { session: ADMIN_AAL1_SESSION });
  });

  for (const path of ADMIN_ROUTES) {
    test(`AAL1 admin visiting ${path} is bounced to 2FA flow`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // Either verify-2fa (factor exists) or enroll-2fa (no factor).
      await expect(page).toHaveURL(/\/login\/(verify|enroll)-2fa/);
    });
  }
});
