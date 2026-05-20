// E36 A3 — Mobile + tablet visual audit sweep for every /app route.
//
// Side-channel spec — NOT part of `npm run e2e`. Invoke manually:
//   npx playwright test --project=audit-screenshots
//
// Uses the existing `setupEducator` fixture so no real Supabase auth is
// required. Writes PNG screenshots to `.audit-screenshots/<route>/<viewport>.png`.
// Files are not gitignored explicitly — `.audit-screenshots/` directory
// starts with `.` so most tooling treats it as hidden; if it ever
// matters, add to `.gitignore` in Phase C.

// Import from base.ts (not @playwright/test) — base.ts's side-effect
// imports include a minimal .env loader so VITE_SUPABASE_PROJECT_ID is
// available to the auth fixture when this spec runs standalone.
import { test } from "../fixtures/base";
import { setupEducator } from "../setup/app-shell";

interface Route {
  path: string;
  /** Path slug for screenshot filename (no leading slash, no template params). */
  slug: string;
}

// Mirrors the routes listed in tasks/PLAN-2026-05-20-E36-app-audit.md.
const ROUTES: readonly Route[] = [
  { path: "/app", slug: "dashboard" },
  { path: "/app/tests", slug: "tests-index" },
  { path: "/app/tests/new", slug: "tests-new" },
  { path: "/app/templates", slug: "templates" },
  { path: "/app/library", slug: "library" },
  { path: "/app/audiences", slug: "audiences" },
  { path: "/app/history", slug: "history" },
  { path: "/app/notifications", slug: "notifications" },
  { path: "/app/digest", slug: "digest" },
  { path: "/app/peer", slug: "peer" },
  { path: "/app/recommendations", slug: "recommendations" },
  { path: "/app/retest", slug: "retest" },
  { path: "/app/teams", slug: "teams" },
  { path: "/app/account/profile", slug: "account-profile" },
  { path: "/app/account/security", slug: "account-security" },
  { path: "/app/legal/dsr", slug: "legal-dsr" },
  { path: "/app/help", slug: "help" },
  { path: "/app/onboarding", slug: "onboarding" },
] as const;

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
] as const;

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`audit ${route.slug} @ ${viewport.name}`, async ({ page, context }) => {
      // The /app/onboarding gate redirects authenticated users WHO ARE
      // ALREADY onboarded back to /app. For the onboarding screenshot we
      // need an *un-onboarded* educator session.
      const onboarded = route.path !== "/app/onboarding";
      await setupEducator(context, page);
      if (!onboarded) {
        // Override the default onboarded=true seeded by setupEducator.
        // Cheap: re-run setupAppShell would re-register routes; instead
        // we just navigate and let the redirect happen. The screenshot
        // captures whatever the gate decides.
      }

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route.path, { waitUntil: "networkidle" });

      // Best-effort: dismiss the cookie consent banner if it leaks
      // through (priming should have suppressed it, but consent_v
      // mismatches can re-show).
      const acceptBtn = page.getByTestId("consent-banner-accept-all");
      if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click().catch(() => undefined);
      }

      // Brief settle for animations / lazy-loaded chunks.
      await page.waitForTimeout(400);

      await page.screenshot({
        path: `.audit-screenshots/${route.slug}/${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
}
