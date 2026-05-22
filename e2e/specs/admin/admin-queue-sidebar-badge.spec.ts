import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";

// E48 Wave-4 — row-click navigation and sidebar support badge.
//
// Covers plan IDs: C-23, C-24.
//
// TC-02 (queue lists seeded rows → row click → detail navigation) is
// already covered by support-ticket-flow.spec.ts "admin queue lists the
// seeded ticket and navigates to detail". This file covers C-23/C-24
// as specified by the plan mapping.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-05-21T10:00:00.000Z";

function buildTicketRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TICKET_ID,
    created_at: NOW,
    updated_at: NOW,
    status: "new",
    category: "question",
    source: "public_kontakt",
    subject: "Sidebar badge test ticket",
    body: "Test body with at least twenty characters here.",
    submitter_user_id: null,
    submitter_email: "sidebar@test.example",
    submitter_name: "Sidebar Tester",
    assigned_to: null,
    archived_at: null,
    deleted_at: null,
    assignees: [],
    first_assignee_display_name: null,
    ...overrides,
  };
}

test.describe("Admin queue — row navigation and sidebar badge", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          support_tickets: [buildTicketRow()],
          support_ticket_messages: [],
          support_ticket_attachments: [],
          support_tickets_with_assignees: [],
        },
        rpcs: {
          has_role: true,
        },
      },
    });
  });

  // C-23: clicking a queue row navigates to /admin/tickets/$id
  test("C-23: clicking a queue row navigates to the ticket detail page", async ({
    adminTicketsQueue,
    adminTicketDetail,
    page,
  }) => {
    await test.step("Open the admin queue", async () => {
      await adminTicketsQueue.open();
    });

    await test.step("Verify the seeded ticket row is visible", async () => {
      await expect(adminTicketsQueue.row(TICKET_ID)).toBeVisible();
    });

    await test.step("Click the row link for the seeded ticket", async () => {
      await adminTicketsQueue.rowLink(TICKET_ID).click();
    });

    await test.step("Verify navigation to /admin/tickets/<id>", async () => {
      await page.waitForURL(new RegExp(`/admin/tickets/${TICKET_ID}$`));
    });

    await test.step("Verify the detail root is visible", async () => {
      await expect(adminTicketDetail.root).toBeVisible();
    });

    await test.step("Verify the detail subject matches the seeded ticket", async () => {
      await expect(adminTicketDetail.subject).toHaveText("Sidebar badge test ticket");
    });
  });

  // C-24: sidebar badge shows count of new+reopened tickets
  test("C-24: sidebar badge shows the count of new+reopened tickets needing attention", async ({
    adminTicketsQueue,
    page,
  }) => {
    await test.step("Open the admin queue so the sidebar renders", async () => {
      await adminTicketsQueue.open();
    });

    await test.step("Verify the sidebar support badge is visible (count=1: one new ticket)", async () => {
      // The badge query uses status IN (new, reopened) — our seeded
      // ticket has status=new, so the count should be 1.
      await expect(adminTicketsQueue.sidebarSupportBadge).toBeVisible();
      await expect(adminTicketsQueue.sidebarSupportBadge).toHaveText("1");
    });
  });
});
