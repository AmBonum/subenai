import { test, expect } from "@playwright/test";
import { AdminTestEditorPage } from "../../poms/admin/TestEditorPage";

test.describe("/admin/tests/$testId editor", () => {
  test.skip(true, "AH-11 provides an authenticated-admin-session fixture");

  test("load → edit → reorder → publish → reload", async ({ page }) => {
    const editor = new AdminTestEditorPage(page);

    await test.step("load", async () => {
      await editor.open("test_001");
      await expect(editor.root).toBeVisible();
    });

    await test.step("edit title", async () => {
      await editor.titleInput.fill("Edited title via e2e");
    });

    await test.step("reorder first two questions", async () => {
      await editor.questionDown(0).click();
    });

    await test.step("publish", async () => {
      await editor.publishButton.click();
    });

    await test.step("reload and verify persistence", async () => {
      await page.reload();
      await expect(editor.titleInput).toHaveValue("Edited title via e2e");
    });
  });
});
