import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function readPublic(file: string): string {
  return readFileSync(resolve(ROOT, "public", file), "utf-8");
}

describe("AH-9.9 sitemap.xml", () => {
  const xml = readPublic("sitemap.xml");

  it("includes the seeded published CMS slug /s/<slug>", () => {
    expect(xml).toContain("https://subenai.sk/s/o-projekte-rozsirene");
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

  it("retains the sitemap pointer", () => {
    expect(txt).toMatch(/^Sitemap:\s*https:\/\/subenai\.sk\/sitemap\.xml\s*$/m);
  });

  it("retains User-agent and Allow directives", () => {
    expect(txt).toMatch(/^User-agent:\s*\*/m);
    expect(txt).toMatch(/^Allow:\s*\//m);
  });
});
