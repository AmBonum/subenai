import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { NewTestWizardPage } from "../../poms/app/NewTestWizardPage";

// The wizard's question picker comes from a non-Supabase in-memory mock
// store (see comment in src/routes/app.tests.new.tsx), so we don't need
// to seed the `questions` table. The publish step calls useCreateTest →
// INSERT into `tests`; the mockSupabase POST handler returns the row.

test.describe("/app/tests/new wizard", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        templates: [],
        respondent_groups: [],
        // tests + test seed lives in mockSupabase defaults; INSERT appends rows.
      },
    });
  });

  test("walks all four steps and emits a /t/<shareId> link", async ({ page }) => {
    const wizard = new NewTestWizardPage(page);
    await wizard.open();

    await test.step("step 1: basics", async () => {
      await expect(wizard.stepRoot(1)).toBeVisible();
      await wizard.titleInput.fill("E2E test");
      await wizard.stepNext(1).click();
    });

    await test.step("step 2: audience", async () => {
      await expect(wizard.stepRoot(2)).toBeVisible();
      await wizard.stepNext(2).click();
    });

    await test.step("step 3: questions", async () => {
      await expect(wizard.stepRoot(3)).toBeVisible();
      await wizard.addQuestionButton.click();
      await wizard.stepNext(3).click();
    });

    await test.step("step 4: share + publish redirect", async () => {
      await expect(wizard.stepRoot(4)).toBeVisible();
      await expect(wizard.shareLinkInput).toHaveValue(/\/t\/[a-z0-9-]+$/);
      await wizard.shareCopyButton.click();
      await wizard.publishButton.click();
    });
  });
});
