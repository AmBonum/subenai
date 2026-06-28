import { test, expect } from "../../fixtures/base";

// E54.5 — docs portal, anonymous journeys. The auth-gated rendering logic
// (app-docs link visibility, explainer content) is covered by the Vitest
// component suite; here we verify the real routing: public access, the
// auth redirect, and the header entry points.
test.describe("Docs portal (anonymous)", () => {
  test("public index lists sections and hides the app-docs link", async ({
    docsPortal,
    consent,
  }) => {
    await docsPortal.gotoIndex();
    if (await consent.isVisible()) await consent.rejectAll();
    await expect(docsPortal.indexRoot).toBeVisible();
    expect(await docsPortal.sectionLinks.count()).toBeGreaterThanOrEqual(6);
    await expect(docsPortal.appLink).toHaveCount(0);
  });

  test("a public article renders its title", async ({ docsPortal, consent }) => {
    await docsPortal.gotoArticle("faq");
    if (await consent.isVisible()) await consent.rejectAll();
    await expect(docsPortal.articleTitle).toBeVisible();
  });

  test("app docs redirect anonymous visitors to login", async ({ docsPortal, page, consent }) => {
    await docsPortal.gotoAppDoc("dashboard");
    if (await consent.isVisible()) await consent.rejectAll();
    await expect(page).toHaveURL(/\/login/);
  });

  test("the header exposes login in the bar and docs in the sidebar", async ({
    page,
    header,
    consent,
  }) => {
    await page.goto("/");
    if (await consent.isVisible()) await consent.rejectAll();
    // login stays in the top bar; Dokumentácia lives in the shared menu sheet
    await expect(header.navLogin).toHaveAttribute("href", "/login");
    // E56 — the sheet opens from the bottom-nav Menu button on mobile, so
    // drop to a mobile viewport before opening it (the bottom nav is hidden
    // from `lg` up).
    await page.setViewportSize({ width: 375, height: 667 });
    await header.openMobileMenu();
    await expect(header.sheetDocsLink).toHaveAttribute("href", "/docs");
  });
});
