import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTest, seedSession } from "../../seed";
import type { Database } from "../../../src/integrations/supabase/types";
import { AppHistoryPage } from "../../poms/app/AppHistoryPage";

type TestVersionRow = Database["public"]["Tables"]["test_versions"]["Row"];

function seedTestVersion(overrides: Partial<TestVersionRow> = {}): TestVersionRow {
  return {
    id: `tv_e2e_001`,
    test_id: "tst_e2e_001",
    version: 1,
    snapshot: {},
    published_at: "2026-05-19T00:00:00.000Z",
    published_by: EDUCATOR_SESSION.user.id,
    changelog: "Initial publish",
    ...overrides,
  };
}

test.describe("/app/history", () => {
  // TC-01: Empty state when no events are seeded.
  test("TC-01: empty state renders when no tests, sessions, or versions are seeded", async ({
    page,
  }) => {
    await setupEducator(page.context(), page, {
      tables: {
        tests: [],
        sessions: [],
        test_versions: [],
      },
    });

    const history = new AppHistoryPage(page);

    await test.step("Open the history page", async () => {
      await history.open();
    });

    await test.step("Verify the empty-state card is visible", async () => {
      await expect(history.emptyState).toBeVisible();
    });

    await test.step("Verify the empty-state text reads 'Žiadne udalosti pre zvolené filtre.'", async () => {
      await expect(history.emptyState).toHaveText("Žiadne udalosti pre zvolené filtre.");
    });

    await test.step("Verify no row cards are rendered", async () => {
      await expect(history.root.locator('[data-testid^="history-row-"]')).toHaveCount(0);
    });
  });

  // TC-02: Populated list shows a session row with correct title and action text.
  test("TC-02: populated list shows a session row with correct title and action", async ({
    page,
  }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "E2E Kvíz",
      status: "published",
      published_at: "2026-05-18T00:00:00.000Z",
    });
    const session1 = seedSession({
      test_id: test1.id,
      status: "completed",
      started_at: "2026-05-19T10:00:00.000Z",
      finished_at: "2026-05-19T10:30:00.000Z",
    });

    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [session1],
        test_versions: [],
      },
    });

    const history = new AppHistoryPage(page);
    const rowId = `s_${session1.id}`;

    await test.step("Open the history page", async () => {
      await history.open();
    });

    await test.step("Verify the empty-state card is NOT visible", async () => {
      await expect(history.emptyState).toHaveCount(0);
    });

    await test.step("Verify the session row card is visible", async () => {
      await expect(history.row(rowId)).toBeVisible();
    });

    await test.step("Verify the row title shows 'E2E Kvíz'", async () => {
      await expect(history.rowTitle(rowId)).toHaveText("E2E Kvíz");
    });

    await test.step("Verify the row action shows 'Session completed'", async () => {
      await expect(history.rowAction(rowId)).toHaveText("Session completed");
    });

    await test.step("Verify the row type badge shows 'Session'", async () => {
      await expect(history.rowTypeBadge(rowId)).toHaveText("Session");
    });
  });

  // TC-03: Event-type filter hides non-matching rows.
  test("TC-03: event-type filter set to 'Session' hides version rows", async ({ page }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "E2E Kvíz",
      status: "published",
      published_at: "2026-05-18T00:00:00.000Z",
    });
    const session1 = seedSession({
      test_id: test1.id,
      status: "completed",
      started_at: "2026-05-19T10:00:00.000Z",
      finished_at: "2026-05-19T10:30:00.000Z",
    });
    const version1 = seedTestVersion({
      id: "tv_e2e_002",
      test_id: test1.id,
      version: 1,
      published_at: "2026-05-18T08:00:00.000Z",
      changelog: "Initial publish",
    });

    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [session1],
        test_versions: [version1],
      },
    });

    const history = new AppHistoryPage(page);
    const sessionRowId = `s_${session1.id}`;
    const versionRowId = `v_${version1.id}`;

    await test.step("Open the history page", async () => {
      await history.open();
    });

    await test.step("Verify both the session row and version row are initially visible", async () => {
      await expect(history.row(sessionRowId)).toBeVisible();
      await expect(history.row(versionRowId)).toBeVisible();
    });

    await test.step("Select 'Session' from the event-type filter", async () => {
      await history.selectEventType("Session");
    });

    await test.step("Verify the session row is still visible", async () => {
      await expect(history.row(sessionRowId)).toBeVisible();
    });

    await test.step("Verify the version row is no longer visible", async () => {
      await expect(history.row(versionRowId)).toHaveCount(0);
    });
  });

  // TC-04: Date-range filter hides rows outside the selected range.
  test("TC-04: date-from filter hides sessions started before the cutoff date", async ({
    page,
  }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "E2E Kvíz",
      status: "published",
      published_at: "2026-04-30T00:00:00.000Z",
    });
    const earlySession = seedSession({
      test_id: test1.id,
      status: "completed",
      started_at: "2026-05-01T10:00:00.000Z",
      finished_at: "2026-05-01T10:30:00.000Z",
    });
    const lateSession = seedSession({
      test_id: test1.id,
      status: "completed",
      started_at: "2026-05-19T10:00:00.000Z",
      finished_at: "2026-05-19T10:30:00.000Z",
    });

    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [earlySession, lateSession],
        test_versions: [],
      },
    });

    const history = new AppHistoryPage(page);
    const earlyRowId = `s_${earlySession.id}`;
    const lateRowId = `s_${lateSession.id}`;

    await test.step("Open the history page", async () => {
      await history.open();
    });

    await test.step("Verify both session rows are initially visible", async () => {
      await expect(history.row(earlyRowId)).toBeVisible();
      await expect(history.row(lateRowId)).toBeVisible();
    });

    await test.step("Set the 'Od' date input to 2026-05-10", async () => {
      await history.setDateFrom("2026-05-10");
    });

    await test.step("Verify only the late session row (2026-05-19) is visible", async () => {
      await expect(history.row(lateRowId)).toBeVisible();
    });

    await test.step("Verify the early session row (2026-05-01) is no longer rendered", async () => {
      await expect(history.row(earlyRowId)).toHaveCount(0);
    });
  });

  // TC-05: "Vyčistiť filtre" resets all filters and restores the full list.
  test("TC-05: 'Vyčistiť filtre' button resets date filter and shows all rows", async ({
    page,
  }) => {
    const test1 = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "E2E Kvíz",
      status: "published",
      published_at: "2026-04-30T00:00:00.000Z",
    });
    const earlySession = seedSession({
      test_id: test1.id,
      status: "completed",
      started_at: "2026-05-01T10:00:00.000Z",
      finished_at: "2026-05-01T10:30:00.000Z",
    });
    const lateSession = seedSession({
      test_id: test1.id,
      status: "completed",
      started_at: "2026-05-19T10:00:00.000Z",
      finished_at: "2026-05-19T10:30:00.000Z",
    });

    await setupEducator(page.context(), page, {
      tables: {
        tests: [test1],
        sessions: [earlySession, lateSession],
        test_versions: [],
      },
    });

    const history = new AppHistoryPage(page);
    const earlyRowId = `s_${earlySession.id}`;
    const lateRowId = `s_${lateSession.id}`;

    await test.step("Open the history page", async () => {
      await history.open();
    });

    await test.step("Apply date-from filter (2026-05-10) to hide the early session", async () => {
      await history.setDateFrom("2026-05-10");
      await expect(history.row(earlyRowId)).toHaveCount(0);
    });

    await test.step("Click the 'Vyčistiť filtre' button", async () => {
      await history.clearFilters();
    });

    await test.step("Verify both session rows are visible again", async () => {
      await expect(history.row(earlyRowId)).toBeVisible();
      await expect(history.row(lateRowId)).toBeVisible();
    });

    await test.step("Verify the date-from input is cleared", async () => {
      await expect(history.dateFromInput).toHaveValue("");
    });
  });
});
