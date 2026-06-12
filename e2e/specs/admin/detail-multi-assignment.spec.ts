import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import {
  seedSupportTicket,
  seedSupportTicketAdmin,
  supportTicketTables,
  supportTicketRpcs,
  type SupportTicketAdmin,
} from "../../seed";

// E48-v3 — multi-assignment chips on the admin ticket detail page.
//
// Seeds 1 ticket + 3 admin users into the Supabase mock, then asserts:
//   - add 2 admins via the picker → both chips visible
//   - remove 1 chip → that assignee chip disappears
//   - reload preserves the remaining assignment
//
// `supportTicketRpcs` mutates the seeded view rows, so reload/refetch
// observes the assignments the way the real RPCs would persist them.

let ticketId = "";
let admins: SupportTicketAdmin[] = [];

test.describe("E48-v3 — multi-assignment chips (admin detail page)", () => {
  test.beforeEach(async ({ context, page }) => {
    admins = Array.from({ length: 3 }, () => seedSupportTicketAdmin());
    const ticket = seedSupportTicket({ subject: "Multi-assignment ticket" });
    ticketId = ticket.id as string;

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: supportTicketTables([ticket]),
        rpcs: {
          has_role: true,
          ...supportTicketRpcs({ admins }),
        },
      },
    });
  });

  test("add 2 admins via picker — both chips visible", async ({
    adminTicketDetail,
    adminPickerPopover,
  }) => {
    await adminTicketDetail.open(ticketId);
    await expect(adminTicketDetail.assigneesRoot).toBeVisible();

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[0].user_id).click();
    await expect(adminPickerPopover.root).toBeHidden();
    await expect(adminTicketDetail.assigneeChip(admins[0].user_id)).toBeVisible();

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[1].user_id).click();
    await expect(adminPickerPopover.root).toBeHidden();
    await expect(adminTicketDetail.assigneeChip(admins[1].user_id)).toBeVisible();
  });

  test("remove 1 chip — that assignee disappears", async ({
    adminTicketDetail,
    adminPickerPopover,
  }) => {
    await adminTicketDetail.open(ticketId);

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[0].user_id).click();
    await expect(adminTicketDetail.assigneeChip(admins[0].user_id)).toBeVisible();

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[1].user_id).click();
    await expect(adminTicketDetail.assigneeChip(admins[1].user_id)).toBeVisible();

    await adminTicketDetail.assigneeRemoveButton(admins[0].user_id).click();
    await expect(adminTicketDetail.assigneeChip(admins[0].user_id)).toBeHidden();
    await expect(adminTicketDetail.assigneeChip(admins[1].user_id)).toBeVisible();
  });

  test("reload after assignment preserves the chip", async ({
    adminTicketDetail,
    adminPickerPopover,
    page,
  }) => {
    await adminTicketDetail.open(ticketId);

    await adminTicketDetail.addAssigneeButton.click();
    await adminPickerPopover.adminOption(admins[0].user_id).click();
    await expect(adminTicketDetail.assigneeChip(admins[0].user_id)).toBeVisible();

    await page.reload();
    await adminTicketDetail.root.waitFor({ state: "visible" });
    await expect(adminTicketDetail.assigneeChip(admins[0].user_id)).toBeVisible();
  });
});
