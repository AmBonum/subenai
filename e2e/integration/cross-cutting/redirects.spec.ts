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

  // TC-08: /sponzori/vsetci (sub-path, exact rule) redirects to /sponsors/all
  test("TC-08: /sponzori/vsetci redirects to /sponsors/all (exact rule over splat)", async ({
    request,
  }) => {
    const r = await request.fetch("/sponzori/vsetci", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/sponsors/all");
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

  // TC-12: /skolenia and /kurzy both redirect to /courses
  test("TC-12: /skolenia and /kurzy both redirect to /courses", async ({ request }) => {
    const rSkolenia = await request.fetch("/skolenia", { maxRedirects: 0 });
    expect(rSkolenia.status()).toBe(301);
    expect(rSkolenia.headers()["location"]).toBe("/courses");

    const rKurzy = await request.fetch("/kurzy", { maxRedirects: 0 });
    expect(rKurzy.status()).toBe(301);
    expect(rKurzy.headers()["location"]).toBe("/courses");
  });

  // TC-13: /skolenia/sms-smishing (wildcard) redirects to /courses/sms-smishing
  test("TC-13: /skolenia/sms-smishing splat rule preserves the path segment", async ({
    request,
  }) => {
    const r = await request.fetch("/skolenia/sms-smishing", {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/courses/sms-smishing");
  });

  // TC-14: /o-projekte permanently redirects to /about
  test("TC-14: /o-projekte permanently redirects to /about", async ({ request }) => {
    const r = await request.fetch("/o-projekte", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toBe("/about");
  });

  // TC-15: /kontakt and /skoly redirect to their English equivalents
  test("TC-15: /kontakt redirects to /contact and /skoly redirects to /schools", async ({
    request,
  }) => {
    const rKontakt = await request.fetch("/kontakt", { maxRedirects: 0 });
    expect(rKontakt.status()).toBe(301);
    expect(rKontakt.headers()["location"]).toBe("/contact");

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
