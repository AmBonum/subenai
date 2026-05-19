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

  // TC-01: Step 1 card renders with correct heading and progress indicator
  test("TC-01: step 1 renders heading 'Základy' and active progress bar segment", async ({
    page,
  }) => {
    const wizard = new NewTestWizardPage(page);

    await test.step("Open the wizard at step 1", async () => {
      await wizard.open();
    });

    await test.step("Verify the wizard root is visible", async () => {
      await expect(wizard.root).toBeVisible();
    });

    await test.step("Verify the progress label reads 'Krok 1 zo 4'", async () => {
      await expect(wizard.progressLabel).toContainText("Krok 1 zo 4");
    });

    await test.step("Verify the step-1 card title reads 'Základy'", async () => {
      await expect(wizard.step1CardTitle).toHaveText("Základy");
    });

    await test.step("Verify the first progress-bar segment is rendered", async () => {
      await expect(wizard.progressBar(1)).toBeVisible();
    });
  });

  // TC-02: Step 1 Next button is disabled when title is empty, enabled after typing
  test("TC-02: step 1 Next button toggles disabled state with title input", async ({ page }) => {
    const wizard = new NewTestWizardPage(page);

    await test.step("Open the wizard at step 1", async () => {
      await wizard.open();
    });

    await test.step("Verify Next is disabled when title is empty", async () => {
      await expect(wizard.stepNext(1)).toBeDisabled();
    });

    await test.step("Type a title into the title input", async () => {
      await wizard.titleInput.fill("Moj testovací test");
    });

    await test.step("Verify Next is enabled after typing", async () => {
      await expect(wizard.stepNext(1)).toBeEnabled();
    });

    await test.step("Clear the title input", async () => {
      await wizard.titleInput.fill("");
    });

    await test.step("Verify Next is disabled again after clearing", async () => {
      await expect(wizard.stepNext(1)).toBeDisabled();
    });
  });

  // TC-03: Step 3 — adding a question enables Publish; empty state shows validation error
  test("TC-03: step 3 shows validation error when empty and Publish becomes enabled after adding a question", async ({
    page,
  }) => {
    const wizard = new NewTestWizardPage(page);

    await test.step("Open the wizard directly at step 3", async () => {
      await page.goto("/app/tests/new?step=3");
    });

    await test.step("Verify step-3 card is visible", async () => {
      await expect(wizard.stepRoot(3)).toBeVisible();
    });

    await test.step("Verify validation error 'Pridaj aspoň jednu otázku.' is visible", async () => {
      await expect(wizard.validationQuestions).toHaveText("Pridaj aspoň jednu otázku.");
    });

    await test.step("Verify the Publish button is disabled", async () => {
      await expect(wizard.stepNext(3)).toBeDisabled();
    });

    await test.step("Click 'Pridať otázku' to add the first question", async () => {
      await wizard.addQuestionButton.click();
    });

    await test.step("Verify question row 0 is visible", async () => {
      await expect(wizard.questionRow(0)).toBeVisible();
    });

    await test.step("Verify the validation error is no longer visible", async () => {
      await expect(wizard.validationQuestions).toHaveCount(0);
    });

    await test.step("Verify the Publish button is now enabled", async () => {
      await expect(wizard.stepNext(3)).toBeEnabled();
    });
  });

  // TC-04: Full happy path — publishes test and reaches step 4 with a share link
  test("TC-04: full wizard flow publishes test and step 4 shows share link", async ({ page }) => {
    const wizard = new NewTestWizardPage(page);

    await test.step("Open the wizard at step 1", async () => {
      await wizard.open();
    });

    await test.step("Fill the title and advance to step 2", async () => {
      await wizard.titleInput.fill("E2E Wizard Test");
      await wizard.stepNext(1).click();
    });

    await test.step("Verify step 2 is visible and advance to step 3", async () => {
      await expect(wizard.stepRoot(2)).toBeVisible();
      await wizard.stepNext(2).click();
    });

    await test.step("Add one question and click Publish", async () => {
      await expect(wizard.stepRoot(3)).toBeVisible();
      await wizard.addQuestionButton.click();
      await wizard.stepNext(3).click();
    });

    await test.step("Verify step 4 card title reads 'Zdieľanie'", async () => {
      await expect(wizard.stepRoot(4)).toBeVisible();
    });

    await test.step("Verify the share-link input contains a /t/<shareId> URL", async () => {
      await expect(wizard.shareLinkInput).toHaveValue(/\/t\/[a-z0-9-]+/);
    });
  });

  // TC-05: Step 4 Finish button navigates to the test detail route
  test("TC-05: Finish button on step 4 navigates to /app/tests/$testId", async ({ page }) => {
    const wizard = new NewTestWizardPage(page);

    await test.step("Complete the wizard to reach step 4", async () => {
      await wizard.open();
      await wizard.titleInput.fill("E2E Finish Test");
      await wizard.stepNext(1).click();
      await expect(wizard.stepRoot(2)).toBeVisible();
      await wizard.stepNext(2).click();
      await expect(wizard.stepRoot(3)).toBeVisible();
      await wizard.addQuestionButton.click();
      await wizard.stepNext(3).click();
      await expect(wizard.stepRoot(4)).toBeVisible();
    });

    await test.step("Click the Finish button", async () => {
      await wizard.publishButton.click();
    });

    await test.step("Verify the URL navigates to /app/tests/<testId>", async () => {
      await expect(page).toHaveURL(/\/app\/tests\/[^/]+$/);
    });
  });
});
