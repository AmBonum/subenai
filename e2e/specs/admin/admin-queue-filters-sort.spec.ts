import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { supportTicketTables } from "../../seed";

// E48 Wave-4 — admin queue filter chips, search, URL persistence.
//
// Covers plan IDs: C-01, C-02, C-04, C-05, C-06, C-07, C-08.
//
// NOT in this file (covered by PR #173 specs):
//   - C-09..C-18  → queue-column-sort-all.spec.ts,
//                   queue-assigned-column.spec.ts,
//                   queue-inline-status-change.spec.ts
//
// C-03 (pagination with ?page=N) is not implemented in the live queue
// component — the queue fetches all tickets without server-side pages.
// This TC cannot be tested and is flagged as a plan/component discrepancy.
//
// TC-19 (subject column ASC→DESC→none) is in queue-column-sort-all.spec.ts
// — that file has been extended with the subject column.
//
// TC-20 (?sortDropdown= redirect) — the LEGACY_SORT_MAP in
// SupportTicketsQueue.tsx maps tokens like "recency-desc", "status",
// "category" but NOT the "subject:asc" format used in TC-20.
// The test is written against a value that IS in the map ("status").

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-05-21T10:00:00.000Z";

function buildTicketRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TICKET_ID,
    created_at: NOW,
    updated_at: NOW,
    status: "new",
    category: "bug",
    source: "public_kontakt",
    subject: "C-02 column test",
    body: "Test body with at least twenty characters here.",
    submitter_user_id: null,
    submitter_email: "filter@test.example",
    submitter_name: "Filter Tester",
    assigned_to: null,
    archived_at: null,
    deleted_at: null,
    assignees: [],
    first_assignee_display_name: null,
    ...overrides,
  };
}

function buildInProgressTicketRow() {
  return buildTicketRow({
    id: "22222222-2222-4222-8222-222222222222",
    status: "in_progress",
    category: "question",
    subject: "In-progress ticket",
  });
}

test.describe("Admin queue — filters, search, URL persistence", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: supportTicketTables([buildTicketRow()]),
        rpcs: {
          has_role: true,
        },
      },
    });
  });

  // C-01: empty state — filter variant renders "Žiadne žiadosti pre tieto filtre"
  test("C-01: filter empty state renders the correct copy and a clear-filters CTA", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Open the queue with a status filter that matches no tickets", async () => {
      await page.goto("/admin/tickets?status=resolved");
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Verify the filter empty state is visible", async () => {
      await expect(adminTicketsQueue.emptyState).toBeVisible();
    });

    await test.step("Verify the empty-state heading text for the filter variant", async () => {
      await expect(adminTicketsQueue.emptyState).toContainText("Žiadne žiadosti pre tieto filtre");
    });

    await test.step("Verify the clear-filters button is visible", async () => {
      await expect(adminTicketsQueue.clearFiltersButton).toBeVisible();
    });
  });

  // C-02: queue renders table with correct columns
  test("C-02: queue with seeded rows renders the table with subject, status, category columns", async ({
    adminTicketsQueue,
  }) => {
    await test.step("Open the admin queue", async () => {
      await adminTicketsQueue.open();
    });

    await test.step("Verify the table is visible", async () => {
      await expect(adminTicketsQueue.table).toBeVisible();
    });

    await test.step("Verify the seeded row is rendered", async () => {
      await expect(adminTicketsQueue.row(TICKET_ID)).toBeVisible();
    });

    await test.step("Verify the row shows the correct subject", async () => {
      await expect(adminTicketsQueue.row(TICKET_ID)).toContainText("C-02 column test");
    });

    await test.step("Verify the status trigger is visible for the row", async () => {
      await expect(adminTicketsQueue.rowStatusTrigger(TICKET_ID)).toBeVisible();
    });
  });

  // C-04: status filter chip `new` filters queue to only new tickets
  test("C-04: clicking the 'Nové' status chip filters to only new tickets", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Open the queue — both new and in_progress tickets visible", async () => {
      // Re-prime with two tickets of different statuses.
      await setupAppShell(page.context(), page, {
        session: ADMIN_SESSION,
        extras: {
          tables: supportTicketTables([buildTicketRow(), buildInProgressTicketRow()]),
          rpcs: { has_role: true },
        },
      });
      await adminTicketsQueue.open();
    });

    await test.step("Deactivate all status filters first (click all to reset)", async () => {
      // The toolbar starts with a default set; navigate directly with status=new only.
      await page.goto("/admin/tickets?status=new");
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Verify only the new ticket is visible", async () => {
      await expect(adminTicketsQueue.row(TICKET_ID)).toBeVisible();
    });

    await test.step("Verify the in_progress ticket is not rendered", async () => {
      await expect(adminTicketsQueue.row("22222222-2222-4222-8222-222222222222")).toBeHidden();
    });

    await test.step("Verify the URL contains status=new", async () => {
      expect(decodeURIComponent(page.url())).toContain('status=["new"]');
    });
  });

  // C-05: category filter `bug` filters to bug tickets only
  test("C-05: category=bug URL param filters to bug category tickets only", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Navigate to /admin/tickets?category=bug", async () => {
      await page.goto("/admin/tickets?category=bug");
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Verify the bug ticket is visible", async () => {
      await expect(adminTicketsQueue.row(TICKET_ID)).toBeVisible();
    });

    await test.step("Verify the URL still contains category=bug", async () => {
      expect(decodeURIComponent(page.url())).toContain('category=["bug"]');
    });
  });

  // C-06: multiple filter chips combined narrow results
  test("C-06: combined status=new&category=bug filter narrows results correctly", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Navigate to /admin/tickets with status=new&category=bug", async () => {
      await page.goto("/admin/tickets?status=new&category=bug");
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Verify the new+bug ticket is visible", async () => {
      await expect(adminTicketsQueue.row(TICKET_ID)).toBeVisible();
    });

    await test.step("Verify the URL preserves both filter params", async () => {
      expect(decodeURIComponent(page.url())).toContain('status=["new"]');
      expect(decodeURIComponent(page.url())).toContain('category=["bug"]');
    });
  });

  // C-07: filter state persists in URL and survives reload
  test("C-07: filter state persists in URL and survives a full page reload", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Navigate to queue with status=new&category=bug", async () => {
      await page.goto("/admin/tickets?status=new&category=bug");
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Reload the page", async () => {
      await page.reload();
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Verify the URL still carries status=new and category=bug after reload", async () => {
      expect(decodeURIComponent(page.url())).toContain('status=["new"]');
      expect(decodeURIComponent(page.url())).toContain('category=["bug"]');
    });

    await test.step("Verify the 'Nové' filter chip is still active (aria-pressed=true)", async () => {
      await expect(adminTicketsQueue.statusFilter("new")).toHaveAttribute("aria-pressed", "true");
    });
  });

  // C-08: search input filters by subject; URL reflects ?q=<query>
  test("C-08: typing in the search input updates the URL with ?q=<query>", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Open the admin queue", async () => {
      await adminTicketsQueue.open();
    });

    await test.step("Type a search query into the search input", async () => {
      await adminTicketsQueue.searchInput.fill("C-02 column");
    });

    await test.step("Wait for the debounce (300ms) to flush the URL", async () => {
      await expect.poll(() => page.url(), { timeout: 2000 }).toContain("q=C-02");
    });

    await test.step("Verify the URL contains the search query", async () => {
      expect(page.url()).toMatch(/q=C-02/);
    });
  });

  // TC-20: legacy ?sortDropdown= URL redirects to ?sort=
  test("TC-20: legacy ?sortDropdown=status URL is redirected to ?sort=status:asc", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Navigate to queue with legacy ?sortDropdown=status param", async () => {
      await page.goto("/admin/tickets?sortDropdown=status");
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Verify the URL has been redirected to the new sort param", async () => {
      await expect
        .poll(() => decodeURIComponent(page.url()), { timeout: 2000 })
        .toContain("sort=status:asc");
    });

    await test.step("Verify the queue renders normally (no blank page)", async () => {
      await expect(adminTicketsQueue.root).toBeVisible();
    });
  });
});
