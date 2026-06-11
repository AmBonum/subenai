import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { buildSupabaseErrorResponse } from "../../mocks/supabase";
import { seedSession, seedTest } from "../../seed";
import { AppDashboardPage } from "../../poms/app/AppDashboardPage";

test.describe("/app dashboard", () => {
  // TC-01: Empty state — no tests, sessions, or respondents seeded.
  test("TC-01: empty state renders when no data is seeded", async ({ page }) => {
    await setupEducator(page.context(), page, {
      tables: {
        tests: [],
        sessions: [],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify the empty-state card is visible", async () => {
      await expect(dash.emptyState).toBeVisible();
    });

    await test.step("Verify the empty-state title reads 'Tu sa zobrazia výsledky tvojich tried.'", async () => {
      await expect(dash.emptyTitle).toHaveText("Tu sa zobrazia výsledky tvojich tried.");
    });

    await test.step("Verify the primary and secondary CTAs are visible", async () => {
      await expect(dash.emptyCtaPrimary).toBeVisible();
      await expect(dash.emptyCtaSecondary).toBeVisible();
    });

    await test.step("Verify the stat-cards section is NOT rendered in the empty branch", async () => {
      await expect(dash.statsSection).toHaveCount(0);
    });
  });

  // TC-02: Populated state — 4 StatCards visible.
  test("TC-02: populated state renders all four StatCards", async ({ page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
      title: "E2E Published Test",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [
          seedSession({
            test_id: test1.id,
            status: "completed",
            started_at: "2026-05-15T00:00:00.000Z",
            finished_at: "2026-05-15T00:30:00.000Z",
            score: 75,
          }),
        ],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify all four StatCards are visible", async () => {
      await expect(dash.statTests).toBeVisible();
      await expect(dash.statSessions).toBeVisible();
      await expect(dash.statRespondents).toBeVisible();
      await expect(dash.statCompletion).toBeVisible();
    });
  });

  // TC-03: StatCard values match seeded counts.
  test("TC-03: StatCard values reflect seeded counts", async ({ page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
      title: "E2E Published Test",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [
          seedSession({
            test_id: test1.id,
            status: "completed",
            started_at: "2026-05-15T00:00:00.000Z",
            finished_at: "2026-05-15T00:30:00.000Z",
            score: 75,
          }),
        ],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify active-tests value is 1", async () => {
      await expect(dash.statTestsValue).toHaveText("1");
    });

    await test.step("Verify sessions value is 1", async () => {
      await expect(dash.statSessionsValue).toHaveText("1");
    });

    await test.step("Verify completion-rate value is 100%", async () => {
      await expect(dash.statCompletionValue).toHaveText("100%");
    });
  });

  // TC-04: Page header eyebrow and title visible.
  test("TC-04: page header shows eyebrow 'Prehľad' and title 'Môj prehľad'", async ({ page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify the eyebrow label reads 'Prehľad'", async () => {
      await expect(dash.pageHeaderEyebrow).toHaveText("Prehľad");
    });

    await test.step("Verify the page heading contains 'Môj prehľad'", async () => {
      await expect(dash.pageHeaderTitle).toContainText("Môj prehľad");
    });
  });

  // TC-05: Empty-state CTAs link to the correct routes.
  test("TC-05: empty-state CTAs link to /app/tests/new and /app/templates", async ({ page }) => {
    await setupEducator(page.context(), page, {
      tables: {
        tests: [],
        sessions: [],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify primary CTA links to /app/tests/new", async () => {
      await expect(dash.emptyCtaPrimary).toHaveAttribute("href", "/app/tests/new");
    });

    await test.step("Verify secondary CTA links to /app/templates", async () => {
      await expect(dash.emptyCtaSecondary).toHaveAttribute("href", "/app/templates");
    });
  });

  // TC-06: Display name shown in the shell header matches the seeded profile.
  test("TC-06: shell header shows the educator display name", async ({ page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify the shell header user name shows 'educator'", async () => {
      await expect(dash.shellHeaderUserName).toHaveText("educator");
    });
  });

  // TC-07: Drafts card visible when a draft test is seeded.
  test("TC-07: drafts card renders when a draft test is seeded", async ({ page }) => {
    const draft = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "draft",
      title: "My Draft Test",
      updated_at: "2026-05-19T00:00:00.000Z",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [draft],
        sessions: [],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify the populated branch is shown (not the empty state)", async () => {
      await expect(dash.emptyState).toHaveCount(0);
    });

    await test.step("Verify the drafts card is visible", async () => {
      await expect(dash.draftsCard).toBeVisible();
    });

    await test.step("Verify the draft row for the seeded test is visible", async () => {
      await expect(dash.draftsRow(draft.id)).toBeVisible();
    });
  });

  // TC-08: Page <title> reads "Môj prehľad · SubenAI".
  test("TC-08: page title reads 'Môj prehľad · SubenAI'", async ({ page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [],
        respondents: [],
      },
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard", async () => {
      await dash.open();
    });

    await test.step("Verify the document title reads 'Môj prehľad · SubenAI'", async () => {
      await expect(page).toHaveTitle("Môj prehľad · SubenAI");
    });
  });

  // TC-09: Loading skeleton shows while the stats queries are in flight.
  test("TC-09: loading skeleton shows while stats queries are in flight", async ({ page }) => {
    await setupEducator(page.context(), page, {
      tables: { tests: [], sessions: [], respondents: [] },
    });

    // Deterministic gate — hold every /sessions read until the spec has
    // observed the skeleton, then release. No timeouts involved.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/rest/v1/sessions**", async (route) => {
      await gate;
      await route.fallback();
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard with the sessions queries held", async () => {
      await dash.open();
    });

    await test.step("Verify the loading skeleton is visible while queries are pending", async () => {
      await expect(dash.loadingSkeleton).toBeVisible();
      await expect(dash.statsSection).toHaveCount(0);
      await expect(dash.errorState).toHaveCount(0);
    });

    await test.step("Release the gate and verify the skeleton resolves to the empty branch", async () => {
      release();
      await expect(dash.emptyState).toBeVisible();
      await expect(dash.loadingSkeleton).toHaveCount(0);
    });
  });

  // TC-10: Stats failure shows the error card; retry recovers after the
  // mock is restored.
  test("TC-10: stats query failure shows the Slovak error card and retry recovers", async ({
    page,
  }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
      title: "E2E Published Test",
    });
    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [
          seedSession({
            test_id: test1.id,
            status: "completed",
            started_at: "2026-05-15T00:00:00.000Z",
            finished_at: "2026-05-15T00:30:00.000Z",
            score: 75,
          }),
        ],
        respondents: [],
      },
    });

    // Fail-mode flag: while true, every /sessions read 500s; once
    // flipped, requests fall through to the healthy mockSupabase layer.
    let fail = true;
    await page.route("**/rest/v1/sessions**", async (route) => {
      if (!fail) {
        await route.fallback();
        return;
      }
      const response = buildSupabaseErrorResponse({
        status: 500,
        code: "XX000",
        message: "internal error (e2e simulated)",
      });
      await route.fulfill({
        status: response.status,
        headers: response.headers,
        body: response.body,
      });
    });

    const dash = new AppDashboardPage(page);

    await test.step("Open the dashboard with failing sessions queries", async () => {
      await dash.open();
    });

    await test.step("Verify the Slovak error card renders after retries exhaust", async () => {
      // React Query retries 3× with exponential backoff (~7 s) before
      // surfacing the error branch — hence the extended timeout.
      await expect(dash.errorState).toBeVisible({ timeout: 20_000 });
      await expect(dash.errorTitle).toHaveText("Prehľad sa nepodarilo načítať.");
      await expect(dash.errorState).toContainText("Skontroluj pripojenie a skús to znova.");
    });

    await test.step("Verify the retry button is visible with the Slovak label", async () => {
      await expect(dash.errorRetry).toBeVisible();
      await expect(dash.errorRetry).toHaveText("Skúsiť znova");
    });

    await test.step("Restore the mock, click retry and verify the happy dashboard", async () => {
      fail = false;
      await dash.errorRetry.click();
      await expect(dash.statsSection).toBeVisible({ timeout: 20_000 });
      await expect(dash.errorState).toHaveCount(0);
      await expect(dash.statTestsValue).toHaveText("1");
    });
  });
});
