import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import {
  seedTickets,
  seedAdminUsers,
  seedTicketAssignments,
  cleanupSeeds,
  cleanupSeedAdminUsers,
  type AdminFixture,
} from "../../../tests/fixtures/seed-tickets";

// E48-v3 — Assigned column in the admin tickets queue.
//
// Seeds 5 tickets with a deterministic distribution: 0/1/2/3/5 assignees
// (as produced by `seedTicketAssignments` idx 0–4). Asserts:
//   - tickets[0]: no avatar stack rendered (0 assignees)
//   - tickets[1]: 1 avatar shown, no overflow chip
//   - tickets[2]: 2 avatars, no overflow chip
//   - tickets[3]: 3 avatars (or overflow if UI caps at 3)
//   - tickets[4]: overflow chip visible (5 assignees > typical cap)
//
// Requires SUPABASE_SERVICE_ROLE_KEY + E2E_ALLOW_NONLOCAL_SEED=1 for prod.

const WORKER = Number(process.env.TEST_WORKER_INDEX ?? 0);

let ticketIds: string[] = [];
let admins: AdminFixture[] = [];

test.beforeAll(async () => {
  ticketIds = await seedTickets(WORKER);
  admins = await seedAdminUsers(WORKER);
  await seedTicketAssignments(
    WORKER,
    ticketIds.slice(0, 5),
    admins.map((a) => a.userId),
  );
});

test.afterAll(async () => {
  await cleanupSeedAdminUsers(WORKER);
  await cleanupSeeds(WORKER);
});

test.describe("E48-v3 — Assigned column in queue table", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        rpcs: { has_role: true },
      },
    });
  });

  test("Assigned column header is visible in the queue", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.assignedColumnHeader).toBeVisible();
  });

  test("ticket with 0 assignees shows no avatar stack", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[0])).toBeHidden();
  });

  test("ticket with 1 assignee shows avatar stack, no overflow chip", async ({
    adminTicketsQueue,
  }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[1])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[1])).toBeHidden();
  });

  test("ticket with 2 assignees shows avatar stack, no overflow chip", async ({
    adminTicketsQueue,
  }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[2])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[2])).toBeHidden();
  });

  test("ticket with 5 assignees shows overflow chip", async ({ adminTicketsQueue }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.rowAssignedAvatars(ticketIds[4])).toBeVisible();
    await expect(adminTicketsQueue.rowAssignedOverflowChip(ticketIds[4])).toBeVisible();
  });
});
