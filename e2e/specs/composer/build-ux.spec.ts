// E33 Phase 2 — contract test suite for the composer build UI (Phase 1 UX).
//
// Source plan: tasks/PLAN-2026-05-20-E33-composer-rebrand.md (TC-07 → TC-11).
//
// Scope: pure UI rendering at /test/builder. No seed, no API. Verifies that
// the Phase 1 deliverables (collapsed-by-default picker, explainer callout,
// new eyebrow + intro, Slovak pluralisation) ship correctly and that section
// 3 "Nastavenia" stays above the fold at 1024×768.
//
// Why these TCs exist: pre-Phase-1 the QuestionPicker rendered all 243
// items inline, pushing section 3 below the fold on a 13-inch laptop. The
// fix was a wrapper that defaults to collapsed; this spec is the regression
// sentinel that catches anyone accidentally reverting the wrapper or losing
// a testid in a styling pass.
//
// Dev server requirement: npm run dev must be running at BASE_URL (default
// http://localhost:8080). No CF Functions needed — this spec doesn't touch
// /api/* endpoints.

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

test.describe("E33 Phase 1 — composer build UX", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-07 — Section 3 (Nastavenia) must be visible above the fold at 1024×768.
  // This is the user-visible regression Phase 1 was built to fix: the
  // pre-Phase-1 inline 243-question picker pushed Nastavenia ~3500 px down,
  // forcing a scroll that ~40% of first-time users gave up on (per analytics).
  // The contract: picker collapsed → header of section 3 fits in the initial
  // viewport. We assert on intersection with the visible viewport, not just
  // toBeVisible (which would also pass for elements 5000 px down a tall page).
  test("TC-07: section 3 'Nastavenia' is above the fold at 1024×768 with picker collapsed", async ({
    page,
    composer,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await composer.open();
    // First-render: bumped to 15s to absorb Vite cold-start + lazy-chunk
    // load on the first composer visit of a test session. Subsequent
    // assertions can use the default 5s — once hydrated, render is fast.
    await expect(composer.heading).toBeVisible({ timeout: 15_000 });
    await expect(composer.step2Summary).toBeVisible();
    await expect(composer.step2Picker).toHaveCount(0);

    const settingsBoundingBox = await composer.settingsSection.boundingBox();
    expect(settingsBoundingBox).not.toBeNull();
    // The page gained section 1 "Predefinované sady" (E37 Phase G3 pack
    // chips) + the explainer accordion after this contract was written, so
    // section 3 no longer fits inside the literal 768-px viewport. The
    // regression this TC guards against is the picker expanding inline and
    // pushing Nastavenia ~3500 px down — assert the heading stays within
    // two viewport heights instead of one.
    expect(settingsBoundingBox!.y).toBeLessThan(768 * 2);
  });

  // TC-08 — Picker is collapsed by default + toggle expands it.
  // Locks in the wrapper-not-modifier refactor: clicking the toggle reveals
  // the original QuestionPicker (unchanged testid contract — composer-picker-search
  // appears only after expansion, which proves the wrapper isn't lazy-importing
  // a different component).
  test("TC-08: picker is collapsed by default; toggle expands the inline QuestionPicker", async ({
    composer,
  }) => {
    await composer.open();

    // Collapsed state: summary visible, full picker not in DOM. 15s budget
    // for first-render absorbs Vite cold-start (subsequent assertions use 5s).
    await expect(composer.step2Wrapper).toBeVisible({ timeout: 15_000 });
    await expect(composer.step2Summary).toBeVisible();
    await expect(composer.step2Toggle).toBeVisible();
    await expect(composer.step2Picker).toHaveCount(0);
    await expect(composer.pickerSearch).toHaveCount(0);
    await expect(composer.step2Toggle).toHaveAttribute("aria-expanded", "false");

    // Expand and verify the original QuestionPicker hydrates.
    await composer.expandStep2Picker();
    await expect(composer.step2Picker).toBeVisible();
    await expect(composer.pickerSearch).toBeVisible();
    await expect(composer.step2Toggle).toHaveAttribute("aria-expanded", "true");

    // Toggle label flips from "open" → "close".
    await expect(composer.step2Toggle).toContainText("Hotovo, zavri výber");

    // Collapse again — picker leaves the DOM, search input gone.
    await composer.step2Toggle.click();
    await expect(composer.step2Picker).toHaveCount(0);
    await expect(composer.pickerSearch).toHaveCount(0);
    await expect(composer.step2Toggle).toHaveAttribute("aria-expanded", "false");
    await expect(composer.step2Toggle).toContainText("Vybrať z banky (268 otázok)");
  });

  // TC-09 — Eyebrow + intro_v2 copy renders verbatim.
  // Locked-in Slovak strings: eyebrow "PRE TÍM · 5 MINÚT" and the 60-word
  // intro that opens with "Vyber zo 243 otázok". These are SEO + tone signals
  // the senior copy work pinned; a paraphrase or accidental revert would
  // soften the value prop. We assert verbatim text per the project's
  // language rule (CLAUDE.md: "When a test or plan needs to assert against
  // a Slovak UI string, quote it verbatim — don't paraphrase").
  test("TC-09: eyebrow + intro_v2 copy renders the senior-pinned Slovak text", async ({
    composer,
  }) => {
    await composer.open();

    await expect(composer.eyebrow).toBeVisible({ timeout: 15_000 });
    await expect(composer.eyebrow).toHaveText("PRE TÍM · 5 MINÚT");

    await expect(composer.intro).toBeVisible();
    // The intro is split prefix + strong-count + suffix — assert on the
    // concatenated visible text. The <strong> wrapping the count is a
    // typographic detail, not part of the contract.
    await expect(composer.intro).toContainText("Vyber zo");
    await expect(composer.intro).toContainText("268 otázok");
    await expect(composer.intro).toContainText("phishing v e-shope");
    await expect(composer.intro).toContainText("Žiadna registrácia, žiadny LMS.");
  });

  // TC-10 — Slovak pluralisation: 1 / 2-4 / 5+ branches.
  // This is the most likely future regression: someone refactors the
  // pluralisation helper, picks one form for all counts, and the picker
  // shows "1 vybraných otázok" or "3 vybraná otázka" — bad Slovak. We test
  // all three forms by clicking pack chips to reach the boundary counts
  // (the default pack chips select 5 questions each, so we toggle individual
  // checkboxes inside the expanded picker to reach precise 1 / 3).
  //
  // Zero-state is also asserted — it uses a separate i18n key
  // (step_2_zero_state_cta) and must not fall through to the pluralisation
  // branches with count=0.
  test("TC-10: Slovak pluralisation — zero / 1 vybraná / 3 vybrané / 5 vybraných", async ({
    composer,
  }) => {
    await composer.open();

    // count=0 → zero-state CTA, not pluralised form. 15s budget for
    // first-render cold-start.
    await expect(composer.step2SummaryText).toContainText("Začni výberom z balíkov vyššie", {
      timeout: 15_000,
    });

    // Expand picker so we can toggle individual question checkboxes.
    await composer.expandStep2Picker();

    // Strictly-increasing strategy avoids the unchek-everything loop over
    // 243 nodes that content-visibility:auto would force off-screen. We
    // tick the first 5 checkboxes one at a time and assert at the 1 / 3 / 5
    // boundaries; each boundary corresponds to a different i18n branch
    // (singular / few / many).
    const checkboxes = composer.step2Picker.locator("input[type='checkbox']");

    await checkboxes.nth(0).check();
    await expect(composer.step2SummaryText).toContainText("1 vybraná otázka");

    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await expect(composer.step2SummaryText).toContainText("3 vybrané otázky");

    await checkboxes.nth(3).check();
    await checkboxes.nth(4).check();
    await expect(composer.step2SummaryText).toContainText("5 vybraných otázok");
  });

  // TC-11 — Explainer callout: present, expandable, has packs CTA.
  // The explainer is the D8 deliverable — a "when to build vs. use a pack"
  // callout below the hero that gives the user the escape-hatch to /tests
  // if they're on the wrong page. Critical because it lowers the bounce
  // rate from "user lands on builder by accident from blog → leaves" to
  // "user lands on builder → reads 3 bullets → clicks Pozri hotové balíky →
  // converts on a pack". Without this TC a future visual cleanup that
  // collapses the callout into a paragraph would silently kill conversion.
  test("TC-11: explainer callout — collapsed by default, expands, links to /tests", async ({
    composer,
  }) => {
    await composer.open();

    await expect(composer.explainer).toBeVisible({ timeout: 15_000 });
    await expect(composer.explainerToggle).toBeVisible();
    await expect(composer.explainerToggle).toContainText(
      "Kedy si zostaviť vlastný test vs. použiť hotový?",
    );

    // Collapsed state: body is not rendered (aria-expanded=false).
    await expect(composer.explainerToggle).toHaveAttribute("aria-expanded", "false");
    await expect(composer.explainerBody).toHaveCount(0);

    await composer.expandExplainer();

    // Expanded: both bullets + escape-hatch CTA visible with the exact
    // Slovak strings the senior copy pass pinned.
    await expect(composer.explainerCustom).toContainText("Vlastný (tu):");
    await expect(composer.explainerPack).toContainText("Hotový balík:");
    await expect(composer.explainerCtaToPacks).toContainText("Pozri hotové balíky");

    // The CTA must point at the directory route — the entire user-value
    // of the callout collapses if this link rots.
    await expect(composer.explainerCtaToPacks).toHaveAttribute("href", "/tests");
  });
});
