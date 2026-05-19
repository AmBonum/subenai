import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedAnswerSet } from "../../seed";
import { AnswerSetEditorPage } from "../../poms/admin/AnswerSetEditorPage";

// PHASE-3 blocked: same nested-route-missing-Outlet defect as
// admin/test-editor.spec.ts. `src/routes/admin/answer-sets.lazy.tsx`
// renders the answer-sets list page but does not include an `<Outlet/>`,
// so /admin/answer-sets/$setId renders the list, not the
// `AnswerSetDetailPage` from `answer-sets.$setId.lazy.tsx`. Same fix
// applies — add Outlet to the parent lazy file. See test-editor.spec.ts
// for the full diagnosis.

test.describe("/admin/answer-sets/$setId — answer set editor", () => {
  test.skip(true, "PHASE-3 blocked: admin nested routes missing <Outlet/>");

  test.beforeEach(async ({ context, page }) => {
    const set = seedAnswerSet({ id: "as_001", name: "E2E ladená sada" });
    await setupAdmin(context, page, {
      tables: {
        answer_sets: [set],
        answers: [],
        questions: [],
      },
    });
  });

  test("load → open edit dialog → save → reload-and-verify", async ({ page }) => {
    const editor = new AnswerSetEditorPage(page);

    await test.step("load the editor for a seeded set", async () => {
      await editor.open("as_001");
      await expect(editor.root).toBeVisible();
      await expect(editor.correctColumn).toBeVisible();
      await expect(editor.incorrectColumn).toBeVisible();
    });

    await test.step("open meta-edit dialog", async () => {
      await editor.editMetaButton.click();
      await expect(editor.titleInput).toBeVisible();
    });

    await test.step("edit the title and save", async () => {
      await editor.titleInput.fill("E2E ladená sada — edited");
      await editor.saveButton.click();
    });

    await test.step("reload and verify persistence", async () => {
      await editor.open("as_001");
      await expect(editor.root).toBeVisible();
    });
  });

  test("save with empty title surfaces an inline error", async ({ page }) => {
    const editor = new AnswerSetEditorPage(page);
    await editor.open("as_001");
    await editor.editMetaButton.click();
    await editor.titleInput.fill("");
    await editor.saveButton.click();
    await expect(page.getByTestId("answer-set-editor-error")).toBeVisible();
  });
});
