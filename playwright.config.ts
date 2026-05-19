import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config with TWO projects:
 *
 *   integration   — API-level tests (no browser). Live in e2e/integration/.
 *                   Use `request` fixture from "@playwright/test"; do NOT
 *                   touch the `page` fixture from these tests.
 *
 *   e2e-chromium  — browser tests using Chromium. Live in e2e/specs/.
 *                   Use the composed `test` fixture from
 *                   `e2e/fixtures/base.ts`.
 *
 * Run a subset:
 *   npx playwright test --project=integration
 *   npx playwright test --project=e2e-chromium
 *   npm run e2e            # both
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
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Day-to-day: leave webServer undefined and start the stack manually
  // (npm run dev:api + npm run dev) so HMR + console output stay in your
  // terminals. In CI we boot `vite preview` against the built bundle —
  // faster than HMR and no need for the API mock dev server.
  webServer: process.env.CI
    ? {
        command: "npm run preview",
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
