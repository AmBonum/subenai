import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminQuickTestPage } from "../../poms/admin/AdminQuickTestPage";

const BASE_CONFIG = {
  id: "qt_default",
  visible: true,
  title: "Demo test",
  description: "Popis testu",
  branza: "Všeobecný test",
  time_seconds: 120,
  pass_percentage: 60,
  difficulty: "Ľahká",
  question_ids: [],
};

const QUICK_TEST_TABLE = [{ id: 1, config: BASE_CONFIG }];

test.describe("/admin/quick-test", () => {
  // TC-01: Page renders config form with current settings prefilled
  test("TC-01: page renders config form with current settings prefilled", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { quick_test_config: QUICK_TEST_TABLE } });
    const qt = new AdminQuickTestPage(page);

    await test.step("Navigate to /admin/quick-test", async () => {
      await qt.open();
    });

    await test.step("Verify the form root is visible", async () => {
      await expect(qt.root).toBeVisible();
    });

    await test.step("Verify the visibility toggle is visible", async () => {
      await expect(qt.visibilityToggle).toBeVisible();
    });

    await test.step("Verify the title input is visible and prefilled", async () => {
      await expect(qt.titleInput).toBeVisible();
      await expect(qt.titleInput).toHaveValue("Demo test");
    });

    await test.step("Verify the description textarea is visible and prefilled", async () => {
      await expect(qt.descriptionInput).toBeVisible();
      await expect(qt.descriptionInput).toHaveValue("Popis testu");
    });

    await test.step("Verify the branza select trigger is visible", async () => {
      await expect(qt.branzaSelect).toBeVisible();
    });

    await test.step("Verify the time input is visible and prefilled with 120", async () => {
      await expect(qt.timeInput).toBeVisible();
      await expect(qt.timeInput).toHaveValue("120");
    });

    await test.step("Verify the pass percentage input is visible and prefilled with 60", async () => {
      await expect(qt.passInput).toBeVisible();
      await expect(qt.passInput).toHaveValue("60");
    });

    await test.step("Verify the difficulty select trigger is visible", async () => {
      await expect(qt.difficultySelect).toBeVisible();
    });

    await test.step('Verify the save button labelled "Uložiť" is visible and enabled', async () => {
      await expect(qt.saveButton).toBeVisible();
      await expect(qt.saveButton).toBeEnabled();
    });

    await test.step("Verify the empty question list placeholder is visible", async () => {
      await expect(qt.questionListEmpty).toBeVisible();
    });
  });

  // TC-02: Edit title and submit → success toast fires
  test("TC-02: editing the title and submitting shows the success toast", async ({
    context,
    page,
  }) => {
    const table = [{ id: 1, config: { ...BASE_CONFIG, title: "Starý názov", description: "" } }];
    await setupAdmin(context, page, { tables: { quick_test_config: table } });
    const qt = new AdminQuickTestPage(page);

    await test.step("Navigate to /admin/quick-test", async () => {
      await qt.open();
      await expect(qt.root).toBeVisible();
    });

    await test.step("Clear the title input and type a new title", async () => {
      await qt.titleInput.fill("Nový názov testu");
    });

    await test.step("Click the save button", async () => {
      await qt.submit();
    });

    await test.step('Verify the success toast "Konfigurácia uložená." appears', async () => {
      await expect(qt.toast).toBeVisible({ timeout: 4000 });
      await expect(qt.toast).toContainText("Konfigurácia uložená.");
    });
  });

  // TC-03: Mutation error → error toast fires
  test("TC-03: a PATCH failure on quick_test_config shows an error toast", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { quick_test_config: QUICK_TEST_TABLE } });

    await page.route("**/rest/v1/quick_test_config*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "internal_error",
            message: "Simulated quick-test save failure",
            details: null,
            hint: null,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    const qt = new AdminQuickTestPage(page);

    await test.step("Navigate to /admin/quick-test", async () => {
      await qt.open();
      await expect(qt.root).toBeVisible();
    });

    await test.step("Type into the title input to trigger the optimistic mutation", async () => {
      await qt.titleInput.fill("trigger-error");
    });

    await test.step("Verify an error toast appears within 4 s", async () => {
      await expect(qt.toast).toBeVisible({ timeout: 4000 });
    });
  });

  // TC-04: Branza select changes value optimistically
  test("TC-04: selecting a new branza reflects the choice in the select trigger", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { quick_test_config: QUICK_TEST_TABLE } });
    const qt = new AdminQuickTestPage(page);

    await test.step("Navigate to /admin/quick-test", async () => {
      await qt.open();
      await expect(qt.root).toBeVisible();
    });

    await test.step('Open the branza select and choose "Senior"', async () => {
      await qt.selectBranza("Senior");
    });

    await test.step('Verify the branza select trigger reflects "Senior"', async () => {
      await expect(qt.branzaSelect).toContainText("Senior");
    });
  });
});
