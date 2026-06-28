import { test, expect } from "@playwright/test";

// Visual-regression baselines for the most stable public pages. Catches the
// class of bug the rest of the suite is blind to — a Tailwind v4 Preflight
// regression, a token change, a layout shift — that does not break any
// assertion but visibly breaks the page (see the "restore pointer cursor"
// Preflight fix in git history). Baselines are OS-specific (Playwright suffixes
// them -<platform>.png); CI is Linux, so the committed -linux baselines are the
// source of truth. Re-baseline after an intentional visual change with:
//   npx playwright test --project=visual --update-snapshots   (in the CI OS)
const PAGES = [
  { path: "/", name: "home" },
  { path: "/about", name: "about" },
  { path: "/cookies", name: "cookies" },
];

test.describe("visual regression — public pages", () => {
  for (const p of PAGES) {
    test(`${p.name} matches baseline`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      // The app is client-rendered (the SSR shell is identical across routes);
      // let hydration paint the route-specific content before the snapshot.
      await page.waitForTimeout(800);
      // animations off + a small pixel-ratio tolerance keep this stable
      // against sub-pixel font rendering jitter without hiding real diffs.
      await expect(page).toHaveScreenshot(`${p.name}.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
