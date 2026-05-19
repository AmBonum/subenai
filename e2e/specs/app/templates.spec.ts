import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppTemplatesPage } from "../../poms/app/AppTemplatesPage";

const TPL_001 = {
  id: "tpl_001",
  title: "Onboarding kvíz",
  description: "Šablóna pre onboarding nových zamestnancov.",
  question_ids: ["q1", "q2"],
  gdpr_purpose: "HR",
};

const TPL_002 = {
  id: "tpl_002",
  title: "Zákaznícka spokojnosť",
  description: "Šablóna na meranie spokojnosti zákazníkov.",
  question_ids: ["q3"],
  gdpr_purpose: "CX",
};

test.describe("/app/templates", () => {
  // TC-01: Empty state when no templates are available
  test("TC-01: empty state when no templates are available", async ({ context, page }) => {
    await setupEducator(context, page, { tables: { templates: [] } });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(templates.root).toBeVisible();
    });

    await test.step('Verify page heading contains "Šablóny"', async () => {
      await expect(templates.pageHeader).toContainText("Šablóny");
    });

    await test.step("Verify search input and category filter are visible", async () => {
      await expect(templates.searchInput).toBeVisible();
      await expect(templates.categoryFilter).toBeVisible();
    });

    await test.step("Verify empty-state card is visible", async () => {
      await expect(templates.emptyState).toBeVisible();
    });

    await test.step('Verify empty-state contains "Pre tento filter nemáme žiadne šablóny."', async () => {
      await expect(templates.emptyState).toContainText("Pre tento filter nemáme žiadne šablóny.");
    });
  });

  // TC-02: Populated state — template cards render name and category badge
  test("TC-02: populated state — template cards render name and category badge", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_001, TPL_002] } });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
    });

    await test.step("Verify the page root is visible and empty state is absent", async () => {
      await expect(templates.root).toBeVisible();
      await expect(templates.emptyState).toHaveCount(0);
    });

    await test.step('Verify template card "tpl_001" shows title "Onboarding kvíz"', async () => {
      await expect(templates.templateRow("tpl_001")).toBeVisible();
      await expect(templates.templateRow("tpl_001")).toContainText("Onboarding kvíz");
    });

    await test.step('Verify template card "tpl_001" shows category "HR"', async () => {
      await expect(templates.templateRow("tpl_001")).toContainText("HR");
    });

    await test.step('Verify template card "tpl_002" shows title "Zákaznícka spokojnosť"', async () => {
      await expect(templates.templateRow("tpl_002")).toBeVisible();
      await expect(templates.templateRow("tpl_002")).toContainText("Zákaznícka spokojnosť");
    });

    await test.step('Verify template card "tpl_002" shows category "CX"', async () => {
      await expect(templates.templateRow("tpl_002")).toContainText("CX");
    });
  });

  // TC-03: Click "Použiť šablónu" navigates to /app/tests/new with templateId param
  test('TC-03: click "Použiť šablónu" navigates to /app/tests/new with templateId param', async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_001] } });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
    });

    await test.step('Verify template card "tpl_001" and its use button are visible', async () => {
      await expect(templates.templateRow("tpl_001")).toBeVisible();
      await expect(templates.useButton("tpl_001")).toBeVisible();
    });

    await test.step('Click "Použiť šablónu" on template "tpl_001"', async () => {
      await templates.useButton("tpl_001").click();
    });

    await test.step("Verify navigation to /app/tests/new with step=1 and templateId=tpl_001", async () => {
      await expect(page).toHaveURL(/\/app\/tests\/new.*step=1.*templateId=tpl_001/);
    });
  });
});
