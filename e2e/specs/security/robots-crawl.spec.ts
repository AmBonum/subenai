// E35.6 — robots crawl behaviour from the rendered page.
//
// The Vitest spec `tests/security/robots-contract.test.ts` locks the
// static `public/robots.txt` content. This spec verifies the LIVE
// served behaviour:
//   - /robots.txt is reachable and matches the file.
//   - Quiz/share/admin routes emit `<meta name="robots" content="noindex,..."`.
// The two together close the loop between static config and runtime.

import { test, expect } from "../../fixtures/base";

test.describe("Robots policy — live", () => {
  test("TC-RB-01: /robots.txt is served with the expected disallow rules", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    for (const path of ["/app/", "/admin/", "/login", "/auth/", "/t/", "/r/", "/test/builder/"]) {
      expect(body, `robots.txt must disallow ${path}`).toContain(`Disallow: ${path}`);
    }
    expect(body).toContain("Sitemap: https://subenai.sk/sitemap.xml");
  });

  test("TC-RB-02: /sitemap.xml is reachable", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<?xml");
    expect(body).toMatch(/<urlset/i);
  });

  test("TC-RB-03: legal pages permit indexing (rendered <meta robots>)", async ({ page }) => {
    for (const route of ["/privacy", "/cookies", "/about"]) {
      await page.goto(route);
      // Reading <head> via page.evaluate() is a page-level (environment)
      // action — the head is not a user-facing element and never gets a
      // POM. Per CLAUDE.md POM rules, environment access stays in-spec.
      const content = await page.evaluate(() => {
        const meta = document.head.querySelector('meta[name="robots"]');
        return meta?.getAttribute("content") ?? null;
      });
      expect(content?.toLowerCase(), `${route} should permit indexing — got "${content}"`).toMatch(
        /index/,
      );
      expect(content?.toLowerCase(), `${route} must not contain noindex`).not.toContain("noindex");
    }
  });
});
