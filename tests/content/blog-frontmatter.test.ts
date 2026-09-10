import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";

import { CATEGORY_VISUALS } from "@/lib/blog/category-visuals";

// E65 — contract over every MDX seed file in src/content/blog. The seed
// script and the backfill generator both rely on this shape; a malformed
// file used to surface only when someone ran the seed against Supabase.

const DIR = resolve(__dirname, "../../src/content/blog");
const REQUIRED = [
  "slug",
  "title",
  "excerpt",
  "category_slug",
  "author_slug",
  "primary_keyword",
  "search_intent",
  "seo_title",
  "seo_description",
  "sources",
] as const;

interface Source {
  label?: unknown;
  url?: unknown;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
const posts = files.map((file) => {
  const { data } = matter(readFileSync(resolve(DIR, file), "utf8"));
  return { file, data: data as Record<string, unknown> };
});

describe("blog MDX frontmatter contract", () => {
  it("finds the seed files", () => {
    expect(posts.length).toBeGreaterThan(80);
  });

  it("every file carries the required keys and its slug matches the filename", () => {
    for (const { file, data } of posts) {
      for (const key of REQUIRED) {
        expect(data[key], `${file}: ${key}`).toBeDefined();
        expect(data[key], `${file}: ${key}`).not.toBeNull();
      }
      expect(`${data.slug}.mdx`).toBe(file);
    }
  });

  it("category_slug is a known category", () => {
    for (const { file, data } of posts) {
      expect(CATEGORY_VISUALS[data.category_slug as string], file).toBeDefined();
    }
  });

  it("sources meet the minimum and every source has a label + valid URL", () => {
    for (const { file, data } of posts) {
      const sources = data.sources as Source[];
      const min = data.pillar === true ? 4 : 3;
      expect(Array.isArray(sources), file).toBe(true);
      expect(sources.length, file).toBeGreaterThanOrEqual(min);
      for (const s of sources) {
        expect(typeof s.label, `${file}: source label`).toBe("string");
        expect(() => new URL(String(s.url)), `${file}: ${String(s.url)}`).not.toThrow();
      }
    }
  });

  it("difficulty, when present, is beginner or advanced", () => {
    for (const { file, data } of posts) {
      if (data.difficulty !== undefined) {
        expect(["beginner", "advanced"], file).toContain(data.difficulty);
      }
    }
  });
});
