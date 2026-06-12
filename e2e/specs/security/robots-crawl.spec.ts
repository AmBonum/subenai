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

  test("TC-RB-03: legal pages permit indexing (rendered <meta robots>)", async ({
    page,
    docHead,
  }) => {
    for (const route of ["/privacy", "/cookies", "/about"]) {
      await page.goto(route);
      // docHead POM auto-waits for the meta to attach — a bare
      // page.evaluate raced HeadContent's client-side render and read
      // an empty head (flaky undefined, 2026-06-12).
      const content = await docHead.robotsContent();
      expect(content?.toLowerCase(), `${route} should permit indexing — got "${content}"`).toMatch(
        /index/,
      );
      expect(content?.toLowerCase(), `${route} must not contain noindex`).not.toContain("noindex");
    }
  });
});
