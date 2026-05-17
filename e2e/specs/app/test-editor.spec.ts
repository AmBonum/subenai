import { test, expect } from "@playwright/test";
import { TestEditorPage } from "../../poms/app/TestEditorPage";

test.describe("/app/tests/$testId editor", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("tab switching + ShareDialog copy", async ({ page }) => {
    const editor = new TestEditorPage(page);
    await editor.open("tst_002");

    await test.step("results tab", async () => {
      await expect(editor.root).toBeVisible();
      await expect(editor.tabResults).toBeVisible();
    });

    await test.step("analytics tab", async () => {
      await editor.tabAnalytics.click();
    });

    await test.step("settings tab", async () => {
      await editor.tabSettings.click();
      await expect(editor.titleInput).toBeVisible();
      await editor.titleInput.fill("Edited via e2e");
      await editor.saveButton.click();
    });

    await test.step("share dialog copy", async () => {
      await editor.shareButton.click();
      const share = editor.shareDialog();
      await expect(share.root).toBeVisible();
      await expect(share.urlInput).toHaveValue(/\/t\/[a-z0-9-]+$/);
      await share.copyButton.click();
      await share.closeButton.click();
    });
  });
});
