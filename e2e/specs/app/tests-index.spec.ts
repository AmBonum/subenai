import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTest } from "../../seed";
import type { RpcContext } from "../../mocks/supabase";
import { AppTestsIndexPage } from "../../poms/app/AppTestsIndexPage";

test.describe("/app/tests", () => {
  // TC-01: True-empty state (zero owned tests) renders the first-run card
  // with a "Vytvoriť prvý test" CTA instead of the filter-empty copy.
  test("TC-01: true-empty state renders the first-run card with a create CTA", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { tests: [], respondent_groups: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify page root and new-test button are visible", async () => {
      await expect(testsIndex.root).toBeVisible();
      await expect(testsIndex.newTestButton).toBeVisible();
    });

    await test.step("Verify the first-run empty card with headline + CTA", async () => {
      await expect(testsIndex.emptyInitial).toBeVisible();
      await expect(testsIndex.emptyInitialTitle).toHaveText("Zatiaľ nemáš žiadne testy.");
      await expect(testsIndex.emptyInitialCta).toBeVisible();
    });

    await test.step("Verify the filter-empty card is NOT rendered", async () => {
      await expect(testsIndex.emptyState).toHaveCount(0);
    });

    await test.step("Verify no test row cards are in the DOM", async () => {
      await expect(testsIndex.allListRows).toHaveCount(0);
    });

    await test.step("Click the CTA and verify it navigates to the wizard", async () => {
      await testsIndex.emptyInitialCta.click();
      await expect(page).toHaveURL(/\/app\/tests\/new/);
    });
  });

  // TC-02: List renders when tests are seeded
  test("TC-02: list renders when tests are seeded", async ({ context, page }) => {
    const draft = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Draft test E2E",
      status: "draft",
    });
    const published = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published test E2E",
      status: "published",
    });

    await setupEducator(context, page, {
      tables: { tests: [draft, published], respondent_groups: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify empty-state card is not in the DOM", async () => {
      await expect(testsIndex.emptyState).toHaveCount(0);
    });

    await test.step("Verify row card for the draft test is visible with correct title", async () => {
      await expect(testsIndex.listRow(draft.id)).toBeVisible();
      await expect(testsIndex.rowTitle(draft.id)).toHaveText("Draft test E2E");
    });

    await test.step("Verify row card for the published test is visible with correct title", async () => {
      await expect(testsIndex.listRow(published.id)).toBeVisible();
      await expect(testsIndex.rowTitle(published.id)).toHaveText("Published test E2E");
    });
  });

  // TC-03: Status filter hides non-matching tests
  test("TC-03: status filter hides non-matching tests", async ({ context, page }) => {
    const draft = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Draft test E2E",
      status: "draft",
    });
    const published = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published test E2E",
      status: "published",
    });

    await setupEducator(context, page, {
      tables: { tests: [draft, published], respondent_groups: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify both rows are visible initially", async () => {
      await expect(testsIndex.listRow(draft.id)).toBeVisible();
      await expect(testsIndex.listRow(published.id)).toBeVisible();
    });

    await test.step("Click the 'Koncepty' status tab", async () => {
      await testsIndex.statusTab("draft").click();
    });

    await test.step("Verify only the draft test row is visible", async () => {
      await expect(testsIndex.listRow(draft.id)).toBeVisible();
    });

    await test.step("Verify the published test row is not in the DOM", async () => {
      await expect(testsIndex.listRow(published.id)).toHaveCount(0);
    });
  });

  // TC-04: "Nový test" button navigates to /app/tests/new
  test("TC-04: 'Nový test' button navigates to /app/tests/new", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { tests: [], respondent_groups: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Click the 'Nový test' button", async () => {
      await testsIndex.newTestButton.click();
    });

    await test.step("Verify the URL changes to /app/tests/new", async () => {
      await expect(page).toHaveURL(/\/app\/tests\/new/);
    });
  });

  // TC-05: Clicking "Otvoriť" navigates to the test editor
  test("TC-05: clicking 'Otvoriť' navigates to the test editor", async ({ context, page }) => {
    const t = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Editor navigation test",
      status: "draft",
    });

    await setupEducator(context, page, {
      tables: { tests: [t], respondent_groups: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify the seeded test row is visible", async () => {
      await expect(testsIndex.listRow(t.id)).toBeVisible();
    });

    await test.step("Click the 'Otvoriť' button for the seeded test", async () => {
      await testsIndex.rowOpenButton(t.id).click();
    });

    await test.step("Verify the URL changes to /app/tests/<id>", async () => {
      await expect(page).toHaveURL(new RegExp(`/app/tests/${t.id}`));
    });
  });

  // TC-06: Duplicate action calls rpc/duplicate_test and refreshes the list.
  // (Un-fixme'd 2026-06-11 — the row action shipped with E50 review fix 5.)
  test("TC-06: duplicate action calls duplicate_test with the test id and the list refetches", async ({
    context,
    page,
  }) => {
    const t = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Duplicate me",
      status: "published",
    });
    const duplicateCalls: unknown[] = [];
    await setupEducator(context, page, {
      tables: { tests: [t], respondent_groups: [] },
      rpcs: {
        // Emulates the real duplicate_test: copies the row server-side and
        // returns the new id so the invalidation refetch sees the copy.
        duplicate_test: (body: unknown, ctx: RpcContext) => {
          duplicateCalls.push(body);
          const copy = seedTest({
            id: "tst_e2e_duplicate_copy",
            owner_id: EDUCATOR_SESSION.user.id,
            title: "Duplicate me (kópia)",
            status: "draft",
          });
          ctx.tables.tests.push(copy);
          return "tst_e2e_duplicate_copy";
        },
      },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests and verify the source row", async () => {
      await testsIndex.open();
      await expect(testsIndex.listRow(t.id)).toBeVisible();
    });

    await test.step("Click the 'Duplikovať' row action", async () => {
      await testsIndex.rowDuplicateButton(t.id).click();
    });

    await test.step("Verify the RPC body and the success toast", async () => {
      await expect(testsIndex.toast).toBeVisible();
      await expect(testsIndex.toast).toContainText("Kópia testu vytvorená.");
      expect(duplicateCalls).toEqual([{ p_test_id: t.id }]);
    });

    await test.step("Verify the copied row appears after the refetch", async () => {
      await expect(testsIndex.listRow("tst_e2e_duplicate_copy")).toBeVisible();
      await expect(testsIndex.rowTitle("tst_e2e_duplicate_copy")).toHaveText(
        "Duplicate me (kópia)",
      );
    });
  });

  // TC-07: Delete action — destructive ConfirmDialog with typed-confirm on
  // the test title; the row disappears after the DELETE + refetch.
  test("TC-07: delete action requires typing the test title and removes the row", async ({
    context,
    page,
  }) => {
    const t = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Delete me E2E",
      status: "draft",
    });
    await setupEducator(context, page, {
      tables: { tests: [t], respondent_groups: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests and verify the row", async () => {
      await testsIndex.open();
      await expect(testsIndex.listRow(t.id)).toBeVisible();
    });

    await test.step("Click the 'Vymazať' row action — the destructive dialog opens", async () => {
      await testsIndex.rowDeleteButton(t.id).click();
      await expect(testsIndex.confirmDialog).toBeVisible();
      await expect(testsIndex.confirmDialog).toHaveAttribute("data-severity", "destructive");
    });

    await test.step("Verify confirm stays disabled until the exact title is typed", async () => {
      await expect(testsIndex.confirmDialogConfirm).toBeDisabled();
      await testsIndex.confirmDialogTypedInput.fill("wrong title");
      await expect(testsIndex.confirmDialogConfirm).toBeDisabled();
      await testsIndex.confirmDialogTypedInput.fill("Delete me E2E");
      await expect(testsIndex.confirmDialogConfirm).toBeEnabled();
    });

    await test.step("Confirm the deletion", async () => {
      await testsIndex.confirmDialogConfirm.click();
    });

    await test.step("Verify the row is gone and the success toast shows", async () => {
      await expect(testsIndex.listRow(t.id)).toHaveCount(0);
      await expect(testsIndex.toast).toBeVisible();
      await expect(testsIndex.toast).toContainText("Test vymazaný.");
    });
  });
});
