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

  // TC-02: Dashboard renders the error state when the stats query fails
  test("TC-02: error state renders when the stats query fails", async ({ context, page }) => {
    const dashboard = new AdminIndexPage(page);

    await test.step("Set up admin session with a 500 error on the profiles table", async () => {
      await setupAdmin(context, page, {
        ...EMPTY_EXTRAS,
        errors: { profiles: { status: 500, message: "internal server error" } },
      });
    });

    await test.step("Navigate to /admin", async () => {
      await dashboard.open();
    });

    await test.step("Verify the dashboard error element is visible", async () => {
      // React Query retries 3 times with exponential backoff (1 s + 2 s + 4 s = 7 s).
      // Extend the assertion timeout beyond that window so the test waits for the
      // final failure before asserting the error UI is visible.
      await expect(dashboard.errorState).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Verify the stat card grid is not rendered", async () => {
      await expect(dashboard.statCardUsers).not.toBeVisible();
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
