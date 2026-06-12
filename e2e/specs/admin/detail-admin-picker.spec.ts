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

// E48-v3 — AdminPicker popover UX: search, empty state, keyboard nav, Esc.
//
// Seeds 1 ticket + 5 admin users into the Supabase mock so there are
// enough options to exercise search + keyboard navigation. The picker
// reads the directory from the `list_admin_users` RPC.

let ticketId = "";
let admins: SupportTicketAdmin[] = [];

test.describe("E48-v3 — AdminPicker popover UX", () => {
  test.beforeEach(async ({ context, page }) => {
    admins = Array.from({ length: 5 }, (_, i) =>
      seedSupportTicketAdmin({ display_name: `Seed Admin ${i + 1}` }),
    );
    const ticket = seedSupportTicket({ subject: "Picker ticket" });
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

  test("picker opens when clicking the add-assignee button", async ({
    adminTicketDetail,
    adminPickerPopover,
  }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await expect(adminPickerPopover.searchInput).toBeVisible();
  });

  test("search input filters admin options", async ({ adminTicketDetail, adminPickerPopover }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();

    await adminPickerPopover.searchInput.fill("Seed Admin 2");
    await expect(adminPickerPopover.adminOption(admins[1].user_id)).toBeVisible();
    await expect(adminPickerPopover.adminOption(admins[3].user_id)).toBeHidden();
  });

  test("nonsense query shows empty state", async ({ adminTicketDetail, adminPickerPopover }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.searchInput.fill("zzznomatch99999");
    await expect(adminPickerPopover.emptyState).toBeVisible();
  });

  test("Esc closes the picker", async ({ adminTicketDetail, adminPickerPopover, page }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(adminPickerPopover.root).toBeHidden();
  });

  test("ArrowDown + Enter selects the focused option", async ({
    adminTicketDetail,
    adminPickerPopover,
    page,
  }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();

    await adminPickerPopover.searchInput.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(adminPickerPopover.root).toBeHidden();
    await expect(adminTicketDetail.assigneesRoot).toBeVisible();
  });
});
