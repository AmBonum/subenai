import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedQuestion } from "../../seed";
import { seedAnswerSet } from "../../seed";
import { AdminQuestionsPage } from "../../poms/admin/AdminQuestionsPage";

const EMPTY_TABLES = {
  questions: [],
  answer_sets: [],
  answers: [],
};

test.describe("/admin/questions", () => {
  // TC-01: Empty state when no questions seeded
  test("TC-01: empty state renders when no questions are seeded", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: EMPTY_TABLES });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions", async () => {
      await q.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(q.root).toBeVisible();
    });

    await test.step('Verify the empty-state cell contains "Žiadne výsledky"', async () => {
      await expect(q.emptyState).toBeVisible();
      await expect(q.emptyState).toHaveText("Žiadne výsledky");
    });

    await test.step('Verify pagination summary reads "Zobrazených 0 z 0 (celkom 0)"', async () => {
      await expect(q.paginationSummary).toHaveText("Zobrazených 0 z 0 (celkom 0)");
    });
  });

  // TC-02: Populated list — table rows render with title + status badge
  test("TC-02: populated list renders rows with title and status badge", async ({
    context,
    page,
  }) => {
    const q1 = seedQuestion({
      id: "aq_001",
      prompt: "Alpha question",
      status: "published",
      branch_slug: "eshop",
    });
    const q2 = seedQuestion({
      id: "aq_002",
      prompt: "Beta question",
      status: "pending",
      branch_slug: "gastro",
    });
    await setupAdmin(context, page, {
      tables: { questions: [q1, q2], answer_sets: [], answers: [] },
    });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions", async () => {
      await q.open();
    });

    await test.step("Verify both list rows are visible", async () => {
      await expect(q.listRow("aq_001")).toBeVisible();
      await expect(q.listRow("aq_002")).toBeVisible();
    });

    await test.step("Verify first row contains its question title", async () => {
      await expect(q.listRow("aq_001")).toContainText("Alpha question");
    });

    await test.step('Verify pagination summary reads "Zobrazených 2 z 2 (celkom 2)"', async () => {
      await expect(q.paginationSummary).toHaveText("Zobrazených 2 z 2 (celkom 2)");
    });
  });

  // TC-03: Search filter narrows the list to matching rows
  test("TC-03: search filter narrows the list to matching rows", async ({ context, page }) => {
    const q1 = seedQuestion({ id: "aq_011", prompt: "Alpha question", status: "published" });
    const q2 = seedQuestion({ id: "aq_012", prompt: "Beta question", status: "published" });
    await setupAdmin(context, page, {
      tables: { questions: [q1, q2], answer_sets: [], answers: [] },
    });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions and verify both rows are present", async () => {
      await q.open();
      await expect(q.listRow("aq_011")).toBeVisible();
      await expect(q.listRow("aq_012")).toBeVisible();
    });

    await test.step('Type "Alpha" into the search input', async () => {
      await q.searchInput.fill("Alpha");
    });

    await test.step("Verify only the Alpha row remains visible", async () => {
      await expect(q.listRow("aq_011")).toBeVisible();
    });

    await test.step("Verify the Beta row is no longer rendered", async () => {
      await expect(q.listRow("aq_012")).toHaveCount(0);
    });

    await test.step('Verify pagination summary reads "Zobrazených 1 z 1 (celkom 2)"', async () => {
      await expect(q.paginationSummary).toHaveText("Zobrazených 1 z 1 (celkom 2)");
    });
  });

  // TC-04: Branch filter narrows the list to matching branch
  test("TC-04: branch filter narrows the list to matching branch", async ({ context, page }) => {
    const q1 = seedQuestion({ id: "aq_021", prompt: "Eshop question", branch_slug: "eshop" });
    const q2 = seedQuestion({ id: "aq_022", prompt: "Gastro question", branch_slug: "gastro" });
    await setupAdmin(context, page, {
      tables: { questions: [q1, q2], answer_sets: [], answers: [] },
    });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions and verify both rows are present", async () => {
      await q.open();
      await expect(q.listRow("aq_021")).toBeVisible();
      await expect(q.listRow("aq_022")).toBeVisible();
    });

    await test.step('Select "E-shop" from the branch filter', async () => {
      await q.branchFilter.click();
      await page.getByRole("option", { name: "E-shop" }).click();
    });

    await test.step("Verify only the eshop row is visible", async () => {
      await expect(q.listRow("aq_021")).toBeVisible();
    });

    await test.step("Verify the gastro row is no longer rendered", async () => {
      await expect(q.listRow("aq_022")).toHaveCount(0);
    });

    await test.step('Verify pagination summary reads "Zobrazených 1 z 1 (celkom 2)"', async () => {
      await expect(q.paginationSummary).toHaveText("Zobrazených 1 z 1 (celkom 2)");
    });
  });

  // TC-05: Create new question — editor opens with correct title, cancel closes it
  test("TC-05: new-question editor opens and can be dismissed", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: EMPTY_TABLES });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions", async () => {
      await q.open();
    });

    await test.step('Click the "Nová otázka" button', async () => {
      await q.openNewEditor();
    });

    await test.step('Verify the editor dialog is visible with title "Nová otázka"', async () => {
      await expect(q.editorDialog).toBeVisible();
      await expect(q.editorDialogTitle).toHaveText("Nová otázka");
    });

    await test.step("Verify the title and excerpt inputs are empty and visible", async () => {
      await expect(q.editorTitleInput).toBeVisible();
      await expect(q.editorTitleInput).toHaveValue("");
      await expect(q.editorExcerptInput).toBeVisible();
    });

    await test.step("Fill in a title and excerpt", async () => {
      await q.editorTitleInput.fill("E2E New Question");
      await q.editorExcerptInput.fill("Short description for e2e test.");
    });

    await test.step('Click "Zrušiť" and verify the dialog closes', async () => {
      await q.dismissEditor();
      await expect(q.editorDialog).toBeHidden();
    });
  });

  // TC-06: Edit existing question — open editor, change title, save → row updates
  test("TC-06: edit existing question — changed title reflected in table row", async ({
    context,
    page,
  }) => {
    const as1 = seedAnswerSet({ id: "as_e2e_tc06" });
    const correctAnswer = {
      id: "ans_c_001",
      set_id: "as_e2e_tc06",
      text: "Correct answer A",
      is_correct: true,
      explanation: null,
    };
    const wrongAnswer1 = {
      id: "ans_w_001",
      set_id: "as_e2e_tc06",
      text: "Wrong answer A",
      is_correct: false,
      explanation: null,
    };
    const wrongAnswer2 = {
      id: "ans_w_002",
      set_id: "as_e2e_tc06",
      text: "Wrong answer B",
      is_correct: false,
      explanation: null,
    };
    const q1 = seedQuestion({
      id: "aq_031",
      prompt: "Original Title",
      status: "published",
      answer_set_id: "as_e2e_tc06",
    });
    await setupAdmin(context, page, {
      tables: {
        questions: [q1],
        answer_sets: [as1],
        answers: [correctAnswer, wrongAnswer1, wrongAnswer2],
      },
    });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions", async () => {
      await q.open();
      await expect(q.listRow("aq_031")).toBeVisible();
    });

    await test.step("Click the edit button for the seeded question", async () => {
      await q.openEditorForRow("aq_031");
    });

    await test.step('Verify the editor opens with title "Upraviť otázku"', async () => {
      await expect(q.editorDialog).toBeVisible();
      await expect(q.editorDialogTitle).toHaveText("Upraviť otázku");
    });

    await test.step("Verify the title input is pre-filled with the current title", async () => {
      await expect(q.editorTitleInput).toHaveValue("Original Title");
    });

    await test.step("Update the SK body textarea with a new single-line prompt", async () => {
      await q.editorBodySk.fill("Updated Title");
    });

    await test.step("Select the correct answer and two incorrect answers to pass validation", async () => {
      await q.editorCorrectOption("ans_c_001").click();
      await q.editorIncorrectOption("ans_w_001").click();
      await q.editorIncorrectOption("ans_w_002").click();
    });

    await test.step('Click "Uložiť zmeny"', async () => {
      await q.editorSaveButton.click();
    });

    await test.step("Verify the dialog closes after save", async () => {
      await expect(q.editorDialog).toBeHidden();
    });

    await test.step("Verify the table row now shows the updated prompt text", async () => {
      await expect(q.listRow("aq_031")).toContainText("Updated Title");
    });
  });

  // TC-07: i18n tab switch in editor — sk → en → cs each shows its own textarea
  test("TC-07: i18n tab switch shows sk/en/cs textareas without bleeding", async ({
    context,
    page,
  }) => {
    const q1 = seedQuestion({ id: "aq_041", prompt: "Tab test question", status: "pending" });
    await setupAdmin(context, page, {
      tables: { questions: [q1], answer_sets: [], answers: [] },
    });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions and open the editor", async () => {
      await q.open();
      await q.openEditorForRow("aq_041");
      await expect(q.editorDialog).toBeVisible();
    });

    await test.step("Verify the SK tab is selected by default", async () => {
      await expect(q.editorTab("sk")).toHaveAttribute("aria-selected", "true");
    });

    await test.step("Verify the SK body textarea is visible", async () => {
      await expect(q.editorBodySk).toBeVisible();
    });

    await test.step("Click the EN tab", async () => {
      await q.editorTab("en").click();
    });

    await test.step("Verify the EN tab becomes selected", async () => {
      await expect(q.editorTab("en")).toHaveAttribute("aria-selected", "true");
    });

    await test.step("Verify the EN body textarea is visible and SK body is hidden", async () => {
      await expect(q.editorBodyEn).toBeVisible();
      await expect(q.editorBodySk).toBeHidden();
    });

    await test.step("Click the CS tab", async () => {
      await q.editorTab("cs").click();
    });

    await test.step("Verify the CS tab becomes selected", async () => {
      await expect(q.editorTab("cs")).toHaveAttribute("aria-selected", "true");
    });

    await test.step("Verify the CS body textarea is visible and EN body is hidden", async () => {
      await expect(q.editorBodyCs).toBeVisible();
      await expect(q.editorBodyEn).toBeHidden();
    });
  });

  // TC-08: Delete question via row dropdown → confirm dialog → row removed
  test("TC-08: delete question via dropdown confirm dialog removes the row", async ({
    context,
    page,
  }) => {
    const q1 = seedQuestion({ id: "aq_051", prompt: "Delete Me", status: "published" });
    await setupAdmin(context, page, {
      tables: { questions: [q1], answer_sets: [], answers: [] },
    });
    const q = new AdminQuestionsPage(page);

    await test.step("Navigate to /admin/questions and verify the row is present", async () => {
      await q.open();
      await expect(q.listRow("aq_051")).toBeVisible();
    });

    await test.step("Click the row's dropdown menu trigger", async () => {
      await q.openRowMenu("aq_051");
    });

    await test.step('Click the "Vymazať" item in the dropdown', async () => {
      await q.clickRowDeleteItem("aq_051");
    });

    await test.step('Verify the confirm dialog appears with title "Vymazať otázku?"', async () => {
      await expect(q.confirmDialog).toBeVisible();
      await expect(q.confirmDialogTitle).toHaveText("Vymazať otázku?");
    });

    await test.step('Verify the dialog description contains "Delete Me"', async () => {
      await expect(q.confirmDialogDescription).toContainText("Delete Me");
    });

    await test.step("Click the confirm button", async () => {
      await q.confirmDialogConfirm.click();
    });

    await test.step("Verify the dialog closes", async () => {
      await expect(q.confirmDialog).toBeHidden();
    });

    await test.step("Verify the deleted row is no longer in the DOM", async () => {
      await expect(q.listRow("aq_051")).toHaveCount(0);
    });

    await test.step("Verify the empty-state cell is now visible", async () => {
      await expect(q.emptyState).toBeVisible();
    });
  });
});
