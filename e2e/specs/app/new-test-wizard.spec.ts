import type { BrowserContext, Page } from "@playwright/test";

import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { seedQuestion, type QuestionRow } from "../../seed";
import { NewTestWizardPage } from "../../poms/app/NewTestWizardPage";

// Test plan: specs/app/new-test-wizard.md
//
// Step 3 questions come from the `questions` table via useLibraryQuestions
// (QuestionPickerDialog). Publish = INSERT into `tests` (the mock generates
// the id via `generateIds`) followed by RPC replace_test_questions carrying
// the picked question ids in order.

interface WizardSetup {
  q1: QuestionRow;
  q2: QuestionRow;
  replaceCalls: unknown[];
}

async function setupWizard(
  context: BrowserContext,
  page: Page,
  opts: { replaceRpcFails?: boolean } = {},
): Promise<WizardSetup> {
  const q1 = seedQuestion({ status: "approved", prompt: "Prvá e2e otázka" });
  const q2 = seedQuestion({ status: "approved", prompt: "Druhá e2e otázka" });
  const replaceCalls: unknown[] = [];
  await setupEducator(context, page, {
    tables: {
      templates: [],
      respondent_groups: [],
      questions: [q1, q2],
      // `tests` is seeded empty by setupEducator; INSERT appends rows.
    },
    rpcs: opts.replaceRpcFails
      ? {}
      : {
          replace_test_questions: (body: unknown) => {
            replaceCalls.push(body);
            return null;
          },
        },
    errors: opts.replaceRpcFails
      ? { replace_test_questions: { status: 500, message: "replace failed (e2e)" } }
      : {},
    generateIds: ["tests"],
  });
  return { q1, q2, replaceCalls };
}

async function pickQuestions(wizard: NewTestWizardPage, ids: string[]): Promise<void> {
  await wizard.emptyStateCta.click();
  await expect(wizard.pickerDialog).toBeVisible();
  for (const id of ids) {
    await wizard.pickerRowCheckbox(id).click();
  }
  await wizard.pickerSubmitButton.click();
  await expect(wizard.pickerDialog).toHaveCount(0);
}

test.describe("/app/tests/new wizard", () => {
  test("walks all four steps and emits a /t/<shareId> link", async ({ context, page }) => {
    const { q1 } = await setupWizard(context, page);
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
      await pickQuestions(wizard, [q1.id]);
      await wizard.stepNext(3).click();
    });

    await test.step("step 4: share + publish redirect", async () => {
      await expect(wizard.stepRoot(4)).toBeVisible();
      await expect(wizard.shareLinkInput).toHaveValue(/\/t\/[a-zA-Z0-9]+$/);
      await wizard.shareCopyButton.click();
      await wizard.publishButton.click();
    });
  });

  // TC-01: Step 1 card renders with correct heading and progress indicator
  test("TC-01: step 1 renders heading 'Základy' and active progress bar segment", async ({
    context,
    page,
  }) => {
    await setupWizard(context, page);
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
  test("TC-02: step 1 Next button toggles disabled state with title input", async ({
    context,
    page,
  }) => {
    await setupWizard(context, page);
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

  // TC-03: Step 3 — picking a question enables Publish; empty state shows validation error
  test("TC-03: step 3 shows validation error when empty and Publish becomes enabled after picking a question", async ({
    context,
    page,
  }) => {
    const { q1 } = await setupWizard(context, page);
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

    await test.step("Pick the first question via the picker dialog", async () => {
      await pickQuestions(wizard, [q1.id]);
    });

    await test.step("Verify question row 0 is visible with the picked prompt", async () => {
      await expect(wizard.questionRow(0)).toBeVisible();
      await expect(wizard.questionRowPrompt(0)).toHaveText("Prvá e2e otázka");
    });

    await test.step("Verify the validation error is no longer visible", async () => {
      await expect(wizard.validationQuestions).toHaveCount(0);
    });

    await test.step("Verify the Publish button is now enabled", async () => {
      await expect(wizard.stepNext(3)).toBeEnabled();
    });
  });

  // TC-04: Happy publish — replace_test_questions carries both ids in order
  test("TC-04: publish inserts the test and calls replace_test_questions with both question ids in order", async ({
    context,
    page,
  }) => {
    const { q1, q2, replaceCalls } = await setupWizard(context, page);
    const wizard = new NewTestWizardPage(page);

    await test.step("Complete steps 1 and 2", async () => {
      await wizard.open();
      await wizard.titleInput.fill("E2E Wizard Test");
      await wizard.stepNext(1).click();
      await expect(wizard.stepRoot(2)).toBeVisible();
      await wizard.stepNext(2).click();
    });

    await test.step("Pick both questions on step 3", async () => {
      await expect(wizard.stepRoot(3)).toBeVisible();
      await pickQuestions(wizard, [q1.id, q2.id]);
      await expect(wizard.questionRow(1)).toBeVisible();
    });

    await test.step("Click Publish and verify success UI (step 4 + share link)", async () => {
      await wizard.stepNext(3).click();
      await expect(wizard.stepRoot(4)).toBeVisible();
      await expect(wizard.shareLinkInput).toHaveValue(/\/t\/[a-zA-Z0-9]+$/);
    });

    await test.step("Verify the RPC payload — both question ids, picked order", async () => {
      expect(replaceCalls).toHaveLength(1);
      const body = replaceCalls[0] as { p_test_id: string; p_question_ids: string[] };
      expect(body.p_question_ids).toEqual([q1.id, q2.id]);
      expect(body.p_test_id).toEqual(expect.any(String));
      expect(body.p_test_id.length).toBeGreaterThan(0);
    });
  });

  // TC-05: Step 4 Finish button navigates to the test detail route
  test("TC-05: Finish button on step 4 navigates to /app/tests/$testId", async ({
    context,
    page,
  }) => {
    const { q1 } = await setupWizard(context, page);
    const wizard = new NewTestWizardPage(page);

    await test.step("Complete the wizard to reach step 4", async () => {
      await wizard.open();
      await wizard.titleInput.fill("E2E Finish Test");
      await wizard.stepNext(1).click();
      await expect(wizard.stepRoot(2)).toBeVisible();
      await wizard.stepNext(2).click();
      await expect(wizard.stepRoot(3)).toBeVisible();
      await pickQuestions(wizard, [q1.id]);
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

  // TC-06: Negative publish — replace_test_questions 500 → error toast, no step 4
  test("TC-06: publish failure surfaces an error toast and the wizard stays on step 3", async ({
    context,
    page,
  }) => {
    const { q1, q2 } = await setupWizard(context, page, { replaceRpcFails: true });
    const wizard = new NewTestWizardPage(page);

    await test.step("Complete steps 1–3 with two questions", async () => {
      await wizard.open();
      await wizard.titleInput.fill("E2E Failing Publish");
      await wizard.stepNext(1).click();
      await expect(wizard.stepRoot(2)).toBeVisible();
      await wizard.stepNext(2).click();
      await expect(wizard.stepRoot(3)).toBeVisible();
      await pickQuestions(wizard, [q1.id, q2.id]);
    });

    await test.step("Click Publish while the RPC 500s", async () => {
      await wizard.stepNext(3).click();
    });

    await test.step("Verify the error toast carries the RPC error message", async () => {
      // Actual behavior: onError → toast.error(err.message) — the raw
      // Supabase error message, not a localized Slovak string.
      await expect(wizard.toast).toBeVisible();
      await expect(wizard.toast).toContainText("replace failed (e2e)");
    });

    await test.step("Verify the wizard does NOT show success (no step 4)", async () => {
      await expect(wizard.stepRoot(4)).toHaveCount(0);
      await expect(wizard.stepRoot(3)).toBeVisible();
    });
  });
});
