import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedProfile, seedUserRole } from "../../seed";
import { AdminUsersPage } from "../../poms/admin/AdminUsersPage";

const ALICE_ID = "prof_e2e_alice";
const BOB_ID = "prof_e2e_bob";

test.describe("/admin/users", () => {
  // TC-01: Empty state when no users exist
  test("TC-01: empty state renders when profiles table is empty", async ({ context, page }) => {
    await setupAdmin(context, page, {
      tables: {
        profiles: [],
        user_roles: [],
      },
    });
    const users = new AdminUsersPage(page);

    await test.step("Open /admin/users", async () => {
      await users.open();
    });

    await test.step("Verify page root is visible", async () => {
      await expect(users.root).toBeVisible();
    });

    await test.step("Verify empty-state card is visible and table is not in the DOM", async () => {
      await expect(users.emptyState).toBeVisible();
      await expect(users.table).toHaveCount(0);
    });
  });

  // TC-02: Populated list — user rows render with email and role badge
  test("TC-02: populated list renders user rows with email and role badge", async ({
    context,
    page,
  }) => {
    const alice = seedProfile({ id: ALICE_ID, email: "alice@e2e.test", display_name: "Alice" });
    const bob = seedProfile({ id: BOB_ID, email: "bob@e2e.test", display_name: "Bob" });
    const aliceRole = seedUserRole({ user_id: ALICE_ID, role: "admin" });

    await setupAdmin(context, page, {
      tables: {
        profiles: [alice, bob],
        user_roles: [aliceRole],
      },
    });
    const users = new AdminUsersPage(page);

    await test.step("Open /admin/users", async () => {
      await users.open();
    });

    await test.step("Verify users table is visible", async () => {
      await expect(users.table).toBeVisible();
    });

    await test.step("Verify Alice's row is visible with her email", async () => {
      await expect(users.row(ALICE_ID)).toBeVisible();
      await expect(users.row(ALICE_ID)).toContainText("alice@e2e.test");
    });

    await test.step("Verify Alice's role badge shows 'Admin'", async () => {
      await expect(users.roleBadge(ALICE_ID)).toBeVisible();
      await expect(users.roleBadge(ALICE_ID)).toContainText("Admin");
    });

    await test.step("Verify Bob's row is visible with his email", async () => {
      await expect(users.row(BOB_ID)).toBeVisible();
      await expect(users.row(BOB_ID)).toContainText("bob@e2e.test");
    });

    await test.step("Verify Bob's role badge defaults to 'Používateľ'", async () => {
      await expect(users.roleBadge(BOB_ID)).toBeVisible();
      await expect(users.roleBadge(BOB_ID)).toContainText("Používateľ");
    });
  });

  // TC-03: Search input filters rows by email
  test("TC-03: typing in search input filters rows by email", async ({ context, page }) => {
    const alice = seedProfile({ id: ALICE_ID, email: "alice@e2e.test", display_name: "Alice" });
    const bob = seedProfile({ id: BOB_ID, email: "bob@e2e.test", display_name: "Bob" });
    const aliceRole = seedUserRole({ user_id: ALICE_ID, role: "admin" });

    await setupAdmin(context, page, {
      tables: {
        profiles: [alice, bob],
        user_roles: [aliceRole],
      },
    });
    const users = new AdminUsersPage(page);

    await test.step("Open /admin/users", async () => {
      await users.open();
    });

    await test.step("Type 'alice' into the search input", async () => {
      await users.searchInput.fill("alice");
    });

    await test.step("Verify Alice's row is still visible", async () => {
      await expect(users.row(ALICE_ID)).toBeVisible();
    });

    await test.step("Verify Bob's row is hidden and empty state is not shown", async () => {
      await expect(users.row(BOB_ID)).toHaveCount(0);
      await expect(users.emptyState).toHaveCount(0);
    });
  });

  // TC-04: Role filter narrows list to matching role only
  test("TC-04: role filter select narrows list to matching role only", async ({
    context,
    page,
  }) => {
    const alice = seedProfile({ id: ALICE_ID, email: "alice@e2e.test", display_name: "Alice" });
    const bob = seedProfile({ id: BOB_ID, email: "bob@e2e.test", display_name: "Bob" });
    const aliceRole = seedUserRole({ user_id: ALICE_ID, role: "admin" });

    await setupAdmin(context, page, {
      tables: {
        profiles: [alice, bob],
        user_roles: [aliceRole],
      },
    });
    const users = new AdminUsersPage(page);

    await test.step("Open /admin/users", async () => {
      await users.open();
    });

    await test.step("Select 'Admin' from the role filter", async () => {
      await users.selectRoleFilter("Admin");
    });

    await test.step("Verify only Alice's row is visible", async () => {
      await expect(users.row(ALICE_ID)).toBeVisible();
    });

    await test.step("Verify Bob's row is not in the DOM", async () => {
      await expect(users.row(BOB_ID)).toHaveCount(0);
    });
  });

  // TC-05: Edit-role button fires the "Upraviť rolu" toast
  test("TC-05: clicking edit-role button fires the 'Upraviť rolu' toast", async ({
    context,
    page,
  }) => {
    const alice = seedProfile({ id: ALICE_ID, email: "alice@e2e.test", display_name: "Alice" });

    await setupAdmin(context, page, {
      tables: {
        profiles: [alice],
        user_roles: [],
      },
    });
    const users = new AdminUsersPage(page);

    await test.step("Open /admin/users", async () => {
      await users.open();
    });

    await test.step("Verify Alice's row and edit-role button are visible", async () => {
      await expect(users.row(ALICE_ID)).toBeVisible();
      await expect(users.editRoleButton(ALICE_ID)).toBeVisible();
    });

    await test.step("Click the edit-role button for Alice", async () => {
      await users.editRoleButton(ALICE_ID).click();
    });

    await test.step("Verify the 'Upraviť rolu' toast notification is visible", async () => {
      await expect(users.toast).toBeVisible({ timeout: 4000 });
      await expect(users.toast).toContainText("Upraviť rolu");
    });
  });

  // TC-06: Search with no match shows empty-state card
  test("TC-06: search with no match shows empty-state card with description", async ({
    context,
    page,
  }) => {
    const alice = seedProfile({ id: ALICE_ID, email: "alice@e2e.test", display_name: "Alice" });

    await setupAdmin(context, page, {
      tables: {
        profiles: [alice],
        user_roles: [],
      },
    });
    const users = new AdminUsersPage(page);

    await test.step("Open /admin/users", async () => {
      await users.open();
    });

    await test.step("Type a string that matches no user", async () => {
      await users.searchInput.fill("zzznomatch");
    });

    await test.step("Verify empty-state card is visible and table is not in the DOM", async () => {
      await expect(users.emptyState).toBeVisible();
      await expect(users.table).toHaveCount(0);
    });

    await test.step("Verify the empty-state description is correct", async () => {
      await expect(users.emptyState).toContainText("Pre zadané filtre sme nenašli žiadny záznam.");
    });
  });
});
