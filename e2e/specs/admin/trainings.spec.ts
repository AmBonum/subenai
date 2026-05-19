import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedTraining } from "../../seed";
import { AdminTrainingsPage } from "../../poms/admin/AdminTrainingsPage";

const TRAINING_ID = "tr_e2e_p01";

test.describe("/admin/trainings", () => {
  // TC-01: Empty state when no trainings are seeded
  test("TC-01: empty state renders when trainings table is empty", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { trainings: [] } });
    const trainings = new AdminTrainingsPage(page);

    await test.step("Navigate to /admin/trainings", async () => {
      await trainings.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(trainings.root).toBeVisible();
    });

    await test.step("Verify the empty-state block is visible with correct text", async () => {
      await expect(trainings.emptyState).toBeVisible();
      await expect(trainings.emptyState).toContainText("Žiadne školenia");
    });

    await test.step("Verify the 'Nové školenie' button is visible", async () => {
      await expect(trainings.newButton).toBeVisible();
    });
  });

  // TC-02: Populated list — training rows render with title and status badge
  test("TC-02: populated list renders row with title and action buttons", async ({
    context,
    page,
  }) => {
    const training = seedTraining({
      id: TRAINING_ID,
      title: "E2E Test Training",
      status: "published",
      topic_slug: "vseobecne",
    });
    await setupAdmin(context, page, { tables: { trainings: [training] } });
    const trainings = new AdminTrainingsPage(page);

    await test.step("Navigate to /admin/trainings", async () => {
      await trainings.open();
    });

    await test.step("Verify the empty-state block is not in the DOM", async () => {
      await expect(trainings.emptyState).toHaveCount(0);
    });

    await test.step("Verify the training row is visible", async () => {
      await expect(trainings.row(TRAINING_ID)).toBeVisible();
    });

    await test.step("Verify the training row contains the title", async () => {
      await expect(trainings.row(TRAINING_ID)).toContainText("E2E Test Training");
    });

    await test.step("Verify the edit button is visible on the row", async () => {
      await expect(trainings.rowEditButton(TRAINING_ID)).toBeVisible();
    });
  });

  // TC-03: "Nové školenie" button opens the TrainingEditor sheet
  test("TC-03: clicking 'Nové školenie' opens the TrainingEditor sheet", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { trainings: [] } });
    const trainings = new AdminTrainingsPage(page);

    await test.step("Navigate to /admin/trainings", async () => {
      await trainings.open();
    });

    await test.step("Click 'Nové školenie' and wait for the editor to open", async () => {
      await trainings.openNewEditor();
    });

    await test.step("Verify the title input is visible and empty", async () => {
      await expect(trainings.editorTitleInput).toBeVisible();
      await expect(trainings.editorTitleInput).toHaveValue("");
    });

    await test.step("Verify the save and cancel buttons are visible", async () => {
      await expect(trainings.editorSaveButton).toBeVisible();
      await expect(trainings.editorCancelButton).toBeVisible();
    });

    await test.step("Click cancel and verify the editor closes", async () => {
      await trainings.cancelEditor();
      await expect(trainings.editorTitleInput).toHaveCount(0);
    });
  });
});
