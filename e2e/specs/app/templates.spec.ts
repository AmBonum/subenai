import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { AppTemplatesPage } from "../../poms/app/AppTemplatesPage";

// /app/templates — E44 tabbed template library (Verejné / Moje).
// Public tab lists platform defaults (owner_id null) + published public
// templates; Mine tab lists the educator's own copies.

const NOW = "2026-05-21T10:00:00.000Z";

function publicTemplate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tpl_001",
    title: "Onboarding kvíz",
    description: "Šablóna pre onboarding nových zamestnancov.",
    question_ids: ["q1", "q2"],
    gdpr_purpose: "internal_training",
    owner_id: null,
    visibility: "public",
    fork_of: null,
    status: "published",
    license: "cc-by-4.0",
    author_display_name: null,
    age_rating: "all",
    slug: "onboarding-kviz",
    published_at: NOW,
    updated_at: NOW,
    created_at: NOW,
    ...overrides,
  };
}

const TPL_001 = publicTemplate();
const TPL_002 = publicTemplate({
  id: "tpl_002",
  title: "Zákaznícka spokojnosť",
  description: "Šablóna na meranie spokojnosti zákazníkov.",
  question_ids: ["q3"],
  gdpr_purpose: "research",
  slug: "zakaznicka-spokojnost",
});
const TPL_003 = publicTemplate({
  id: "tpl_003",
  title: "Interný onboarding pre nováčikov",
  description: "Druhá interná šablóna na test prekrytia filtra.",
  question_ids: ["q4", "q5", "q6", "q7", "q8"],
  gdpr_purpose: "internal_training",
  slug: "interny-onboarding",
});
const TPL_MINE = publicTemplate({
  id: "tpl_mine",
  title: "Moja kópia onboarding kvízu",
  description: "Kópia verejnej šablóny vo vlastníctve edukátora.",
  owner_id: EDUCATOR_SESSION.user.id,
  visibility: "private",
  fork_of: "tpl_001",
  status: "draft",
  author_display_name: "educator",
  slug: null,
  published_at: null,
});

test.describe("/app/templates", () => {
  // TC-01: zero-rows public tab → public empty state with filter copy
  test("TC-01: empty public tab renders the public empty-state copy", async ({ context, page }) => {
    await setupEducator(context, page, { tables: { templates: [] } });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await expect(templates.root).toBeVisible();
    await expect(templates.pageHeader).toContainText("Šablóny");
    await expect(templates.searchInput).toBeVisible();
    await expect(templates.categoryFilter).toBeVisible();

    await expect(templates.emptyStatePublic).toBeVisible();
    await expect(templates.emptyStatePublic).toContainText(
      "Pre tento filter nemáme žiadne verejné šablóny. Skús zmeniť kategóriu alebo vyhľadávací výraz.",
    );
    await expect(templates.emptyStateMine).toHaveCount(0);
  });

  // TC-02: populated public tab — cards render title, purpose, ownership, public link
  test("TC-02: populated public tab renders title, purpose badge, ownership badge, public page link", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_001, TPL_002] } });
    const templates = new AppTemplatesPage(page);

    await test.step("Navigate to /app/templates", async () => {
      await templates.open();
      await expect(templates.emptyStatePublic).toHaveCount(0);
    });

    await test.step('Verify card "tpl_001" shows title + purpose + ownership', async () => {
      await expect(templates.card("tpl_001")).toBeVisible();
      await expect(templates.cardTitle("tpl_001")).toHaveText("Onboarding kvíz");
      await expect(templates.cardPurposeBadge("tpl_001")).toHaveText("Interné vzdelávanie");
      await expect(templates.cardOwnershipBadge("tpl_001")).toHaveText("Predvolené");
    });

    await test.step('Verify card "tpl_002" shows title + purpose', async () => {
      await expect(templates.card("tpl_002")).toBeVisible();
      await expect(templates.cardTitle("tpl_002")).toHaveText("Zákaznícka spokojnosť");
      await expect(templates.cardPurposeBadge("tpl_002")).toHaveText("Výskum");
    });

    await test.step("Verify the public-page link points at /sablony/<slug>", async () => {
      await expect(templates.cardPublicPageLink("tpl_001")).toBeVisible();
      await expect(templates.cardPublicPageLink("tpl_001")).toHaveAttribute(
        "href",
        "/sablony/onboarding-kviz",
      );
    });
  });

  // TC-03: "Použiť" navigates to the wizard with templateId
  test('TC-03: click "Použiť" navigates to /app/tests/new with templateId param', async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_001] } });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await expect(templates.useButton("tpl_001")).toBeVisible();
    await templates.useButton("tpl_001").click();
    await expect(page).toHaveURL(/\/app\/tests\/new.*step=1.*templateId=tpl_001/);
  });

  // TC-04: search filter narrows the visible card set
  test("TC-04: search filter narrows the visible card set", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_002, TPL_003] },
    });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await expect(templates.allCards).toHaveCount(3);

    await templates.searchInput.fill("spokojnosť");
    await expect(templates.allCards).toHaveCount(1);
    await expect(templates.card("tpl_002")).toBeVisible();
    await expect(templates.card("tpl_001")).toHaveCount(0);

    await templates.searchInput.fill("xyzzy_no_match");
    await expect(templates.emptyStatePublic).toBeVisible();
    await expect(templates.allCards).toHaveCount(0);
  });

  // TC-05: category filter restricts the grid to the chosen GDPR purpose
  test("TC-05: category filter restricts the grid to the chosen GDPR purpose", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_002, TPL_003] },
    });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await templates.categoryFilter.click();
    await templates.categoryFilterOption("internal_training").click();

    await expect(templates.card("tpl_001")).toBeVisible();
    await expect(templates.card("tpl_003")).toBeVisible();
    await expect(templates.card("tpl_002")).toHaveCount(0);
    await expect(templates.allCards).toHaveCount(2);
  });

  // TC-06: question-count badge uses Slovak plural forms
  test("TC-06: question-count badge reflects question_ids length with Slovak plurals", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_002, TPL_003] },
    });
    const templates = new AppTemplatesPage(page);

    await templates.open();
    await expect(templates.cardQuestionsCount("tpl_001")).toHaveText("2 otázky");
    await expect(templates.cardQuestionsCount("tpl_002")).toHaveText("1 otázka");
    await expect(templates.cardQuestionsCount("tpl_003")).toHaveText("5 otázok");
  });

  // TC-07: Mine tab — owned copy renders; empty state offers the public CTA
  test("TC-07: mine tab lists owned copies; empty mine tab offers the public-library CTA", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { templates: [TPL_001, TPL_MINE] },
    });
    const templates = new AppTemplatesPage(page);

    await templates.open();

    await test.step("Switch to the Moje tab — the owned copy renders", async () => {
      await templates.tabMine.click();
      await expect(templates.card("tpl_mine")).toBeVisible();
      await expect(templates.cardOwnershipBadge("tpl_mine")).toHaveText("Moja kópia");
    });

    await test.step("Empty mine tab (no copies) renders the CTA copy", async () => {
      await setupEducator(page.context(), page, { tables: { templates: [TPL_001] } });
      await page.goto("/app/templates?tab=mine");
      await expect(templates.emptyStateMine).toBeVisible();
      await expect(templates.emptyStateMine).toContainText(
        "Ešte si si žiadnu šablónu nezduplikoval. Začni z verejnej knižnice.",
      );
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

    // `sm:grid-cols-2` → at <sm (Pixel 7 = 412px) the two cards stack
    // vertically. Card 2 must sit below card 1.
    const card1 = await templates.card("tpl_001").boundingBox();
    const card2 = await templates.card("tpl_002").boundingBox();
    expect(card1).not.toBeNull();
    expect(card2).not.toBeNull();
    expect(card2!.y).toBeGreaterThan(card1!.y + card1!.height - 1);

    // Tap targets — the use button is the primary CTA; ≥44px tap height
    // (max-sm:h-11) is the WCAG 2.5.5 floor per the E36 criteria.
    const useBtn = await templates.useButton("tpl_001").boundingBox();
    expect(useBtn?.height).toBeGreaterThanOrEqual(44);

    // No horizontal overflow at the mobile viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
