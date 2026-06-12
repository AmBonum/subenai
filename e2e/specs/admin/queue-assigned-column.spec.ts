import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import {
  seedSupportTicket,
  seedSupportTicketAdmin,
  seedTicketAssignee,
  supportTicketTables,
  type SupportTicketAdmin,
} from "../../seed";

// E48-v3 — Assigned column in the admin tickets queue.
//
// Seeds 4 tickets with a deterministic assignee distribution (0/1/2/5)
// against the Supabase mock and asserts the AssigneesCell render
// branches:
//   - 0 assignees → the cell renders the "—" placeholder (no avatars)
//   - 1 assignee  → avatar + name, no overflow chip
//   - 2 assignees → avatar stack, no overflow chip (cap is 3)
//   - 5 assignees → avatar stack + "+2" overflow chip

let ticketIds: string[] = [];
let admins: SupportTicketAdmin[] = [];

test.describe("E48-v3 — Assigned column in queue table", () => {
  test.beforeEach(async ({ context, page }) => {
    admins = Array.from({ length: 5 }, () => seedSupportTicketAdmin());
    const tickets = [0, 1, 2, 5].map((assigneeCount, i) =>
      seedSupportTicket({
        subject: `Assigned column ticket ${i}`,
        assignees: admins.slice(0, assigneeCount).map((a) => seedTicketAssignee(a)),
      }),
    );
    ticketIds = tickets.map((t) => t.id as string);

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: supportTicketTables(tickets),
        rpcs: { has_role: true },
      },
    });
  });

  test("Assigned column header is visible in the queue", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.assignedColumnHeader).toBeVisible();
  });

  test("ticket with 0 assignees shows the em-dash placeholder", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    // The cell testid is shared between the placeholder and avatar
    // branches — assert on the rendered content instead of visibility.
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[0])).toHaveText("—");
  });

  test("ticket with 1 assignee shows avatar stack, no overflow chip", async ({
    adminTicketsQueue,
  }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[1])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[1])).toContainText(
      admins[0].display_name,
    );
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[1])).toBeHidden();
  });

  test("ticket with 2 assignees shows avatar stack, no overflow chip", async ({
    adminTicketsQueue,
  }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[2])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[2])).not.toHaveText("—");
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[2])).toBeHidden();
  });

  test("ticket with 5 assignees shows overflow chip", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[3])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[3])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[3])).toHaveText("+2");
  });
});
