import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { seedTickets, cleanupSeeds } from "../../../tests/fixtures/seed-tickets";

// E48-v3 — Sortable column headers in the admin tickets queue.
//
// For each sortable column asserts:
//   - first click → ASC indicator visible, URL contains `?sort=<col>:asc`
//   - second click → DESC indicator visible, URL contains `?sort=<col>:desc`
//   - third click → no sort indicator (reset), URL has no sort param for that col
//   - clicking column A while B is sorted clears B's indicator (mutual exclusivity)
//
// Requires SUPABASE_SERVICE_ROLE_KEY + E2E_ALLOW_NONLOCAL_SEED=1 for prod.

const WORKER = Number(process.env.TEST_WORKER_INDEX ?? 0);

const SORTABLE_COLUMNS = ["created_at", "updated_at", "status", "category"] as const;

let ticketIds: string[] = [];

test.beforeAll(async () => {
  ticketIds = await seedTickets(WORKER);
});

test.afterAll(async () => {
  await cleanupSeeds(WORKER);
});

test.describe("E48-v3 — sortable column headers in queue", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: { rpcs: { has_role: true } },
    });
    // Suppress unused variable warning — ticketIds referenced to ensure seed ran
    void ticketIds;
  });

  for (const column of SORTABLE_COLUMNS) {
    test(`${column}: click cycles ASC → DESC → none, URL syncs`, async ({
      adminTicketsQueue,
      page,
    }) => {
      await adminTicketsQueue.open();
      const sortBtn = adminTicketsQueue.columnSortButton(column);
      const sortIndicator = adminTicketsQueue.columnSortIndicator(column);

      // First click — ASC
      await sortBtn.click();
      await expect(sortIndicator).toBeVisible();
      expect(page.url()).toContain(`sort=${column}:asc`);

      // Second click — DESC
      await sortBtn.click();
      await expect(sortIndicator).toBeVisible();
      expect(page.url()).toContain(`sort=${column}:desc`);

      // Third click — no sort
      await sortBtn.click();
      await expect(sortIndicator).toBeHidden();
      expect(page.url()).not.toContain(`sort=${column}`);
    });
  }

  test("sorting one column clears the sort indicator on another", async ({
    adminTicketsQueue,
    page,
  }) => {
    await adminTicketsQueue.open();

    const [colA, colB] = SORTABLE_COLUMNS;
    await adminTicketsQueue.columnSortButton(colA).click();
    await expect(adminTicketsQueue.columnSortIndicator(colA)).toBeVisible();
    expect(page.url()).toContain(`sort=${colA}:asc`);

    await adminTicketsQueue.columnSortButton(colB).click();
    await expect(adminTicketsQueue.columnSortIndicator(colB)).toBeVisible();
    await expect(adminTicketsQueue.columnSortIndicator(colA)).toBeHidden();
    expect(page.url()).not.toContain(`sort=${colA}`);
  });
});
