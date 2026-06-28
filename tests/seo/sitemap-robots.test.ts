import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function readPublic(file: string): string {
  return readFileSync(resolve(ROOT, "public", file), "utf-8");
}

describe("AH-9.9 sitemap.xml", () => {
  const xml = readPublic("sitemap.xml");

  it("includes the DB-backed pack detail pages /tests/<slug>", () => {
    // Since 2026-06-12 the committed sitemap is regenerated WITH prod
    // Supabase env vars (set -a; source .env; npm run build) so it
    // carries live data: 15 platform packs + per-article blog URLs.
    // Prod cms_pages is empty, so no /s/<slug> entries — the route
    // noindexes missing slugs and listing them would point crawlers
    // at 404s. When the first real CMS page is published, regenerate.
    expect(xml).toContain("https://subenai.sk/tests/heslo-2fa");
    expect(xml).toContain("https://subenai.sk/tests/seniori");
  });

  it("does not include /s/<slug> pages that are unpublished in prod", () => {
    expect(xml).not.toMatch(/<loc>https:\/\/subenai\.sk\/s\//);
  });

  it("E30 — generator script exports both Supabase + mock CMS loaders", () => {
    // The generator must still handle missing Supabase env vars
    // (CI without secrets / offline build) via the mock fallback
    // instead of failing the build.
    const generatorSrc = readFileSync(resolve(ROOT, "scripts", "generate-sitemap.mjs"), "utf-8");
    expect(generatorSrc).toContain("loadCmsPublishedSlugsFromSupabase");
    expect(generatorSrc).toContain("loadCmsPublishedSlugsFromMock");
    expect(generatorSrc).toMatch(/cms_pages\?status=eq\.published/);
  });

  it("does not include /app/* paths", () => {
    expect(xml).not.toMatch(/<loc>https:\/\/subenai\.sk\/app\//);
  });

  it("does not include /admin/* paths", () => {
    expect(xml).not.toMatch(/<loc>https:\/\/subenai\.sk\/admin/);
  });

  it("does not include /t/<shareId> paths", () => {
    expect(xml).not.toMatch(/<loc>https:\/\/subenai\.sk\/t\//);
  });

  it("preserves the existing top-level entries", () => {
    expect(xml).toContain("https://subenai.sk/");
    expect(xml).toContain("https://subenai.sk/tests");
    expect(xml).toContain("https://subenai.sk/about");
  });

  it("includes the academy index", () => {
    expect(xml).toContain("https://subenai.sk/academy</loc>");
  });

  it("includes academy category archive pages", () => {
    expect(xml).toContain("https://subenai.sk/academy/category/phishing-a-emaily");
    expect(xml).toContain("https://subenai.sk/academy/category/ai-scamy");
    expect(xml).toContain("https://subenai.sk/academy/category/studenti");
  });
});

describe("AH-9.9 robots.txt", () => {
  const txt = readPublic("robots.txt");

  it("disallows /app/", () => {
    expect(txt).toMatch(/^Disallow:\s*\/app\/\s*$/m);
  });

  it("disallows /admin/", () => {
    expect(txt).toMatch(/^Disallow:\s*\/admin\/\s*$/m);
  });

  it("disallows /t/", () => {
    expect(txt).toMatch(/^Disallow:\s*\/t\/\s*$/m);
  });

  // E32 — additional crawl-budget guards
  it("E32 — disallows /r/ (unique-per-user share URLs)", () => {
    expect(txt).toMatch(/^Disallow:\s*\/r\/\s*$/m);
  });

  it("E32 — disallows /login (auth UI, not indexable)", () => {
    expect(txt).toMatch(/^Disallow:\s*\/login\s*$/m);
  });

  it("E32 — disallows /auth/ (auth callbacks)", () => {
    expect(txt).toMatch(/^Disallow:\s*\/auth\/\s*$/m);
  });

  it("E32/E33 — disallows /test/builder/ (per-set composer URLs)", () => {
    expect(txt).toMatch(/^Disallow:\s*\/test\/builder\/\s*$/m);
  });

  it("retains the sitemap pointer", () => {
    expect(txt).toMatch(/^Sitemap:\s*https:\/\/subenai\.sk\/sitemap\.xml\s*$/m);
  });

  it("retains User-agent and Allow directives", () => {
    expect(txt).toMatch(/^User-agent:\s*\*/m);
    expect(txt).toMatch(/^Allow:\s*\//m);
  });
});
