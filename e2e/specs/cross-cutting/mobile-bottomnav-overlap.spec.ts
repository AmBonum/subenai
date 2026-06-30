import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { ComposerPage } from "../../poms/quiz/ComposerPage";
import { SchoolsPage } from "../../poms/marketing/SchoolsPage";
import { MobileBottomNav } from "../../poms/layout/MobileBottomNav";

// E58 — the mobile bottom-nav (E56) must never cover a page's own fixed bottom
// action bar. Regression guard for the two known offenders (the test
// composer's action bar + the schools sticky CTA), which previously sat at
// bottom-0 underneath the z-40 nav.

test.describe("Mobile bottom-nav does not overlap page bottom bars", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await page.setViewportSize({ width: 414, height: 896 });
  });

  test("composer action bar sits above the bottom-nav", async ({ page }) => {
    const composer = new ComposerPage(page);
    const nav = new MobileBottomNav(page);
    await page.goto("/test/builder");
    await composer.actionsRegion.waitFor({ state: "visible" });
    await nav.root.waitFor({ state: "visible" });
    const bar = await composer.actionsRegion.boundingBox();
    const navBox = await nav.root.boundingBox();
    expect(bar).not.toBeNull();
    expect(navBox).not.toBeNull();
    // The action bar's bottom edge must be at/above the nav's top edge.
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(navBox!.y + 1);
  });

  test("schools sticky CTA sits above the bottom-nav", async ({ page }) => {
    const schools = new SchoolsPage(page);
    const nav = new MobileBottomNav(page);
    await page.goto("/schools");
    await schools.stickyCtaBar.waitFor({ state: "visible" });
    await nav.root.waitFor({ state: "visible" });
    const bar = await schools.stickyCtaBar.boundingBox();
    const navBox = await nav.root.boundingBox();
    expect(bar).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(navBox!.y + 1);
  });
});
