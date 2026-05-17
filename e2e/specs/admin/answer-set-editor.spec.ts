import { test, expect } from "@playwright/test";
import { AnswerSetEditorPage } from "../../poms/admin/AnswerSetEditorPage";

test.describe("/admin/answer-sets/$setId — answer set editor", () => {
  // AH-11 ships the admin-session fixture. Until then this spec is wired but
  // skipped: the route lives behind /admin auth which the mock store cannot
  // satisfy from a fresh browser context.
  test.skip(true, "AH-11 provides an admin-session fixture");

  test("load → edit → save → reload-and-verify", async ({ page }) => {
    const editor = new AnswerSetEditorPage(page);

    await test.step("load the editor for a seeded set", async () => {
      await editor.open("as_001");
      await expect(editor.root).toBeVisible();
      await expect(editor.titleInput).toBeVisible();
      await expect(editor.correctColumn).toBeVisible();
      await expect(editor.incorrectColumn).toBeVisible();
    });

    await test.step("edit the title", async () => {
      await editor.titleInput.fill("E2E ladená sada");
    });

    await test.step("save changes", async () => {
      await editor.saveButton.click();
    });

    await test.step("reload and verify persistence", async () => {
      await editor.open("as_001");
      await expect(editor.titleInput).toHaveValue("E2E ladená sada");
    });
  });

  test("save with empty title surfaces an inline error", async ({ page }) => {
    const editor = new AnswerSetEditorPage(page);
    await editor.open("as_001");
    await editor.titleInput.fill("");
    await editor.saveButton.click();
    await expect(page.getByTestId("answer-set-editor-error")).toBeVisible();
  });
});
