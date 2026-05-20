import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config with FOUR projects:
 *
 *   integration         — API-level tests (no browser). Live in
 *                         e2e/integration/. Use `request` fixture from
 *                         "@playwright/test"; do NOT touch the `page`
 *                         fixture from these tests.
 *
 *   e2e-chromium        — Desktop Chrome browser tests. Live in
 *                         e2e/specs/. Use composed `test` fixture from
 *                         `e2e/fixtures/base.ts`.
 *
 *   e2e-mobile-chromium — Same specs as e2e-chromium but emulating
 *                         Pixel 7 (412×915, touch, mobile UA). Only
 *                         runs specs tagged with the `@mobile` annotation
 *                         (see `e2e/specs/app/**` for usage). Wired up
 *                         in E36 B1 (2026-05-20) to cover the AppShell
 *                         mobile drawer and per-page responsive
 *                         contracts.
 *
 *   e2e-tablet-chromium — Same specs as e2e-chromium but emulating
 *                         iPad Pro 11 (834×1194, touch). Tagged with
 *                         `@tablet`.
 *
 * Run a subset:
 *   npx playwright test --project=integration
 *   npx playwright test --project=e2e-chromium
 *   npx playwright test --project=e2e-mobile-chromium
 *   npx playwright test --project=e2e-tablet-chromium
 *   npm run e2e            # all projects
 *
 * BASE_URL override:
 *   BASE_URL=https://subenai.sk npm run e2e
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "integration",
      testDir: "./e2e/integration",
      // No `devices` → no browser launched. `request` fixture works on
      // the bare config — keeps these tests fast and stable in CI.
      use: { baseURL: BASE_URL },
    },
    {
      name: "e2e-chromium",
      testMatch: ["e2e/specs/**/*.spec.ts"],
      // WIP: fixtures podakovanie / stripeCheckout not yet wired into base.ts. Unblock by adding them to e2e/fixtures/base.ts or by deleting this testIgnore once fixtures land.
      testIgnore: ["e2e/specs/sponsorship/podpora-donate-flow.spec.ts"],
      // Mobile- and tablet-scoped assertions (drawer trigger visible,
      // invite form stacked) only hold at <lg viewports — exclude them
      // here so the desktop project does not try to assert against a
      // `display:none` element. Those tests run exclusively on
      // `e2e-mobile-chromium` / `e2e-tablet-chromium` below.
      grepInvert: /@(mobile|tablet)/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "e2e-mobile-chromium",
      testMatch: ["e2e/specs/**/*.spec.ts"],
      // Same WIP carve-out as `e2e-chromium` — the sponsorship spec
      // expects fixtures not yet composed into base.ts and fails at
      // compile time on every project that picks it up.
      testIgnore: ["e2e/specs/sponsorship/podpora-donate-flow.spec.ts"],
      // Only run specs that opt-in via the `@mobile` tag (see
      // `e2e/specs/app/{shell,teams,…}.spec.ts` for usage). Default is
      // to skip mobile-viewport for every legacy spec until it's been
      // audited (E36 B2).
      grep: /@mobile/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "e2e-tablet-chromium",
      testMatch: ["e2e/specs/**/*.spec.ts"],
      testIgnore: ["e2e/specs/sponsorship/podpora-donate-flow.spec.ts"],
      grep: /@tablet/,
      use: { ...devices["iPad Pro 11"] },
    },
    {
      name: "audit-screenshots",
      // Side-channel project for the E36 A3 visual audit. NOT part of
      // `npm run e2e`; invoked manually with
      //   npx playwright test --project=audit-screenshots
      // Sweeps every /app route at mobile + tablet viewports and writes
      // PNGs to `.audit-screenshots/`. Uses the existing setupAppShell
      // fixture so no real Supabase auth is needed.
      testMatch: ["e2e/audit/**/*.audit.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Day-to-day: leave webServer undefined and start the stack manually
  // (npm run dev:api + npm run dev) so HMR + console output stay in your
  // terminals. In CI we boot `vite preview` against the built bundle —
  // faster than HMR and no need for the API mock dev server.
  //
  // SKIP_WEBSERVER=1 disables the webServer even in CI. Use this when:
  //   - the suite hits a remote BASE_URL (preview deploy / staging) and
  //     doesn't need a local server, OR
  //   - the job runs only the `integration` project, which does not build
  //     the bundle and would otherwise fail with "Timed out waiting for
  //     config.webServer" because there's no `dist/` to preview.
  webServer:
    process.env.CI && !process.env.SKIP_WEBSERVER
      ? {
          command: "npm run preview",
          url: BASE_URL,
          reuseExistingServer: false,
          timeout: 120_000,
        }
      : undefined,
});
