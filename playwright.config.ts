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
 *
 * ENVIRONMENT MATRIX (which suites need which servers) — 2026-06-12:
 *
 *   vite dev :8080 (npm run dev)
 *     Default target for everything in e2e/specs/. Supabase REST/RPC and
 *     /api endpoints are stubbed in-page via e2e/mocks; vite proxies any
 *     UNMOCKED /api/* call to :8788 (vite.config.ts proxy).
 *
 *   wrangler pages dev :8788 (npm run dev:api — builds dist first)
 *     Real CF Functions runtime. REQUIRED by suites that exercise the
 *     Functions layer; these specs pin baseURL :8788 via test.use and
 *     SKIP LOUDLY when :8788 is down:
 *       auth/callback, auth/enroll-2fa, auth/verify-2fa,
 *       composer/round-trip, edu/schools-howitworks-contract,
 *       sponsorship (stripe flows additionally need npm run e2e:stripe).
 *     Caveat: with wrangler UP, specs that leave /api/* unmocked stop
 *     getting the fast proxy-ECONNREFUSED failure and start hitting real
 *     Functions (which then talk to real Supabase). Specs must mock every
 *     /api endpoint their page calls — never rely on the proxy being down.
 *
 *   One command, both servers, whole browser suite:
 *     npm run e2e:full      (E2E_SERVERS=1 → webServer array below)
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const PROD_URL = "https://subenai.sk";

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
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
      // E49 live-supabase specs need a running Supabase stack + preview
      // server + wrangler — they live in their own project below and
      // must be excluded from this unit-level integration suite.
      testIgnore: ["e2e/integration/e49/**"],
      use: { baseURL: BASE_URL },
    },
    {
      name: "e2e-chromium",
      testMatch: ["e2e/specs/**/*.spec.ts"],
      // WIP: fixtures podakovanie / stripeCheckout not yet wired into base.ts. Unblock by adding them to e2e/fixtures/base.ts or by deleting this testIgnore once fixtures land.
      testIgnore: [
        "e2e/specs/sponsorship/podpora-donate-flow.spec.ts",
        // prod-smoke specs hit https://subenai.sk directly; exclude them
        // from the local/CI projects so `npm run e2e` never fires them.
        "e2e/specs/prod-smoke/**",
      ],
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
      testIgnore: ["e2e/specs/sponsorship/podpora-donate-flow.spec.ts", "e2e/specs/prod-smoke/**"],
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
      testIgnore: ["e2e/specs/sponsorship/podpora-donate-flow.spec.ts", "e2e/specs/prod-smoke/**"],
      grep: /@tablet/,
      use: { ...devices["iPad Pro 11"] },
    },
    {
      // E48 incident response — prod smoke project.
      // Hits https://subenai.sk directly; exercises the real CF Function +
      // Supabase RPC stack. Never run by `npm run e2e` (separate workflow).
      //
      // Invoke manually:
      //   CI_PROD_SMOKE=1 npx playwright test --project=prod-smoke
      // Or via the scheduled GitHub Actions workflow:
      //   .github/workflows/prod-smoke.yml (workflow_dispatch + optional cron).
      name: "prod-smoke",
      testMatch: ["e2e/specs/prod-smoke/**/*.spec.ts"],
      retries: 2,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: PROD_URL,
      },
    },
    {
      // E49 Phase 1c-2 — setup project for `e2e-live-supabase`. Boots
      // `supabase start` (if needed), seeds users + data, rebuilds the
      // bundle against local Supabase if drift is detected, and starts
      // vite preview (8080) + wrangler pages dev (8788) child processes.
      // Implementation in `e2e/integration/e49/_setup.spec.ts` →
      // `e2e/global-setup.live-supabase.ts`.
      name: "e2e-live-supabase-setup",
      testMatch: /e2e\/integration\/e49\/_setup\.spec\.ts$/,
      teardown: "e2e-live-supabase-teardown",
    },
    {
      name: "e2e-live-supabase-teardown",
      testMatch: /e2e\/integration\/e49\/_teardown\.spec\.ts$/,
    },
    {
      // E49 Phase 1c-2 — integration tests against a local Supabase
      // stack + a built bundle + CF Pages Functions served by wrangler.
      //
      //   npx playwright test --project=e2e-live-supabase
      //
      // Specs auto-skip when no live state file is present, so the
      // suite is a no-op on machines without Docker.
      name: "e2e-live-supabase",
      testMatch: ["e2e/integration/e49/**/*.spec.ts"],
      testIgnore: ["e2e/integration/e49/_setup.spec.ts", "e2e/integration/e49/_teardown.spec.ts"],
      dependencies: ["e2e-live-supabase-setup"],
      fullyParallel: false,
      workers: 1,
      retries: 0,
      use: { baseURL: "http://localhost:8080" },
    },
    {
      // Visual regression. NOT part of `npm run e2e` (own workflow); served by
      // the same preview webServer the CI config boots. Baselines are
      // OS-specific — run with --update-snapshots in the CI OS (Linux) to seed
      // or refresh. See .github/workflows/visual-regression.yml.
      name: "visual",
      testMatch: ["e2e/visual/**/*.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
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
  // E2E_SERVERS=1 (npm run e2e:full) boots BOTH local servers — vite :8080
  // and wrangler :8788 — so the wrangler-bound suites (see the environment
  // matrix in the header) run instead of skipping. reuseExistingServer lets
  // it piggyback on servers you already have up. dev:api builds dist first,
  // hence the longer timeout.
  webServer: process.env.E2E_SERVERS
    ? [
        {
          command: "npm run dev",
          url: "http://localhost:8080",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: "npm run dev:api",
          url: "http://localhost:8788",
          reuseExistingServer: true,
          timeout: 300_000,
        },
      ]
    : process.env.CI && !process.env.SKIP_WEBSERVER
      ? {
          command: "npm run preview",
          url: BASE_URL,
          reuseExistingServer: false,
          timeout: 120_000,
        }
      : undefined,
});
