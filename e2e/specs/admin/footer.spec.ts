import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminFooterPage } from "../../poms/admin/AdminFooterPage";

const ONE_COLUMN = {
  cms_footer: [
    {
      id: 1,
      columns: [{ id: "col_1", title: "Spoločnosť", links: [] }],
      socials: [],
    },
  ],
};

test.describe("Admin Footer CMS", () => {
  // TC-01: Page renders the footer form with at least one seeded column and the add-column button
  test("TC-01: page renders form root, seeded column card and add-column button", async ({
    context,
    page,
  }) => {
    const footer = new AdminFooterPage(page);

    await test.step("Set up admin session with one seeded column", async () => {
      await setupAdmin(context, page, { tables: ONE_COLUMN });
    });

    await test.step("Navigate to /admin/footer", async () => {
      await footer.open();
    });

    await test.step("Verify the form root is visible", async () => {
      await expect(footer.formRoot).toBeVisible();
    });

    await test.step("Verify the column-0 card is visible (waits for async query)", async () => {
      await expect(footer.columnCard(0)).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Verify the column-0 title input has value 'Spoločnosť'", async () => {
      await expect(footer.columnTitleInput(0)).toHaveValue("Spoločnosť");
    });

    await test.step("Verify the 'Pridať stĺpec' button is visible", async () => {
      await expect(footer.addColumnButton).toBeVisible();
    });

    await test.step("Verify the save button is visible", async () => {
      await expect(footer.saveButton).toBeVisible();
    });
  });

  // TC-02: Edit column title — typing into the title input fires the mutation and the toast appears on save
  test("TC-02: editing column title and clicking save shows the 'Päta uložená.' toast", async ({
    context,
    page,
  }) => {
    const footer = new AdminFooterPage(page);

    await test.step("Set up admin session with one seeded column", async () => {
      await setupAdmin(context, page, { tables: ONE_COLUMN });
    });

    await test.step("Navigate to /admin/footer", async () => {
      await footer.open();
    });

    await test.step("Wait for column-0 to appear then clear the title input and type 'O nás'", async () => {
      await footer.columnTitleInput(0).waitFor({ state: "visible", timeout: 15_000 });
      await footer.columnTitleInput(0).fill("O nás");
    });

    await test.step("Click the save button", async () => {
      await footer.saveButton.click();
    });

    await test.step("Verify the success toast 'Päta uložená.' is visible", async () => {
      await expect(page.getByText("Päta uložená.")).toBeVisible();
    });
  });

  // TC-03: Add a new column — the column card count increases by one
  test("TC-03: clicking 'Pridať stĺpec' adds a second column card", async ({ context, page }) => {
    const footer = new AdminFooterPage(page);

    await test.step("Set up admin session with one seeded column", async () => {
      await setupAdmin(context, page, { tables: ONE_COLUMN });
    });

    await test.step("Navigate to /admin/footer", async () => {
      await footer.open();
    });

    await test.step("Wait for query to resolve then verify exactly one column card exists", async () => {
      await expect(footer.columnCard(0)).toBeVisible({ timeout: 15_000 });
      await expect(footer.columnCard(1)).toBeHidden();
    });

    await test.step("Click the 'Pridať stĺpec' button", async () => {
      await footer.addColumnButton.click();
    });

    await test.step("Verify the new column card at index 1 is visible", async () => {
      await expect(footer.columnCard(1)).toBeVisible();
    });
  });
});
