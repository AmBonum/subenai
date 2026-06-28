import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listPublicDocs } from "@/content/docs";

// Drift guard: the sitemap hardcodes public doc slugs (the generator is
// plain Node and can't import the TS registry). Fail if they fall out of
// sync with src/content/docs/index.ts. Vitest runs from the repo root.
const sitemapSrc = readFileSync(join(process.cwd(), "scripts/generate-sitemap.mjs"), "utf8");

describe("docs sitemap coverage", () => {
  it("includes the /docs hub", () => {
    expect(sitemapSrc).toContain('"/docs"');
  });

  it("includes every public doc slug", () => {
    for (const d of listPublicDocs()) {
      expect(sitemapSrc, `sitemap missing /docs/${d.slug}`).toContain(`/docs/${d.slug}`);
    }
  });
});
