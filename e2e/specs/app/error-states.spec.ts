import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppShellPage } from "../../poms/app/AppShellPage";
import { AppTestsIndexPage } from "../../poms/app/AppTestsIndexPage";
import { AppAudiencesPage } from "../../poms/app/AppAudiencesPage";
import { AppNotificationsPage } from "../../poms/app/AppNotificationsPage";

/**
 * E36 B5 — Error-state contracts for /app/*.
 *
 * Tested guarantee: when a Supabase REST call returns a 4xx/5xx, the
 * page MUST still render — the shell, header, page-header, and empty
 * state remain mounted. No white screen, no React error boundary
 * surfacing the raw error to the user. The hooks all fall back to
 * `?? []` so the page degrades to its empty state UX.
 *
 * Coverage:
 *   - `/app/tests`            — 500 on the `tests` table fetch
 *   - `/app/audiences`        — 500 on `respondent_groups` (the audience
 *                               table — see useAudiences in queries.ts)
 *   - `/app/notifications`    — 403 RLS denial on `notifications`
 *   - `/app/tests/<missing>`  — 404 on detail route (id that does not
 *                               exist in the seed) — page renders its
 *                               "not found" surface, NOT a crash.
 */

test.describe("/app — error states", () => {
  test("/app/tests renders shell + empty fallback when the tests query fails (500)", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      errors: { tests: { status: 500, message: "internal server error" } },
    });
    const tests = new AppTestsIndexPage(page);
    const shell = new AppShellPage(page);
    await tests.open();
    // Shell + page header still mount — proves no crash.
    await expect(shell.root).toBeVisible();
    await expect(shell.pageHeaderTitle).toBeVisible();
    // Empty fallback rendered. Verbatim Slovak per CLAUDE.md.
    await expect(page.getByText("Žiadne testy v tomto filtri.")).toBeVisible();
  });

  test("/app/audiences renders shell + empty fallback when respondent_groups returns 500", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      errors: { respondent_groups: { status: 500, message: "boom" } },
    });
    const audiences = new AppAudiencesPage(page);
    const shell = new AppShellPage(page);
    await audiences.open();
    await expect(shell.root).toBeVisible();
    await expect(shell.pageHeaderTitle).toBeVisible();
  });

  test("/app/notifications survives a 403 RLS denial on notifications", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      errors: {
        notifications: {
          status: 403,
          code: "PGRST301",
          message: "permission denied for table notifications",
        },
      },
    });
    const notifs = new AppNotificationsPage(page);
    const shell = new AppShellPage(page);
    await notifs.open();
    await expect(shell.root).toBeVisible();
    await expect(shell.pageHeaderTitle).toBeVisible();
  });

  test("/app/tests/<missing-id> degrades gracefully without crashing the shell", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      // useTest(id) fetches /rest/v1/tests?id=eq.<id>&select=...,
      // which returns an empty array when no row matches. The route
      // component should render its "not found" UI rather than
      // surfacing a React error.
      tables: { tests: [] },
    });
    const shell = new AppShellPage(page);
    await page.goto("/app/tests/does-not-exist-test-id");
    await expect(shell.root).toBeVisible();
    // The shell must still be navigable — sidebar or mobile trigger
    // present. Avoid asserting on specific not-found copy because
    // the route's not-found component may vary by feature flag; the
    // contract here is "no crash".
    await expect(shell.header).toBeVisible();
  });

  test("multi-table failure (tests AND notifications) still renders the shell", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      errors: {
        tests: { status: 500, message: "boom" },
        notifications: { status: 500, message: "boom" },
      },
    });
    const shell = new AppShellPage(page);
    const tests = new AppTestsIndexPage(page);
    await tests.open();
    await expect(shell.root).toBeVisible();
    await expect(shell.sidebarLinkDashboard).toBeVisible();
    // Notification badge is hidden when there are zero unread (or when
    // the notifications query failed → no rows → 0 unread); assert it's
    // absent rather than visible. Sidebar still works.
    await expect(shell.sidebarNotificationsBadge).toBeHidden();
  });
});
