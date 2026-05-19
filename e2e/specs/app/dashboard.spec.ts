import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedSession, seedTest } from "../../seed";
import { AppDashboardPage } from "../../poms/app/AppDashboardPage";

// /app dashboard renders an empty-state card OR the populated layout.
// Stat cards (`app-dashboard-stat-card-*`) only show on the populated
// branch, so seed at least one test + one session.

test.describe("/app dashboard", () => {
  test.beforeEach(async ({ context, page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      status: "published",
      title: "E2E Published Test",
    });
    await setupEducator(context, page, {
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
  });

  test("renders all four StatCards", async ({ page }) => {
    const dash = new AppDashboardPage(page);
    await dash.open();
    await expect(dash.statTests).toBeVisible();
    await expect(dash.statSessions).toBeVisible();
    await expect(dash.statRespondents).toBeVisible();
    await expect(dash.statCompletion).toBeVisible();
  });
});
