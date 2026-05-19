import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTest } from "../../seed";
import { TestEditorPage } from "../../poms/app/TestEditorPage";

const BASE_TEST = () =>
  seedTest({
    id: "tst_002",
    slug: "e2e-edit-target",
    share_id: "e2e-share-1234",
    owner_id: EDUCATOR_SESSION.user.id,
    title: "Editor target",
    status: "draft",
  });

const BASE_TABLES = (t1: ReturnType<typeof seedTest>) => ({
  tests: [t1],
  test_questions: [],
  sessions: [],
});

test.describe("/app/tests/$testId editor", () => {
  // TC-01: Editor renders page header title and status badge
  test("TC-01: editor renders page header title and status badge", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the root container is visible", async () => {
      await expect(editor.root).toBeVisible();
    });

    await test.step("Verify the page header title contains 'Editor target'", async () => {
      await expect(editor.pageHeaderTitle).toContainText("Editor target");
    });

    await test.step("Verify the status badge shows 'Koncept'", async () => {
      await expect(editor.statusBadge).toHaveText("Koncept");
    });
  });

  // TC-02: Tab switching updates the visible panel
  test("TC-02: tab switching shows the correct panel", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the results panel is visible on the default tab", async () => {
      await expect(editor.resultsPanel).toBeVisible();
    });

    await test.step("Click the analytics tab trigger", async () => {
      await editor.tabAnalytics.click();
    });

    await test.step("Verify the analytics panel is visible", async () => {
      await expect(editor.analyticsPanel).toBeVisible();
    });

    await test.step("Click the settings tab trigger", async () => {
      await editor.tabSettings.click();
    });

    await test.step("Verify the settings panel is visible", async () => {
      await expect(editor.settingsPanel).toBeVisible();
    });
  });

  // TC-03: Title edit in settings tab persists via save button
  test("TC-03: editing the title and saving fires the mutation without error", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor and navigate to the settings tab", async () => {
      await editor.open("tst_002");
      await editor.tabSettings.click();
    });

    await test.step("Verify the title input is visible", async () => {
      await expect(editor.titleInput).toBeVisible();
    });

    await test.step("Clear the title input and type 'Updated via e2e'", async () => {
      await editor.titleInput.clear();
      await editor.titleInput.fill("Updated via e2e");
    });

    await test.step("Click the save button", async () => {
      await editor.saveButton.click();
    });

    await test.step("Verify the title input retains 'Updated via e2e'", async () => {
      await expect(editor.titleInput).toHaveValue("Updated via e2e");
    });

    await test.step("Verify the save button is re-enabled after the mutation completes", async () => {
      await expect(editor.saveButton).toBeEnabled();
    });
  });

  // TC-04: Publish button transitions status badge from "Koncept" to "Publikované"
  test("TC-04: publish button transitions the status badge to 'Publikované'", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the initial status badge shows 'Koncept'", async () => {
      await expect(editor.statusBadge).toHaveText("Koncept");
    });

    await test.step("Click the publish button", async () => {
      await editor.publishButton.click();
    });

    await test.step("Verify the status badge transitions to 'Publikované'", async () => {
      await expect(editor.statusBadge).toHaveText("Publikované");
    });
  });

  // TC-05: Archive button is visible for a non-archived test and disappears after archive
  test("TC-05: archive button is visible and disappears after archiving", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the archive button is visible for a draft test", async () => {
      await expect(editor.archiveButton).toBeVisible();
    });

    await test.step("Click the archive button", async () => {
      await editor.archiveButton.click();
    });

    await test.step("Verify the archive button disappears after the test is archived", async () => {
      await expect(editor.archiveButton).toHaveCount(0);
    });
  });
});
