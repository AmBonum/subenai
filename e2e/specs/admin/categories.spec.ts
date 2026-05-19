import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedCategory, seedTopic } from "../../seed";
import { AdminCategoriesPage } from "../../poms/admin/AdminCategoriesPage";

const EMPTY_TABLES = {
  categories: [],
  topics: [],
};

test.describe("/admin/categories", () => {
  // TC-01: Empty state — both lists render with no rows when tables are empty
  test("TC-01: empty state — both lists render with no rows when tables are empty", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: EMPTY_TABLES });
    const cats = new AdminCategoriesPage(page);

    await test.step("Navigate to /admin/categories", async () => {
      await cats.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(cats.root).toBeVisible();
    });

    await test.step("Verify branches list is in the DOM with no row children", async () => {
      await expect(cats.branchesList).toHaveCount(1);
      await expect(cats.branchesList.locator("li")).toHaveCount(0);
    });

    await test.step("Verify topics list is in the DOM with no row children", async () => {
      await expect(cats.topicsList).toHaveCount(1);
      await expect(cats.topicsList.locator("li")).toHaveCount(0);
    });

    await test.step("Verify 'Nová branža' and 'Nová téma' buttons are visible", async () => {
      await expect(cats.newBranchButton).toBeVisible();
      await expect(cats.newTopicButton).toBeVisible();
    });
  });

  // TC-02: Populated list — branch and topic rows render with name and slug
  test("TC-02: populated list — branch and topic rows render with name and slug", async ({
    context,
    page,
  }) => {
    const branch = seedCategory({ id: "cat_001", name: "E-shop", slug: "eshop" });
    const topic = seedTopic({ id: "top_001", name: "SEO", slug: "eshop-seo" });
    await setupAdmin(context, page, {
      tables: { categories: [branch], topics: [topic] },
    });
    const cats = new AdminCategoriesPage(page);

    await test.step("Navigate to /admin/categories", async () => {
      await cats.open();
    });

    await test.step("Verify the branch row is visible", async () => {
      await expect(cats.branchRow("cat_001")).toBeVisible();
    });

    await test.step("Verify the branch row contains the name and slug", async () => {
      await expect(cats.branchRow("cat_001")).toContainText("E-shop");
      await expect(cats.branchRow("cat_001")).toContainText("/eshop");
    });

    await test.step("Verify the topic row is visible", async () => {
      await expect(cats.topicRow("top_001")).toBeVisible();
    });

    await test.step("Verify the topic row contains the name and slug", async () => {
      await expect(cats.topicRow("top_001")).toContainText("SEO");
      await expect(cats.topicRow("top_001")).toContainText("/eshop-seo");
    });
  });

  // TC-03: Create new branch — dialog opens, name filled, save adds a row
  test("TC-03: create new branch — dialog opens, fill name, save adds row to list", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: EMPTY_TABLES });
    const cats = new AdminCategoriesPage(page);

    await test.step("Navigate to /admin/categories", async () => {
      await cats.open();
    });

    await test.step("Click 'Nová branža' and verify dialog opens with empty name input", async () => {
      await cats.openNewBranchDialog();
      await expect(cats.dialogNameInput).toBeVisible();
      await expect(cats.dialogNameInput).toHaveValue("");
    });

    await test.step("Verify save button is disabled when name is empty", async () => {
      await expect(cats.dialogSaveButton).toBeDisabled();
    });

    await test.step("Type 'Logistika' into the name input", async () => {
      await cats.dialogNameInput.fill("Logistika");
    });

    await test.step("Verify save button becomes enabled after name is entered", async () => {
      await expect(cats.dialogSaveButton).toBeEnabled();
    });

    await test.step("Click save and verify dialog closes", async () => {
      await cats.saveDialog();
      await expect(cats.dialogNameInput).toBeHidden();
    });

    await test.step("Verify the branches list contains the new 'Logistika' row", async () => {
      await expect(cats.branchesList).toContainText("Logistika");
    });
  });

  // TC-04: Edit existing branch — dialog opens pre-filled, changed name reflected in row
  test("TC-04: edit existing branch — dialog pre-filled, updated name reflected in row", async ({
    context,
    page,
  }) => {
    const branch = seedCategory({ id: "cat_e2e_edit", name: "Gastro", slug: "gastro" });
    await setupAdmin(context, page, {
      tables: { categories: [branch], topics: [] },
    });
    const cats = new AdminCategoriesPage(page);

    await test.step("Navigate to /admin/categories and verify branch row is visible", async () => {
      await cats.open();
      await expect(cats.branchRow("cat_e2e_edit")).toBeVisible();
    });

    await test.step("Click the edit button for the branch row", async () => {
      await cats.openEditBranchDialog("cat_e2e_edit");
    });

    await test.step("Verify dialog is open and name input is pre-filled with 'Gastro'", async () => {
      await expect(cats.dialogNameInput).toBeVisible();
      await expect(cats.dialogNameInput).toHaveValue("Gastro");
    });

    await test.step("Clear the name input and type 'Gastronomia'", async () => {
      await cats.dialogNameInput.fill("Gastronomia");
    });

    await test.step("Click save and verify dialog closes", async () => {
      await cats.saveDialog();
      await expect(cats.dialogNameInput).toBeHidden();
    });

    await test.step("Verify the branch row now shows the updated name 'Gastronomia'", async () => {
      await expect(cats.branchRow("cat_e2e_edit")).toContainText("Gastronomia");
    });
  });
});
