// E49 Phase 1c-4 — prod-smoke canary spec.
//
// Drives the real `/app/tests/*` surface against PRODUCTION subenai.sk +
// production Supabase, using the deterministic test owner TU-A
// (`e2e-e49-educator-a@subenai.test`) and the seeded `e2e-e49-prodsmoke-*`
// canary test. Seed lives in `supabase/scripts/seed-e49-prodsmoke-data.sql`
// (idempotent); cleanup lives in `.github/workflows/e49-prod-smoke.yml`
// (always-run teardown psql step).
//
// Trigger: workflow_dispatch + push to main on the paths listed in
// `.github/workflows/e49-prod-smoke.yml`. Never run locally except via
// CI_PROD_SMOKE=1 — the spec mutates state on prod Supabase if a write
// path is added later.
//
// Tests 8 user-visible contracts (PS-01..PS-08). Wall budget <90s for the
// whole describe block; chromium-only per `playwright.config.ts`.

import { test, expect } from "@playwright/test";
import { E49ProdSmokePage, E49_PRODSMOKE } from "../../poms/prod-smoke/E49ProdSmokePage";

test.describe.configure({ mode: "serial" });

test.skip(
  !process.env.CI_PROD_SMOKE,
  "prod smoke only — set CI_PROD_SMOKE=1 to enable (hits production)",
);

// The TU-A password was rotated out of the repo (2026-06-12 security
// audit) — it now arrives only via the E2E_E49_PROD_PASSWORD secret.
test.skip(
  !process.env.E2E_E49_PROD_PASSWORD,
  "E2E_E49_PROD_PASSWORD not set — TU-A credentials come from 1Password / the GitHub Actions secret, never the repo",
);

test.describe("E49 prod-smoke — /app/tests respondent drill-down", () => {
  test("PS-01: TU-A signs in via /login and lands inside the app shell", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();

    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });
  });

  test("PS-02: /app/tests index lists the canary row", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });

    await pom.gotoTestsIndex();

    await expect(pom.testsIndexRoot).toBeVisible({ timeout: 15_000 });
    await expect(pom.canaryRow).toBeVisible();
  });

  test("PS-03: Opening the canary renders Results-tab KPI cards", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });

    await pom.gotoCanaryResults();

    await expect(pom.sessionsListRoot).toBeVisible({ timeout: 15_000 });
    await expect(pom.kpiTotal).toContainText("Spolu respondentov");
    await expect(pom.kpiCompleted).toContainText("Dokončené");
    await expect(pom.kpiAvgScore).toContainText("Priemerné skóre");
  });

  test("PS-04: Sessions list renders at least one row", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });
    await pom.gotoCanaryResults();
    await expect(pom.sessionsListRoot).toBeVisible({ timeout: 15_000 });

    const rowCount = await pom.sessionRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test("PS-05: Click 'Otvoriť detail' opens the side-sheet", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });
    await pom.gotoCanaryResults();
    await expect(pom.sessionsListRoot).toBeVisible({ timeout: 15_000 });

    await pom.rowOpen(E49_PRODSMOKE.sessions.completedNamed).click();

    await expect(pom.sheetRoot).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(
      new RegExp(
        `/app/tests/${E49_PRODSMOKE.testId}/sessions/${E49_PRODSMOKE.sessions.completedNamed}`,
      ),
    );
  });

  test("PS-06: Closing the side-sheet returns to ?tab=results", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });
    await pom.gotoCanaryResults();
    await expect(pom.sessionsListRoot).toBeVisible({ timeout: 15_000 });
    await pom.rowOpen(E49_PRODSMOKE.sessions.completedNamed).click();
    await expect(pom.sheetRoot).toBeVisible({ timeout: 10_000 });

    await pom.sheetClose.click();

    await expect(pom.sheetRoot).toBeHidden({ timeout: 10_000 });
    await expect(page).toHaveURL(/\?tab=results$/);
  });

  test("PS-07: CSV export endpoint responds 200 with attachment headers", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });
    await pom.gotoCanaryResults();
    await expect(pom.sessionsListRoot).toBeVisible({ timeout: 15_000 });

    // Wait for the network response to the CSV endpoint; the button click
    // triggers a `fetch` inside `useExportSessionsCsv`. The endpoint URL
    // is the only stable channel — the download blob path varies per
    // browser environment.
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/tests/export-sessions") && resp.request().method() === "GET",
      { timeout: 20_000 },
    );

    await pom.exportCsvButton.click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("text/csv");
    const disposition = response.headers()["content-disposition"] ?? "";
    expect(disposition).toContain("attachment");
  });

  test("PS-08: Header logout signs out cleanly", async ({ page }) => {
    const pom = new E49ProdSmokePage(page);

    await pom.gotoLogin();
    await pom.signInAsOwner();
    await expect(pom.shellRoot).toBeVisible({ timeout: 20_000 });

    await pom.headerLogout.click();

    // After sign-out the user is redirected to /login. We assert on the
    // login form mount rather than the URL alone — a stale shell DOM with
    // a redirect-in-flight would falsely pass a URL check.
    await expect(pom.loginEmail).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
