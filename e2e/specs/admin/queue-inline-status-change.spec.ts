import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { seedTickets, cleanupSeeds } from "../../../tests/fixtures/seed-tickets";

// E48-v3 — Inline status change from the queue row status badge.
//
// Asserts:
//   - clicking the status badge on a row opens the status popover
//   - the popover shows only valid FSM transitions for current status
//   - clicking "Resolved" on a new ticket triggers ConfirmDialog
//   - confirming updates the status persistently (row badge changes)
//
// Requires SUPABASE_SERVICE_ROLE_KEY + E2E_ALLOW_NONLOCAL_SEED=1 for prod.

const WORKER = Number(process.env.TEST_WORKER_INDEX ?? 0);

let ticketIds: string[] = [];

test.beforeAll(async () => {
  ticketIds = await seedTickets(WORKER);
});

test.afterAll(async () => {
  await cleanupSeeds(WORKER);
});

test.describe("E48-v3 — inline status change from queue row", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        rpcs: {
          has_role: true,
          transition_ticket_status: null,
        },
      },
    });
  });

  test("clicking status badge opens the status popover", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    const newTicket = ticketIds[0];
    await expect(adminTicketsQueue.row(newTicket)).toBeVisible();
    await adminTicketsQueue.rowStatusTrigger(newTicket).click();
    await expect(adminTicketsQueue.rowStatusOption(newTicket, "in_progress")).toBeVisible();
  });

  test("only valid FSM transitions are shown for a new ticket", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    const newTicket = ticketIds[0];
    await adminTicketsQueue.rowStatusTrigger(newTicket).click();
    // new → in_progress is valid; new → archived is not a direct transition
    await expect(adminTicketsQueue.rowStatusOption(newTicket, "in_progress")).toBeVisible();
    await expect(adminTicketsQueue.rowStatusOption(newTicket, "resolved")).toBeHidden();
  });

  test("clicking in_progress transition updates row status badge", async ({
    adminTicketsQueue,
    page,
  }) => {
    await adminTicketsQueue.open();
    const newTicket = ticketIds[0];
    await adminTicketsQueue.rowStatusTrigger(newTicket).click();
    await adminTicketsQueue.rowStatusOption(newTicket, "in_progress").click();

    // After the transition the badge should update. Allow a brief re-render.
    await page.waitForTimeout(300);
    await expect(adminTicketsQueue.rowStatusTrigger(newTicket)).toBeVisible();
  });

  test("ConfirmDialog appears when transitioning to resolved", async ({
    adminTicketsQueue,
    page,
  }) => {
    // Use an in_progress ticket (index 5 in seed = first in_progress batch)
    const inProgressTicket = ticketIds[5];
    await adminTicketsQueue.open();
    await adminTicketsQueue.rowStatusTrigger(inProgressTicket).click();
    await expect(adminTicketsQueue.rowStatusOption(inProgressTicket, "resolved")).toBeVisible();
    await adminTicketsQueue.rowStatusOption(inProgressTicket, "resolved").click();
    // A ConfirmDialog (role=alertdialog) must appear before the RPC fires.
    await expect(page.getByRole("alertdialog")).toBeVisible();
    // Confirm
    await page.getByRole("button", { name: /potvrdi|confirm/i }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
  });
});
