import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminNavigationPage } from "../../poms/admin/AdminNavigationPage";
import type { CmsNavItem } from "../../../src/lib/admin/cms-types";

function navRow(
  overrides: Partial<CmsNavItem> & Pick<CmsNavItem, "id" | "label" | "url" | "position">,
): CmsNavItem {
  return {
    visible: true,
    open_in_new_tab: false,
    auth_only: false,
    ...overrides,
  };
}

const EMPTY_NAV = { cms_navigation: [{ id: 1, items: [] }] };

test.describe("/admin/navigation", () => {
  // TC-01: Empty state — empty-state paragraph renders when navigation has no items
  test("TC-01: empty state — empty-state paragraph renders when navigation has no items", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: EMPTY_NAV });
    const nav = new AdminNavigationPage(page);

    await test.step("Navigate to /admin/navigation", async () => {
      await nav.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(nav.root).toBeVisible();
    });

    await test.step("Verify the empty-state paragraph is visible with the correct text", async () => {
      await expect(nav.emptyState).toBeVisible();
      await expect(nav.emptyState).toHaveText("Navigácia je prázdna.");
    });

    await test.step("Verify the 'Pridať položku' button is visible", async () => {
      await expect(nav.addButton).toBeVisible();
    });
  });

  // TC-02: Populated list — nav items render in position order with label, URL, and controls
  test("TC-02: populated list — items render with label, URL, and position controls", async ({
    context,
    page,
  }) => {
    const items: CmsNavItem[] = [
      navRow({ id: "nav_a1", label: "Domov", url: "/", position: 1 }),
      navRow({
        id: "nav_b2",
        label: "Blog",
        url: "/blog",
        position: 2,
        visible: false,
        open_in_new_tab: true,
      }),
    ];
    await setupAdmin(context, page, {
      tables: { cms_navigation: [{ id: 1, items }] },
    });
    const nav = new AdminNavigationPage(page);

    await test.step("Navigate to /admin/navigation", async () => {
      await nav.open();
    });

    await test.step("Verify the empty-state paragraph is not present", async () => {
      await expect(nav.emptyState).toBeHidden();
    });

    await test.step("Verify the row for 'nav_a1' is visible and contains label and URL", async () => {
      await expect(nav.itemRow("nav_a1")).toBeVisible();
      await expect(nav.itemRow("nav_a1")).toContainText("Domov");
      await expect(nav.itemRow("nav_a1")).toContainText("/");
    });

    await test.step("Verify the row for 'nav_b2' is visible and contains label and URL", async () => {
      await expect(nav.itemRow("nav_b2")).toBeVisible();
      await expect(nav.itemRow("nav_b2")).toContainText("Blog");
      await expect(nav.itemRow("nav_b2")).toContainText("/blog");
    });

    await test.step("Verify the move-up button for 'nav_a1' is disabled (first item)", async () => {
      await expect(nav.itemMoveUpButton("nav_a1")).toBeDisabled();
    });

    await test.step("Verify the move-down button for 'nav_b2' is disabled (last item)", async () => {
      await expect(nav.itemMoveDownButton("nav_b2")).toBeDisabled();
    });
  });

  // TC-03: Add new nav item via dialog — form saved, row appears in list
  test("TC-03: add new nav item — dialog opens, fill label and URL, save adds row to list", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: EMPTY_NAV });
    const nav = new AdminNavigationPage(page);

    await test.step("Navigate to /admin/navigation", async () => {
      await nav.open();
    });

    await test.step("Click 'Pridať položku' and verify dialog opens with empty inputs", async () => {
      await nav.openAddDialog();
      await expect(nav.dialogLabelInput).toBeVisible();
      await expect(nav.dialogLabelInput).toHaveValue("");
      await expect(nav.dialogUrlInput).toHaveValue("");
    });

    await test.step("Type 'Kontakt' into the label input", async () => {
      await nav.dialogLabelInput.fill("Kontakt");
    });

    await test.step("Type '/kontakt' into the URL input", async () => {
      await nav.dialogUrlInput.fill("/kontakt");
    });

    await test.step("Click save and verify dialog closes", async () => {
      await nav.saveDialog();
    });

    await test.step("Verify the table now contains the new 'Kontakt' row with the correct URL", async () => {
      await expect(nav.root).toContainText("Kontakt");
      await expect(nav.root).toContainText("/kontakt");
    });
  });

  // TC-04: Edit existing item — change label, save, row reflects the update
  test("TC-04: edit existing item — dialog pre-filled, updated label reflected in row", async ({
    context,
    page,
  }) => {
    const items: CmsNavItem[] = [
      navRow({ id: "nav_edit1", label: "O nás", url: "/o-nas", position: 1 }),
    ];
    await setupAdmin(context, page, {
      tables: { cms_navigation: [{ id: 1, items }] },
    });
    const nav = new AdminNavigationPage(page);

    await test.step("Navigate to /admin/navigation and verify the row is visible", async () => {
      await nav.open();
      await expect(nav.itemRow("nav_edit1")).toBeVisible();
    });

    await test.step("Click the edit button for 'nav_edit1' and verify dialog opens pre-filled", async () => {
      await nav.openEditDialog("nav_edit1");
      await expect(nav.dialogLabelInput).toHaveValue("O nás");
      await expect(nav.dialogUrlInput).toHaveValue("/o-nas");
    });

    await test.step("Clear the label input and type 'O nás — nové'", async () => {
      await nav.dialogLabelInput.fill("O nás — nové");
    });

    await test.step("Click save and verify dialog closes", async () => {
      await nav.saveDialog();
    });

    await test.step("Verify the row now shows the updated label 'O nás — nové'", async () => {
      await expect(nav.itemRow("nav_edit1")).toContainText("O nás — nové");
    });
  });
});
