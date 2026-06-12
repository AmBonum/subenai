// Performance smoke — interaction budgets at the UI level. These are
// deliberately LOOSE wall-clock ceilings (CI runners vary wildly), paired
// with strict structural invariants (DOM stays bounded). A regression that
// drops pagination or makes a page transition O(bank) trips either the node
// count or the generous time budget. The point is to catch "it got slow",
// not to benchmark.
//
// Pure client UI at /test/builder (static 268-question bank) — no Supabase.
// POM-only locators (CLAUDE.md); page.evaluate(performance...) is an
// environment read, so it stays in the spec.

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

const DEFAULT_PAGE_SIZE = 10;
// Loose ceilings: only trip if work went O(bank) instead of O(page).
const PICKER_OPEN_BUDGET_MS = 4000;
const PAGE_NAV_BUDGET_MS = 1500;

test.describe("Performance smoke — composer question picker", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("PERF-01: opening the picker over the full bank renders only one page within budget", async ({
    composer,
    page,
  }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });

    const start = await page.evaluate(() => performance.now());
    await composer.expandStep2Picker();
    await expect(composer.pickerListItems).toHaveCount(DEFAULT_PAGE_SIZE);
    const elapsed = (await page.evaluate(() => performance.now())) - start;

    expect(elapsed).toBeLessThan(PICKER_OPEN_BUDGET_MS);
  });

  test("PERF-02: paging never grows the DOM beyond the page size and stays within budget", async ({
    composer,
    page,
  }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();
    await expect(composer.pickerListItems).toHaveCount(DEFAULT_PAGE_SIZE);

    // Advance ten pages; the rendered row count must stay pinned at the page
    // size the whole way (no accumulation), and each hop stays cheap.
    let worst = 0;
    for (let i = 0; i < 10; i++) {
      const t0 = await page.evaluate(() => performance.now());
      await composer.pickerNext.click();
      await expect(composer.pickerListItems).toHaveCount(DEFAULT_PAGE_SIZE);
      worst = Math.max(worst, (await page.evaluate(() => performance.now())) - t0);
    }
    expect(worst).toBeLessThan(PAGE_NAV_BUDGET_MS);
  });

  test("PERF-03: switching to 'Všetky' renders the full bank but the page stays responsive to scroll", async ({
    composer,
    page,
  }) => {
    await composer.open();
    await composer.step2Toggle.waitFor({ state: "visible", timeout: 15_000 });
    await composer.expandStep2Picker();

    await composer.setPickerPageSize("all");
    // All rows now in the DOM — the count is the bank size, well over a page.
    const allCount = await composer.pickerListItems.count();
    expect(allCount).toBeGreaterThan(DEFAULT_PAGE_SIZE);

    // A scroll to the bottom of the long list must not jank the main thread
    // past the budget (catches a layout-thrash regression on the big list).
    const t0 = await page.evaluate(() => performance.now());
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await composer.pickerListItems.last().scrollIntoViewIfNeeded();
    const elapsed = (await page.evaluate(() => performance.now())) - t0;
    expect(elapsed).toBeLessThan(PAGE_NAV_BUDGET_MS);
  });
});
