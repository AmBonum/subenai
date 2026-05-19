import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminIndexPage } from "../../poms/admin/AdminIndexPage";

const EMPTY_EXTRAS = {
  tables: {
    questions: [],
    reports: [],
    trainings: [],
    dsr_requests: [],
    audit_log: [],
  },
};

test.describe("Admin dashboard index", () => {
  // TC-01: Page renders the admin shell with the welcome heading and stat card grid
  test("TC-01: renders the admin shell with heading and all four stat cards", async ({
    context,
    page,
  }) => {
    const dashboard = new AdminIndexPage(page);

    await test.step("Set up admin session with empty tables", async () => {
      await setupAdmin(context, page, EMPTY_EXTRAS);
    });

    await test.step("Navigate to /admin", async () => {
      await dashboard.open();
    });

    await test.step("Verify dashboard root is visible", async () => {
      await expect(dashboard.root).toBeVisible();
    });

    await test.step('Verify page-header title reads "Prehľad"', async () => {
      await expect(dashboard.pageHeaderTitle).toHaveText("Prehľad");
    });

    await test.step("Verify page-header description is visible", async () => {
      await expect(dashboard.pageHeaderDescription).toHaveText(
        "Zhrnutie aktivity, kľúčové metriky a najnovšie udalosti na platforme.",
      );
    });

    await test.step("Verify all four stat cards are visible", async () => {
      await expect(dashboard.statCardUsers).toBeVisible();
      await expect(dashboard.statCardTests).toBeVisible();
      await expect(dashboard.statCardSessions).toBeVisible();
      await expect(dashboard.statCardDsrPending).toBeVisible();
    });

    await test.step("Verify the recent-activity card is visible", async () => {
      await expect(dashboard.recentActivityCard).toBeVisible();
    });
  });

  // TC-02: Stat counters reflect seeded row counts.
  // Originally redesigned to an error-boundary test because `mockSupabase`
  // returned 0 for HEAD count=exact regardless of seeded rows. Envelope
  // fix landed 2026-05-19 (computes Content-Range end from total, not
  // body length), so the test now asserts the real contract.
  test("TC-02: stat counters render the seeded counts", async ({ context, page }) => {
    const dashboard = new AdminIndexPage(page);

    await test.step("Seed 5 profiles + 3 tests + 2 sessions + 1 open DSR", async () => {
      await setupAdmin(context, page, {
        tables: {
          profiles: Array.from({ length: 5 }, (_, i) => ({
            id: `u${i + 1}`,
            email: `seed-${i + 1}@example.com`,
            display_name: `Seed ${i + 1}`,
            created_at: "2026-05-19T00:00:00Z",
            updated_at: "2026-05-19T00:00:00Z",
          })),
          tests: Array.from({ length: 3 }, (_, i) => ({
            id: `t${i + 1}`,
            owner_id: "u1",
            title: `Test ${i + 1}`,
            status: "published",
            created_at: "2026-05-19T00:00:00Z",
          })),
          sessions: Array.from({ length: 2 }, (_, i) => ({
            id: `s${i + 1}`,
            test_id: "t1",
            status: "completed",
            started_at: "2026-05-19T00:00:00Z",
            finished_at: "2026-05-19T00:30:00Z",
          })),
          dsr_requests: [
            {
              id: "d1",
              status: "open",
              subject_email: "user@example.com",
              type: "access",
              created_at: "2026-05-19T00:00:00Z",
            },
          ],
          questions: [],
          reports: [],
          trainings: [],
          audit_log: [],
        },
      });
    });

    await test.step("Navigate to /admin", async () => {
      await dashboard.open();
    });

    await test.step("Verify each stat card value matches the seeded count", async () => {
      await expect(dashboard.statCardUsersValue).toHaveText("5");
      await expect(dashboard.statCardTestsValue).toHaveText("3");
      await expect(dashboard.statCardSessionsValue).toHaveText("2");
      await expect(dashboard.statCardDsrPendingValue).toHaveText("1");
    });
  });

  // TC-03: Sidebar nav links navigate to admin sub-pages
  test("TC-03: sidebar nav links navigate to their respective admin sub-pages", async ({
    context,
    page,
  }) => {
    const dashboard = new AdminIndexPage(page);

    await test.step("Set up admin session and navigate to /admin", async () => {
      await setupAdmin(context, page, EMPTY_EXTRAS);
      await dashboard.open();
      await expect(dashboard.root).toBeVisible();
    });

    await test.step('Click the "Testy" sidebar link', async () => {
      await dashboard.sidebarLinkTests.click();
    });

    await test.step("Verify URL is /admin/tests", async () => {
      await expect(page).toHaveURL(/\/admin\/tests/);
    });

    await test.step('Navigate back to /admin and click the "Otázky" sidebar link', async () => {
      await dashboard.open();
      await expect(dashboard.root).toBeVisible();
      await dashboard.sidebarLinkQuestions.click();
    });

    await test.step("Verify URL is /admin/questions", async () => {
      await expect(page).toHaveURL(/\/admin\/questions/);
    });

    await test.step('Navigate back to /admin and click the "Používatelia" sidebar link', async () => {
      await dashboard.open();
      await expect(dashboard.root).toBeVisible();
      await dashboard.sidebarLinkUsers.click();
    });

    await test.step("Verify URL is /admin/users", async () => {
      await expect(page).toHaveURL(/\/admin\/users/);
    });
  });

  // TC-04: Recent-activity empty state renders when the audit_log table is empty
  test("TC-04: recent-activity empty state is shown when audit_log is empty", async ({
    context,
    page,
  }) => {
    const dashboard = new AdminIndexPage(page);

    await test.step("Set up admin session with an empty audit_log", async () => {
      await setupAdmin(context, page, EMPTY_EXTRAS);
    });

    await test.step("Navigate to /admin", async () => {
      await dashboard.open();
    });

    await test.step("Verify the recent-activity card is visible", async () => {
      await expect(dashboard.recentActivityCard).toBeVisible();
    });

    await test.step("Verify the empty-state paragraph is visible and no activity rows exist", async () => {
      await expect(dashboard.recentActivityEmpty).toBeVisible();
    });
  });
});
