import { test, expect } from "@playwright/test";

// _redirects is evaluated by the Cloudflare Pages edge layer, not by the Vite
// dev server. Tests in this file must run against wrangler (port 8788).
// Override with BASE_URL env var if the port changes in wrangler.toml.
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });

test.describe("SK→EN URL redirects (public/_redirects)", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: /podpora permanently redirects to /support
  test("TC-01: /podpora permanently redirects to /support", async ({ request }) => {
    const r = await request.fetch("/podpora", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/support");
  });

  // TC-02: /sponzori permanently redirects to /sponsors
  test("TC-02: /sponzori permanently redirects to /sponsors", async ({ request }) => {
    const r = await request.fetch("/sponzori", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/sponsors");
  });

  // TC-03: /zmeny permanently redirects to /changelog
  test("TC-03: /zmeny permanently redirects to /changelog", async ({ request }) => {
    const r = await request.fetch("/zmeny", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/changelog");
  });

  // TC-04: Following a redirect end-to-end lands on the correct destination page
  test("TC-04: following /podpora redirect end-to-end lands on /support", async ({ request }) => {
    // Default maxRedirects allows the request fixture to follow the 301.
    const r = await request.fetch("/podpora");
    expect(r.status()).toBe(200);
    expect(r.url()).toMatch(/\/support$/);
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  // TC-05: Hitting the English target URL directly returns 200, not a second redirect
  test("TC-05: /support returns 200 with no Location header", async ({ request }) => {
    const r = await request.fetch("/support", { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    expect(r.headers()["location"]).toBeUndefined();
  });

  // TC-06: An unknown Slovak-looking path NOT in _redirects returns the app shell
  test("TC-06: /neexistujuca-stranka returns 200 SPA shell with no Location header", async ({
    request,
  }) => {
    const r = await request.fetch("/neexistujuca-stranka", {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(200);
    expect(r.headers()["location"]).toBeUndefined();
  });

  // TC-07: /spravovat-podporu permanently redirects to /manage-support
  test("TC-07: /spravovat-podporu permanently redirects to /manage-support", async ({
    request,
  }) => {
    const r = await request.fetch("/spravovat-podporu", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/manage-support");
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-08: /sponzori/vsetci (sub-path, exact rule) redirects straight to
  // /sponsors (M3 merge — no /sponsors/all chain).
  test("TC-08: /sponzori/vsetci redirects to /sponsors (exact rule over splat)", async ({
    request,
  }) => {
    const r = await request.fetch("/sponzori/vsetci", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/sponsors");
  });

  // TC-08b: legacy /sponsors/all 301s to the merged /sponsors page.
  test("TC-08b: /sponsors/all redirects to /sponsors", async ({ request }) => {
    const r = await request.fetch("/sponsors/all", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/sponsors");
  });

  // TC-09: /testy permanently redirects to /tests
  test("TC-09: /testy permanently redirects to /tests", async ({ request }) => {
    const r = await request.fetch("/testy", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/tests");
  });

  // TC-10: /testy/eshop (wildcard splat) redirects to /tests/eshop
  test("TC-10: /testy/eshop splat rule preserves the path segment", async ({ request }) => {
    const r = await request.fetch("/testy/eshop", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/tests/eshop");
  });

  // TC-11: /test/firma catch-all redirects to /tests
  test("TC-11: /test/firma redirects to /tests", async ({ request }) => {
    const r = await request.fetch("/test/firma", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/tests");
  });

  // TC-12: /skolenia and /kurzy both redirect to /academy (E55 — courses
  // merged into the academy hub; no double hop via /courses).
  test("TC-12: /skolenia and /kurzy both redirect to /academy", async ({ request }) => {
    const rSkolenia = await request.fetch("/skolenia", { maxRedirects: 0 });
    expect(rSkolenia.status()).toBe(301);
    expect(rSkolenia.headers()["location"]).toBe("/academy");

    const rKurzy = await request.fetch("/kurzy", { maxRedirects: 0 });
    expect(rKurzy.status()).toBe(301);
    expect(rKurzy.headers()["location"]).toBe("/academy");
  });

  // TC-13: /skolenia/sms-smishing (wildcard) redirects to /academy/sms-smishing
  test("TC-13: /skolenia/sms-smishing splat rule preserves the path segment", async ({
    request,
  }) => {
    const r = await request.fetch("/skolenia/sms-smishing", {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/academy/sms-smishing");
  });

  // TC-13a: E55 academy cutover — /courses and /blog (+ splats, category,
  // author) 301 to the unified /academy surface, preserving link equity.
  test("TC-13a: /courses and /blog redirect to /academy", async ({ request }) => {
    const cases: [string, string][] = [
      ["/courses", "/academy"],
      ["/blog", "/academy"],
      ["/courses/email-phishing", "/academy/email-phishing"],
      ["/blog/phishing-kompletny-sprievodca", "/academy/phishing-kompletny-sprievodca"],
      ["/blog/kategoria/ai-scamy", "/academy/category/ai-scamy"],
      ["/blog/autor/subenai-editorial", "/academy/author/subenai-editorial"],
    ];
    for (const [from, to] of cases) {
      const r = await request.fetch(from, { maxRedirects: 0 });
      expect(r.status(), `expected 301 for ${from}`).toBe(301);
      expect(r.headers()["location"], `wrong target for ${from}`).toBe(to);
    }
  });

  // TC-14: /o-projekte permanently redirects to /about
  test("TC-14: /o-projekte permanently redirects to /about", async ({ request }) => {
    const r = await request.fetch("/o-projekte", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/about");
  });

  // TC-15: /kontakt redirects to /contact-form (E48 rename) and /skoly to /schools
  test("TC-15: /kontakt redirects to /contact-form and /skoly redirects to /schools", async ({
    request,
  }) => {
    const rKontakt = await request.fetch("/kontakt", { maxRedirects: 0 });
    expect(rKontakt.status()).toBe(301);
    expect(rKontakt.headers()["location"]).toBe("/contact-form");

    const rSkoly = await request.fetch("/skoly", { maxRedirects: 0 });
    expect(rSkoly.status()).toBe(301);
    expect(rSkoly.headers()["location"]).toBe("/schools");
  });

  // TC-16: /podakovanie/stripe-abc123 (wildcard thank-you) preserves the splat
  test("TC-16: /podakovanie/:splat preserves the full path segment", async ({ request }) => {
    const r = await request.fetch("/podakovanie/stripe-abc123", {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/thank-you/stripe-abc123");
  });

  // TC-17: Status is 301 (permanent) for a representative sample of four rules
  test("TC-17: all sampled redirects return 301, not 302/303/307", async ({ request }) => {
    const paths = ["/podpora", "/testy", "/zmeny", "/sponzori/vsetci"];
    for (const path of paths) {
      const r = await request.fetch(path, { maxRedirects: 0 });
      expect(r.status(), `expected 301 for ${path}`).toBe(301);
    }
  });
});
