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
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Uncomment when you want Playwright to spin Vite on its own. For day-to-day
  // testing keep it commented and start the stack manually (npm run dev:api +
  // npm run dev) — that way HMR + console output stay in your terminals.
  // webServer: {
  //   command: "npm run dev",
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  // },
});
