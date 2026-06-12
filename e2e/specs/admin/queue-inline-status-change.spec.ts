import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { seedSupportTicket, supportTicketTables, supportTicketRpcs } from "../../seed";

// E48-v3 — Inline status change from the queue row status badge.
//
// Asserts:
//   - clicking the status badge on a row opens the status popover
//   - the popover lists only valid FSM transitions for the current status
//   - terminal transitions (resolved) open a ConfirmDialog before the RPC
//   - confirming updates the status persistently (row badge changes)
//
// Runs against the Supabase mock; `supportTicketRpcs` mutates both the
// `support_tickets` table and the `support_tickets_with_assignees` view
// so the post-mutation refetch observes the new status.

let newTicketId = "";
let inProgressTicketId = "";

test.describe("E48-v3 — inline status change from queue row", () => {
  test.beforeEach(async ({ context, page }) => {
    const newTicket = seedSupportTicket({ status: "new", subject: "Inline status new" });
    const inProgressTicket = seedSupportTicket({
      status: "in_progress",
      subject: "Inline status in progress",
    });
    newTicketId = newTicket.id as string;
    inProgressTicketId = inProgressTicket.id as string;

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: supportTicketTables([newTicket, inProgressTicket]),
        rpcs: {
          has_role: true,
          ...supportTicketRpcs(),
        },
      },
    });
  });

  test("clicking status badge opens the status popover", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.row(newTicketId)).toBeVisible();
    await adminTicketsQueue.rowStatusTrigger(newTicketId).click();
    await expect(adminTicketsQueue.rowStatusOption(newTicketId, "in_progress")).toBeVisible();
  });

  test("only valid FSM transitions are shown for a new ticket", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await adminTicketsQueue.rowStatusTrigger(newTicketId).click();
    // Mirrors the transition_ticket_status RPC FSM: new → in_progress ONLY
    // (resolved/archived become reachable later in the lifecycle).
    await expect(adminTicketsQueue.rowStatusOption(newTicketId, "in_progress")).toBeVisible();
    await expect(adminTicketsQueue.rowStatusOption(newTicketId, "resolved")).toBeHidden();
    await expect(adminTicketsQueue.rowStatusOption(newTicketId, "archived")).toBeHidden();
    await expect(adminTicketsQueue.rowStatusOption(newTicketId, "reopened")).toBeHidden();
    await expect(adminTicketsQueue.rowStatusOption(newTicketId, "waiting_user")).toBeHidden();
  });

  test("clicking in_progress transition updates row status badge", async ({
    adminTicketsQueue,
  }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowStatusTrigger(newTicketId)).toContainText("Nové");
    await adminTicketsQueue.rowStatusTrigger(newTicketId).click();
    await adminTicketsQueue.rowStatusOption(newTicketId, "in_progress").click();

    // Intermediate transitions run without confirm; the refetched view
    // row drives the badge text.
    await expect(adminTicketsQueue.rowStatusTrigger(newTicketId)).toContainText("Riešim");
  });

  test("ConfirmDialog appears when transitioning to resolved", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await adminTicketsQueue.rowStatusTrigger(inProgressTicketId).click();
    await expect(adminTicketsQueue.rowStatusOption(inProgressTicketId, "resolved")).toBeVisible();
    await adminTicketsQueue.rowStatusOption(inProgressTicketId, "resolved").click();
    // A ConfirmDialog (role=alertdialog) must appear before the RPC fires.
    await expect(adminTicketsQueue.confirmDialog).toBeVisible();
    // Confirm
    await adminTicketsQueue.confirmDialogConfirm.click();
    await expect(adminTicketsQueue.confirmDialog).toBeHidden();
  });
});
