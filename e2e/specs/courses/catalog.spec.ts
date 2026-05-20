import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { CoursesCatalog } from "../../poms/courses/CoursesCatalog";

/**
 * E36 — /courses catalog: search, sort, category + audience filters,
 * card meta (difficulty + minutes). Static catalog read from the
 * `COURSES` bundle; no Supabase mocks required.
 */
test.describe("Courses catalog — E36 search + sort + filters", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("renders the catalog with heading, grid, and >= 18 visible cards", async ({ page }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    await expect(catalog.root).toBeVisible();
    await expect(catalog.heading).toBeVisible();
    await expect(catalog.grid).toBeVisible();
    // Soft lower bound — registry grows through E36 Phase A. The
    // implementation should land with at least 18 published courses.
    const count = await catalog.allCards().count();
    expect(count).toBeGreaterThanOrEqual(18);
  });

  test("search narrows the grid to titles matching 'phishing'", async ({ page }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    const baseline = await catalog.allCards().count();
    await catalog.typeSearch("phishing");
    await expect(catalog.grid).toBeVisible();
    const filtered = await catalog.allCards().count();
    expect(filtered).toBeLessThan(baseline);
    expect(filtered).toBeGreaterThan(0);
    await expect(catalog.card("email-phishing")).toBeVisible();
  });

  test("search with no match shows the empty state with the verbatim Slovak copy", async ({
    page,
  }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    await catalog.typeSearch("xyzzy123");
    await expect(catalog.emptyState).toBeVisible();
    await expect(catalog.emptyState).toContainText('Nenašlo sa žiadne školenie pre „xyzzy123".');
  });

  test("clearing the search returns the baseline card count", async ({ page }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    const baseline = await catalog.allCards().count();
    await catalog.typeSearch("phishing");
    const filtered = await catalog.allCards().count();
    expect(filtered).toBeLessThan(baseline);
    await catalog.clearSearch();
    await expect(catalog.grid).toBeVisible();
    const restored = await catalog.allCards().count();
    expect(restored).toBe(baseline);
  });

  test("category filter 'data' shows data-category courses and hides others", async ({ page }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    await catalog.toggleCategory("data");
    await expect(catalog.card("data-hygiene")).toBeVisible();
    // `sms-smishing` has category `sms` — must not pass the data filter.
    await expect(catalog.card("sms-smishing")).toHaveCount(0);
  });

  test("sort by 'shortest' surfaces the shortest course at the top", async ({ page }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    await catalog.selectSort("shortest");
    // `qr-quishing` is one of the shortest (6 min); whatever sits at
    // position 0 must have estimatedMinutes <= the qr-quishing card.
    await expect(catalog.card("qr-quishing")).toBeVisible();
    // Assert the qr-quishing card appears in the first few visible
    // positions — strict #1 would be brittle if a Phase A course
    // ships at <= 6 min. We accept anything in the first 3 cards.
    const visibleSlugs = await catalog
      .allCards()
      .evaluateAll((els) =>
        els.slice(0, 3).map((el) => el.getAttribute("data-testid")?.replace("courses-card-", "")),
      );
    expect(visibleSlugs).toContain("qr-quishing");
  });

  test("audience filter 'seniors' surfaces the chran-svojich-blizkych course", async ({ page }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    await catalog.toggleAudience("seniors");
    await expect(catalog.card("chran-svojich-blizkych")).toBeVisible();
  });

  test("card meta: difficulty + minutes render verbatim on the sms-smishing card", async ({
    page,
  }) => {
    const catalog = new CoursesCatalog(page);
    await catalog.open();
    await expect(catalog.cardDifficulty("sms-smishing")).toHaveText("začiatočník");
    await expect(catalog.cardMinutes("sms-smishing")).toHaveText("8 min");
  });
});
