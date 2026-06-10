import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

/**
 * E37 — mobile viewport (375x667) catalog usability.
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-29).
 *
 * iPhone SE / 8 represents the small-modern-mobile baseline (375x667).
 * Catalog must render without horizontal scroll, CTAs stay clickable
 * within the viewport, and touch targets satisfy the WCAG 2.5.5 44px
 * minimum (carried over from TC-12 but verified specifically at the
 * narrow viewport).
 */

test.use({ viewport: { width: 375, height: 667 } });

test.describe("/tests catalog — 375x667 mobile viewport (TC-29)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("standard + courses CTAs are within the 375px viewport width", async ({
    page,
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    // Scroll CTAs into view first — they live at the bottom of the page.
    await testsDirectory.index.standardCta.scrollIntoViewIfNeeded();

    const standardBox = await testsDirectory.index.standardCta.boundingBox();
    expect(standardBox).not.toBeNull();
    // CTA must NOT clip the right edge of the 375px viewport.
    expect(standardBox!.x + standardBox!.width).toBeLessThanOrEqual(375);
    expect(standardBox!.x).toBeGreaterThanOrEqual(0);

    const coursesBox = await testsDirectory.index.coursesCta.boundingBox();
    expect(coursesBox).not.toBeNull();
    expect(coursesBox!.x + coursesBox!.width).toBeLessThanOrEqual(375);
    expect(coursesBox!.x).toBeGreaterThanOrEqual(0);

    // No horizontal scrollbar — document width must equal viewport width.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });

  test("touch targets on sort + filter chips remain ≥44px at narrow viewport", async ({
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    const sortBox = await testsDirectory.index.sortSelect.boundingBox();
    expect(sortBox).not.toBeNull();
    expect(sortBox!.height).toBeGreaterThanOrEqual(44);
    const chip = testsDirectory.index.filterChips.first();
    const chipBox = await chip.boundingBox();
    if (chipBox) {
      expect(chipBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("pack card grid stacks single-column on narrow viewport", async ({ testsDirectory }) => {
    await testsDirectory.index.open();
    // The catalog grid uses Tailwind responsive classes that collapse to
    // 1-column under sm. Two adjacent cards on a 375px viewport should
    // have the same x-position (stacked) and different y-positions.
    const cards = testsDirectory.index.packCards();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Both cards start at (approximately) the same x — left-aligned in
    // the single-column layout. Allow 2px slop for sub-pixel rendering.
    expect(Math.abs(first!.x - second!.x)).toBeLessThanOrEqual(2);
    // Second card sits below the first.
    expect(second!.y).toBeGreaterThan(first!.y);
  });
});
