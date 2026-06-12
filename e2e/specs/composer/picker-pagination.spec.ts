// Composer question-picker pagination (2026-06-12 UX).
//
// The bank is 268 questions; before this the picker rendered ALL of them
// inline, drowning the user. Now the picker paginates: default 10/page, a
// page-size select (10 / 25 / 50 / Všetky) and prev/next nav.
//
// Pure client UI at /test/builder — the picker is fed the static question
// bank (src/lib/quiz/bank/questions.ts), so no Supabase / packs / API. The
// counts below are derived from the bank size: 268 questions ⇒ 27 pages at
// 10/page, 11 pages at 25/page. If the bank grows these update with it; the
// intro/toggle copy is the bank-size source of truth (asserted in build-ux).
//
// POM-only locators (CLAUDE.md): every element comes from ComposerPage
// getters; page-level actions (none needed here beyond open) stay in spec.

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

const BANK_SIZE = 268;
const DEFAULT_PAGE_SIZE = 10;
const PAGES_AT_10 = Math.ceil(BANK_SIZE / DEFAULT_PAGE_SIZE); // 27
const PAGES_AT_25 = Math.ceil(BANK_SIZE / 25); // 11

test.describe("Composer picker — pagination", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // PG-01: default page size is 10; the list shows exactly 10 rows and the
  // pager reports page 1 of 27 with prev disabled / next enabled.
  test("PG-01: defaults to 10 per page with a 'Strana 1 z 27' pager", async ({ composer }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();

    await expect(composer.pickerPageSize).toBeVisible();
    await expect(composer.pickerPageSize).toHaveValue(String(DEFAULT_PAGE_SIZE));
    await expect(composer.pickerListItems).toHaveCount(DEFAULT_PAGE_SIZE);

    await expect(composer.pickerPager).toBeVisible();
    await expect(composer.pickerPageStatus).toHaveText(`Strana 1 z ${PAGES_AT_10}`);
    await expect(composer.pickerPrev).toBeDisabled();
    await expect(composer.pickerNext).toBeEnabled();
  });

  // PG-02: next/prev navigation moves between pages, swaps the visible rows,
  // and toggles the disabled state at the boundaries. We track a specific
  // first-page bank id (p-sms-posta-1) — present on page 1, gone on page 2,
  // back on page 1 — which is deterministic regardless of row text.
  test("PG-02: next/prev navigates and updates the page status + boundaries", async ({
    composer,
  }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();

    const page1Checkbox = composer.questionCheckbox("p-sms-posta-1");
    await expect(page1Checkbox).toBeVisible();

    await composer.pickerNext.click();
    await expect(composer.pickerPageStatus).toHaveText(`Strana 2 z ${PAGES_AT_10}`);
    await expect(composer.pickerPrev).toBeEnabled();
    await expect(composer.pickerListItems).toHaveCount(DEFAULT_PAGE_SIZE);
    // The page-1 question is no longer in the DOM on page 2.
    await expect(page1Checkbox).toHaveCount(0);

    await composer.pickerPrev.click();
    await expect(composer.pickerPageStatus).toHaveText(`Strana 1 z ${PAGES_AT_10}`);
    await expect(composer.pickerPrev).toBeDisabled();
    await expect(page1Checkbox).toBeVisible();
  });

  // PG-03: changing the page size re-paginates and resets to page 1; the
  // "Všetky" option drops the pager and renders the whole bank.
  test("PG-03: page-size select re-paginates and 'Všetky' shows all rows", async ({ composer }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();

    // Move off page 1 first to prove the size change resets the page.
    await composer.pickerNext.click();
    await expect(composer.pickerPageStatus).toHaveText(`Strana 2 z ${PAGES_AT_10}`);

    await composer.setPickerPageSize("25");
    await expect(composer.pickerListItems).toHaveCount(25);
    await expect(composer.pickerPageStatus).toHaveText(`Strana 1 z ${PAGES_AT_25}`);
    await expect(composer.pickerPrev).toBeDisabled();

    await composer.setPickerPageSize("all");
    await expect(composer.pickerListItems).toHaveCount(BANK_SIZE);
    // No pager when everything is on one page.
    await expect(composer.pickerPager).toHaveCount(0);
  });

  // PG-04: searching collapses the result set, resets to page 1, and (for a
  // small result count) drops the pager entirely.
  test("PG-04: search resets pagination to page 1 and re-counts the filter", async ({
    composer,
  }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();

    await composer.pickerNext.click();
    await expect(composer.pickerPageStatus).toHaveText(`Strana 2 z ${PAGES_AT_10}`);

    // A narrow query that yields a single page of results.
    await composer.pickerSearch.fill("haveibeenpwned");
    await expect(composer.pickerFilterCount).toContainText(`z ${BANK_SIZE} otázok`);
    // Few results → one page → no pager.
    await expect(composer.pickerPager).toHaveCount(0);
    const shown = await composer.pickerListItems.count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThanOrEqual(DEFAULT_PAGE_SIZE);
  });

  // PG-05: a selection made on page 1 survives navigation to another page
  // and back — pagination is a view concern, not a selection reset.
  test("PG-05: selection persists across page navigation", async ({ composer }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();

    // First stable bank id is on page 1 at default size.
    const id = "p-sms-posta-1";
    await composer.questionCheckbox(id).check();
    await expect(composer.questionCheckbox(id)).toBeChecked();
    await expect(composer.pickerSelectedCount).toContainText("Vybraných: 1 / 50");

    await composer.pickerNext.click();
    await expect(composer.pickerPageStatus).toHaveText(`Strana 2 z ${PAGES_AT_10}`);
    // Count is global, not per-page — still 1 while we're on page 2.
    await expect(composer.pickerSelectedCount).toContainText("Vybraných: 1 / 50");

    await composer.pickerPrev.click();
    await expect(composer.questionCheckbox(id)).toBeChecked();
  });
});
