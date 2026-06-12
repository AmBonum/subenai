import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { seedSupportTicket, supportTicketTables } from "../../seed";

// E48-v3 — Sortable column headers in the admin tickets queue.
//
// For each sortable column asserts:
//   - first click → ASC indicator visible, URL contains `?sort=<col>:asc`
//   - second click → DESC indicator visible, URL contains `?sort=<col>:desc`
//   - third click → no sort indicator (reset), URL has no sort param for that col
//   - clicking column A while B is sorted clears B's indicator (mutual exclusivity)
//
// Runs fully against the Supabase mock — the queue reads the
// `support_tickets_with_assignees` view, so the seed populates both the
// table and the view via `supportTicketTables`.

const SORTABLE_COLUMNS = ["created_at", "subject", "status", "category"] as const;

function buildRows() {
  return [
    seedSupportTicket({ status: "new", category: "bug", subject: "Alpha sort row" }),
    seedSupportTicket({
      status: "in_progress",
      category: "question",
      subject: "Beta sort row",
      created_at: "2026-05-20T10:00:00.000Z",
    }),
  ];
}

test.describe("E48-v3 — sortable column headers in queue", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: supportTicketTables(buildRows()),
        rpcs: { has_role: true },
      },
    });
  });

  for (const column of SORTABLE_COLUMNS) {
    test(`${column}: click cycles ASC → DESC → none, URL syncs`, async ({
      adminTicketsQueue,
      page,
    }) => {
      await adminTicketsQueue.open();
      const sortBtn = adminTicketsQueue.columnSortButton(column);
      const sortIndicator = adminTicketsQueue.columnSortIndicator(column);

      // The indicator is always rendered; its `data-direction` attribute
      // carries the cycle state (none → asc → desc → none).

      // First click — ASC
      await sortBtn.click();
      await expect(sortIndicator).toHaveAttribute("data-direction", "asc");
      expect(decodeURIComponent(page.url())).toContain(`sort=${column}:asc`);

      // Second click — DESC
      await sortBtn.click();
      await expect(sortIndicator).toHaveAttribute("data-direction", "desc");
      expect(decodeURIComponent(page.url())).toContain(`sort=${column}:desc`);

      // Third click — no sort
      await sortBtn.click();
      await expect(sortIndicator).toHaveAttribute("data-direction", "none");
      expect(decodeURIComponent(page.url())).not.toContain(`sort=${column}`);
    });
  }

  test("sorting one column clears the sort indicator on another", async ({
    adminTicketsQueue,
    page,
  }) => {
    await adminTicketsQueue.open();

    const [colA, colB] = SORTABLE_COLUMNS;
    await adminTicketsQueue.columnSortButton(colA).click();
    await expect(adminTicketsQueue.columnSortIndicator(colA)).toHaveAttribute(
      "data-direction",
      "asc",
    );
    expect(decodeURIComponent(page.url())).toContain(`sort=${colA}:asc`);

    await adminTicketsQueue.columnSortButton(colB).click();
    await expect(adminTicketsQueue.columnSortIndicator(colB)).toHaveAttribute(
      "data-direction",
      "asc",
    );
    await expect(adminTicketsQueue.columnSortIndicator(colA)).toHaveAttribute(
      "data-direction",
      "none",
    );
    expect(decodeURIComponent(page.url())).not.toContain(`sort=${colA}`);
  });
});
