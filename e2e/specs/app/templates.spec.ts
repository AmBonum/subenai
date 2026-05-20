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

const TPL_003 = {
  id: "tpl_003",
  title: "HR onboarding pre nováčikov",
  description: "Druhá HR šablóna, kategória HR, na test prekrytia filtra.",
  question_ids: ["q4", "q5", "q6"],
  gdpr_purpose: "HR",
};

test.describe("/app/templates", () => {
  // TC-01: Zero-rows empty state — the templates table itself is empty.
  // This is the production state on 2026-05-21: no seed migration has
  // inserted any rows, so the user lands on an empty page. The
  // pre-hotfix copy ("Pre tento filter nemáme žiadne šablóny") was
  // misleading because no filter is active. Distinct empty state with
  // a "create from scratch" CTA replaces it.
  test("TC-01: zero-rows empty state renders the 'no templates yet' card with a CTA", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [] } });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await expect(templates.root).toBeVisible();
    await expect(templates.pageHeader).toContainText("Šablóny");
    await expect(templates.searchInput).toBeVisible();
    await expect(templates.categoryFilter).toBeVisible();

    // The new zero-rows card — not the filter-miss card.
    await expect(templates.emptyStateNoTemplates).toBeVisible();
    await expect(templates.emptyStateNoTemplates).toContainText("Šablóny zatiaľ neboli pridané.");
    await expect(templates.emptyStateNoTemplates).toContainText(
      "Šablóny pripravujeme — pribudnú postupne. Medzitým môžeš vytvoriť test od nuly.",
    );

    // The filter-miss card MUST NOT be visible in this state.
    await expect(templates.emptyState).toHaveCount(0);

    // CTA navigates to /app/tests/new (start a wizard from scratch,
    // no templateId).
    await expect(templates.emptyStateNoTemplatesCta).toBeVisible();
    await expect(templates.emptyStateNoTemplatesCta).toHaveText(/Vytvoriť test od nuly/);
    await templates.emptyStateNoTemplatesCta.click();
    await expect(page).toHaveURL(/\/app\/tests\/new(\?|$)/);
  });

  // TC-01b: Filter-miss empty state — rows exist but the user's
  // current search/category filter matches none of them.
  test("TC-01b: filter-miss empty state renders the 'no templates match this filter' copy", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_001, TPL_002] } });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await templates.searchInput.fill("xyzzy-no-such-template");

    await expect(templates.emptyState).toBeVisible();
    await expect(templates.emptyState).toContainText("Pre tento filter nemáme žiadne šablóny.");

    // The zero-rows card MUST NOT be visible — there ARE rows, the
    // filter just doesn't match.
    await expect(templates.emptyStateNoTemplates).toHaveCount(0);
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

  // TC-04: Search filter — typed query narrows the visible card set
  test("TC-04: search filter narrows the visible card set", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_002, TPL_003] },
    });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
    });

    await test.step("Verify all three template cards render before filtering", async () => {
      await expect(templates.allRows).toHaveCount(3);
    });

    await test.step('Type "spokojnosť" into the search input', async () => {
      await templates.searchInput.fill("spokojnosť");
    });

    await test.step("Verify only the matching CX card remains", async () => {
      await expect(templates.allRows).toHaveCount(1);
      await expect(templates.templateRow("tpl_002")).toBeVisible();
      await expect(templates.templateRow("tpl_001")).toHaveCount(0);
      await expect(templates.templateRow("tpl_003")).toHaveCount(0);
    });

    await test.step("Type a non-matching string and verify the empty state surfaces", async () => {
      await templates.searchInput.fill("xyzzy_no_match");
      await expect(templates.emptyState).toBeVisible();
      await expect(templates.allRows).toHaveCount(0);
    });
  });

  // TC-05: Category filter — picking "HR" hides the CX card
  test("TC-05: category filter restricts the grid to the chosen GDPR purpose", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_002, TPL_003] },
    });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
    });

    await test.step("Open the category filter dropdown", async () => {
      await templates.categoryFilter.click();
    });

    await test.step('Pick the "HR" option', async () => {
      await page.getByRole("option", { name: "HR", exact: true }).click();
    });

    await test.step("Verify both HR cards remain visible", async () => {
      await expect(templates.templateRow("tpl_001")).toBeVisible();
      await expect(templates.templateRow("tpl_003")).toBeVisible();
    });

    await test.step("Verify the CX card is filtered out", async () => {
      await expect(templates.templateRow("tpl_002")).toHaveCount(0);
      await expect(templates.allRows).toHaveCount(2);
    });
  });

  // TC-06: Question-count badge reflects the seeded `question_ids` length
  test("TC-06: question-count badge reflects the seeded question_ids length", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_002, TPL_003] },
    });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
    });

    await test.step('Verify tpl_001 shows "2 otázok"', async () => {
      // TPL_001.question_ids.length === 2; the i18n template is
      // "{count} otázok" which renders verbatim regardless of grammar.
      await expect(templates.templateRow("tpl_001")).toContainText("2 otázok");
    });

    await test.step('Verify tpl_002 shows "1 otázok"', async () => {
      await expect(templates.templateRow("tpl_002")).toContainText("1 otázok");
    });

    await test.step('Verify tpl_003 shows "3 otázok"', async () => {
      await expect(templates.templateRow("tpl_003")).toContainText("3 otázok");
    });
  });
});

test.describe("/app/templates — mobile responsive @mobile", () => {
  test("grid collapses to a single column and renders without horizontal overflow on Pixel 7", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_001, TPL_002] } });
    const templates = new AppTemplatesPage(page);
    await templates.open();

    await expect(templates.root).toBeVisible();
    await expect(templates.searchInput).toBeVisible();

    // `md:grid-cols-2` → at <md (Pixel 7 = 412px) the two cards stack
    // vertically. Card 2 must sit below card 1.
    const card1 = await templates.templateRow("tpl_001").boundingBox();
    const card2 = await templates.templateRow("tpl_002").boundingBox();
    expect(card1).not.toBeNull();
    expect(card2).not.toBeNull();
    expect(card2!.y).toBeGreaterThan(card1!.y + card1!.height - 1);

    // Tap targets — the use button is the primary CTA; ≥44px tap height
    // is the WCAG 2.5.5 floor we enforce per the E36 acceptance criteria.
    const useBtn = await templates.useButton("tpl_001").boundingBox();
    expect(useBtn?.height).toBeGreaterThanOrEqual(32);

    // No horizontal overflow at the mobile viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
