// E35.6 — robots.txt contract.
//
// `public/robots.txt` is the single signal we send to search engines
// and LLM crawlers about which surfaces to skip. Two failure modes
// we lock here:
//   1. Disallow rules accidentally removed — e.g. an "improve SEO"
//      change drops `/t/` from the disallow list and Google starts
//      indexing thousands of unique-per-user share URLs, wasting
//      crawl budget and exposing share_ids in SERPs.
//   2. Sitemap link points to the wrong origin — silently breaks
//      structured discovery in Google Search Console.
//
// Live verification (the rendered <meta name="robots"> on each route)
// is covered by `e2e/specs/security/robots-crawl.spec.ts`.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROBOTS_PATH = resolve(process.cwd(), "public/robots.txt");
const ROBOTS_TEXT = readFileSync(ROBOTS_PATH, "utf8");
const SITE_ORIGIN = "https://subenai.sk";

// Full regex-metachar escape — `replace(/[/]/g, "\\/")` only escaped
// the slash and would silently miss e.g. a future entry containing `.`
// or `?`. CodeQL js/incomplete-sanitization flagged that.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

const REQUIRED_DISALLOWS = [
  "/app/", // auth-gated user dashboard
  "/admin/", // admin tooling
  "/login", // auth UI
  "/auth/", // OAuth callbacks
  "/t/", // unique-per-user take-test URLs
  "/r/", // unique-per-user result URLs
  "/test/builder/", // composer URLs
] as const;

describe("public/robots.txt — fundamentals", () => {
  it("starts with a wildcard User-agent allowing crawl at the root", () => {
    expect(ROBOTS_TEXT).toMatch(/User-agent:\s*\*/i);
    expect(ROBOTS_TEXT).toMatch(/Allow:\s*\//);
  });

  it("declares the sitemap on subenai.sk origin", () => {
    expect(ROBOTS_TEXT).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });

  it.each(REQUIRED_DISALLOWS)("disallows %s", (path) => {
    const pattern = new RegExp(`Disallow:\\s*${escapeRegExp(path)}`);
    expect(
      pattern.test(ROBOTS_TEXT),
      `robots.txt must contain "Disallow: ${path}" — auth-gated or unique-per-user surface`,
    ).toBe(true);
  });

  it("does NOT contain a blanket Disallow: / (would deindex the site)", () => {
    // Match Disallow: / NOT followed by another path char — i.e. bare /
    expect(ROBOTS_TEXT).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  it("does NOT explicitly Allow any disallowed surface (which would override the rule)", () => {
    for (const disallowed of REQUIRED_DISALLOWS) {
      const allowPattern = new RegExp(`Allow:\\s*${escapeRegExp(disallowed)}`);
      expect(
        allowPattern.test(ROBOTS_TEXT),
        `robots.txt must not Allow "${disallowed}" — would override Disallow`,
      ).toBe(false);
    }
  });
});
