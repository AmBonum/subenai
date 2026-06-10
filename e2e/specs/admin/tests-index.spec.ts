import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedTest } from "../../seed";
import { AdminTestsIndexPage } from "../../poms/admin/AdminTestsIndexPage";

test.describe("/admin/tests index", () => {
  // TC-01: Empty state when no tests are seeded
  test("TC-01: empty state renders when no tests are seeded", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { tests: [] } });
    const p = new AdminTestsIndexPage(page);

    await test.step("Navigate to /admin/tests", async () => {
      await p.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(p.root).toBeVisible();
    });

    await test.step('Verify the empty-state element is visible with text "Žiadne testy v tomto filtri."', async () => {
      await expect(p.emptyState).toBeVisible();
      await expect(p.emptyState).toHaveText("Žiadne testy v tomto filtri.");
    });
  });

  // TC-02: Populated list — rows render with title and status badge
  test("TC-02: populated list renders rows with title and status badge", async ({
    context,
    page,
  }) => {
    const draft = seedTest({ title: "Draft Alpha", status: "draft" });
    const published = seedTest({ title: "Published Beta", status: "published" });
    await setupAdmin(context, page, { tables: { tests: [draft, published] } });
    const p = new AdminTestsIndexPage(page);

    await test.step("Navigate to /admin/tests", async () => {
      await p.open();
    });

    await test.step("Verify both list rows are visible", async () => {
      await expect(p.listRow(draft.id)).toBeVisible();
      await expect(p.listRow(published.id)).toBeVisible();
    });

    await test.step("Verify each row title displays the correct text", async () => {
      await expect(p.rowTitle(draft.id)).toHaveText("Draft Alpha");
      await expect(p.rowTitle(published.id)).toHaveText("Published Beta");
    });

    await test.step('Verify the draft row status badge carries data-status="draft"', async () => {
      await expect(p.rowStatusBadge(draft.id)).toHaveAttribute("data-status", "draft");
    });

    await test.step('Verify the published row status badge carries data-status="published"', async () => {
      await expect(p.rowStatusBadge(published.id)).toHaveAttribute("data-status", "published");
    });
  });

  // TC-03: Search filter narrows the list to matching rows
  test("TC-03: search filter narrows the list to matching rows", async ({ context, page }) => {
    const alpha = seedTest({ title: "Alpha test", status: "draft" });
    const beta = seedTest({ title: "Beta test", status: "draft" });
    await setupAdmin(context, page, { tables: { tests: [alpha, beta] } });
    const p = new AdminTestsIndexPage(page);

    await test.step("Navigate to /admin/tests and verify both rows are visible", async () => {
      await p.open();
      await expect(p.listRow(alpha.id)).toBeVisible();
      await expect(p.listRow(beta.id)).toBeVisible();
    });

    await test.step('Type "Alpha" into the search input', async () => {
      await p.searchInput.fill("Alpha");
    });

    await test.step("Verify only the Alpha row remains visible", async () => {
      await expect(p.listRow(alpha.id)).toBeVisible();
    });

    await test.step("Verify the Beta row is no longer in the DOM", async () => {
      await expect(p.listRow(beta.id)).toHaveCount(0);
    });
  });

  // TC-04: Status filter hides non-matching tests
  test("TC-04: status filter hides non-matching tests", async ({ context, page }) => {
    const draft = seedTest({ title: "Draft test", status: "draft" });
    const published = seedTest({ title: "Published test", status: "published" });
    await setupAdmin(context, page, { tables: { tests: [draft, published] } });
    const p = new AdminTestsIndexPage(page);

    await test.step("Navigate to /admin/tests and verify both rows are visible", async () => {
      await p.open();
      await expect(p.listRow(draft.id)).toBeVisible();
      await expect(p.listRow(published.id)).toBeVisible();
    });

    await test.step('Click the status filter and select "Koncept"', async () => {
      await p.statusFilter.click();
      await p.filterOption("Koncept").click();
    });

    await test.step("Verify only the draft row is visible", async () => {
      await expect(p.listRow(draft.id)).toBeVisible();
    });

    await test.step("Verify the published row is no longer in the DOM", async () => {
      await expect(p.listRow(published.id)).toHaveCount(0);
    });
  });

  // TC-05: Click "Otvoriť" navigates to the test editor
  test("TC-05: clicking 'Otvoriť' navigates to the test editor", async ({ context, page }) => {
    const t = seedTest({ title: "Editor nav test", status: "draft" });
    await setupAdmin(context, page, { tables: { tests: [t] } });
    const p = new AdminTestsIndexPage(page);

    await test.step("Navigate to /admin/tests", async () => {
      await p.open();
    });

    await test.step("Verify the seeded test row is visible", async () => {
      await expect(p.listRow(t.id)).toBeVisible();
    });

    await test.step("Click the 'Otvoriť' button for the seeded test", async () => {
      await p.rowOpenButton(t.id).click();
    });

    await test.step("Verify the URL changes to /admin/tests/{id}", async () => {
      await expect(page).toHaveURL(new RegExp(`/admin/tests/${t.id}`));
    });
  });

  // TC-06: Row delete — confirm dialog appears and removes the row
  test("TC-06: row delete confirm dialog removes the row", async ({ context, page }) => {
    const t = seedTest({ title: "Delete Me", status: "draft" });
    await setupAdmin(context, page, { tables: { tests: [t] } });
    const p = new AdminTestsIndexPage(page);

    await test.step("Navigate to /admin/tests and verify the row is present", async () => {
      await p.open();
      await expect(p.listRow(t.id)).toBeVisible();
    });

    await test.step("Click the delete icon button for the seeded row", async () => {
      await p.rowDeleteButton(t.id).click();
    });

    await test.step('Verify the confirm dialog is visible with title "Vymazať vybraté testy?"', async () => {
      await expect(p.confirmDialog).toBeVisible();
      await expect(p.confirmDialogTitle).toHaveText("Vymazať vybraté testy?");
    });

    await test.step("Click the confirm button", async () => {
      await p.confirmDialogConfirm.click();
    });

    await test.step("Verify the dialog closes and the row is no longer in the DOM", async () => {
      await expect(p.confirmDialog).toBeHidden();
      await expect(p.listRow(t.id)).toHaveCount(0);
    });

    await test.step("Verify the empty-state element becomes visible", async () => {
      await expect(p.emptyState).toBeVisible();
    });
  });
});
