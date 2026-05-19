import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { seedTest } from "../../seed";
import { AdminTestEditorPage } from "../../poms/admin/TestEditorPage";

// Outlet fix landed in task #53 (Phase 3 follow-up). Re-enabled
// 2026-05-19 once Phase 7 mock infra (HEAD count, merge-duplicates,
// Toaster) was stable enough for the editor flow to drive without
// flake.

test.describe("/admin/tests/$testId editor", () => {
  test.beforeEach(async ({ context, page }) => {
    const t1 = seedTest({
      id: "test_001",
      slug: "admin-edit-target",
      owner_id: ADMIN_SESSION.user.id,
      title: "Admin editor target",
      status: "draft",
    });
    await setupAdmin(context, page, {
      tables: {
        tests: [t1],
        test_questions: [],
      },
    });
  });

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
      const down = editor.questionDown(0);
      if (await down.isVisible().catch(() => false)) {
        await down.click();
      }
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
