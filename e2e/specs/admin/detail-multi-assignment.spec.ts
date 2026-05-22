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

// E48-v3 — multi-assignment chips on the admin ticket detail page.
//
// Seeds 1 ticket + 3 admin users per worker, then asserts:
//   - add 2 admins via the picker → both chips visible
//   - remove 1 chip → that assignee chip disappears
//   - reload preserves the remaining assignment
//
// Requires SUPABASE_SERVICE_ROLE_KEY. Set E2E_ALLOW_NONLOCAL_SEED=1
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

test.describe("E48-v3 — multi-assignment chips (admin detail page)", () => {
  test.beforeEach(async ({ context, page }) => {
    const assigneeStore: string[] = [];

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        rpcs: {
          has_role: true,
          list_admin_users: () =>
            admins.map((a) => ({ user_id: a.userId, email: a.email, display_name: a.displayName })),
          assign_admin_to_ticket: (body: unknown) => {
            const { p_assignee_id } = body as { p_assignee_id: string };
            if (!assigneeStore.includes(p_assignee_id)) assigneeStore.push(p_assignee_id);
            return null;
          },
          unassign_admin_from_ticket: (body: unknown) => {
            const { p_assignee_id } = body as { p_assignee_id: string };
            const idx = assigneeStore.indexOf(p_assignee_id);
            if (idx >= 0) assigneeStore.splice(idx, 1);
            return null;
          },
          get_ticket_assignees: () =>
            assigneeStore.map((id) => {
              const a = admins.find((x) => x.userId === id);
              return { user_id: id, email: a?.email ?? "", display_name: a?.displayName ?? "" };
            }),
        },
      },
    });
  });

  test("add 2 admins via picker — both chips visible", async ({
    adminTicketDetail,
    adminPickerPopover,
  }) => {
    await adminTicketDetail.open(ticketIds[0]);
    await expect(adminTicketDetail.assigneesRoot).toBeVisible();

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[0].userId).click();
    await expect(adminPickerPopover.root).toBeHidden();
    await expect(adminTicketDetail.assigneeChip(admins[0].userId)).toBeVisible();

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[1].userId).click();
    await expect(adminPickerPopover.root).toBeHidden();
    await expect(adminTicketDetail.assigneeChip(admins[1].userId)).toBeVisible();
  });

  test("remove 1 chip — that assignee disappears", async ({
    adminTicketDetail,
    adminPickerPopover,
  }) => {
    await adminTicketDetail.open(ticketIds[0]);

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[0].userId).click();
    await expect(adminTicketDetail.assigneeChip(admins[0].userId)).toBeVisible();

    await adminTicketDetail.addAssigneeButton.click();
    await expect(adminPickerPopover.root).toBeVisible();
    await adminPickerPopover.adminOption(admins[1].userId).click();
    await expect(adminTicketDetail.assigneeChip(admins[1].userId)).toBeVisible();

    await adminTicketDetail.assigneeRemoveButton(admins[0].userId).click();
    await expect(adminTicketDetail.assigneeChip(admins[0].userId)).toBeHidden();
    await expect(adminTicketDetail.assigneeChip(admins[1].userId)).toBeVisible();
  });

  test("reload after assignment preserves the chip", async ({
    adminTicketDetail,
    adminPickerPopover,
    page,
  }) => {
    await adminTicketDetail.open(ticketIds[0]);

    await adminTicketDetail.addAssigneeButton.click();
    await adminPickerPopover.adminOption(admins[0].userId).click();
    await expect(adminTicketDetail.assigneeChip(admins[0].userId)).toBeVisible();

    await page.reload();
    await adminTicketDetail.root.waitFor({ state: "visible" });
    await expect(adminTicketDetail.assigneeChip(admins[0].userId)).toBeVisible();
  });
});
