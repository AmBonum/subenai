import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTest } from "../../seed";
import { TestEditorPage } from "../../poms/app/TestEditorPage";

test.describe("/app/tests/$testId editor", () => {
  test.beforeEach(async ({ context, page }) => {
    const t1 = seedTest({
      id: "tst_002",
      slug: "e2e-edit-target",
      share_id: "e2e-share-1234",
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Editor target",
      status: "draft",
    });
    await setupEducator(context, page, {
      tables: {
        tests: [t1],
        test_questions: [],
        sessions: [],
      },
    });
  });

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
