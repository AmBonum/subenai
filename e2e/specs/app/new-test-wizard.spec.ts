import { test, expect } from "@playwright/test";
import { NewTestWizardPage } from "../../poms/app/NewTestWizardPage";

test.describe("/app/tests/new wizard", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

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
