import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import {
  seedTickets,
  seedAdminUsers,
  cleanupSeeds,
  cleanupSeedAdminUsers,
  type AdminFixture,
} from "../../../tests/fixtures/seed-tickets";

// E48-v3 — AdminPicker popover UX: search, empty state, keyboard nav, Esc.
//
// Seeds 1 ticket + 5 admin users per worker so there are enough options
// to exercise search + keyboard navigation. Set E2E_ALLOW_NONLOCAL_SEED=1
// to run against production.

const WORKER = Number(process.env.TEST_WORKER_INDEX ?? 0);

let ticketIds: string[] = [];
let admins: AdminFixture[] = [];

test.beforeAll(async () => {
  ticketIds = await seedTickets(WORKER);
  admins = await seedAdminUsers(WORKER);
});

test.afterAll(async () => {
  await cleanupSeedAdminUsers(WORKER);
  await cleanupSeeds(WORKER);
});

test.describe("E48-v3 — AdminPicker popover UX", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        rpcs: {
          has_role: true,
          list_admin_users: () =>
            admins.map((a) => ({
              user_id: a.userId,
              email: a.email,
              display_name: a.displayName,
            })),
          get_ticket_assignees: () => [],
          assign_admin_to_ticket: () => null,
        },
      },
    });
  });

  test("picker opens when clicking the add-assignee button", async ({
    adminTicketDetail,
    adminPickerPopover,
  }) => {
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await expect(adminPickerPopover.searchInput).toBeVisible();
  });

  test("search input filters admin options", async ({ adminTicketDetail, adminPickerPopover }) => {
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();

    const targetAdmin = admins[1];
    const nameFragment = `Seed Admin 2 W${WORKER}`.substring(0, 10);
    await adminPickerPopover.searchInput.fill(nameFragment);
    await expect(adminPickerPopover.adminOption(targetAdmin.userId)).toBeVisible();
    await expect(adminPickerPopover.adminOption(admins[3].userId)).toBeHidden();
  });

  test("nonsense query shows empty state", async ({ adminTicketDetail, adminPickerPopover }) => {
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.searchInput.fill("zzznomatch99999");
    await expect(adminPickerPopover.emptyState).toBeVisible();
  });

  test("Esc closes the picker", async ({ adminTicketDetail, adminPickerPopover, page }) => {
    await adminTicketDetail.open(ticketIds[0]);
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
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();

    await adminPickerPopover.searchInput.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(adminPickerPopover.root).toBeHidden();
    await expect(adminTicketDetail.assigneesRoot).toBeVisible();
  });
});
