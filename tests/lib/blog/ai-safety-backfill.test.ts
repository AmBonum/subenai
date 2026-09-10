import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildAiSafetyBackfillSql, loadAiSafetyPost } from "@/lib/blog/ai-safety-backfill";
import type { AiSafetyArticle } from "@/content/academy/ai-safety-section";

// Exercises the validation paths of the generator against a throwaway
// content root — the real content is covered by the section integrity test.

let root: string;

function frontmatter(overrides: Record<string, string> = {}): string {
  const fm: Record<string, string> = {
    slug: "demo-clanok",
    title: '"demo"',
    excerpt: '"výťah"',
    category_slug: "bezpecna-praca-s-ai",
    difficulty: "advanced",
    author_slug: "subenai-editorial",
    primary_keyword: '"demo"',
    search_intent: "informational",
    seo_title: '"demo | subenai"',
    seo_description: '"popis"',
    ...overrides,
  };
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\nsources:\n  - label: "z"\n    url: "https://example.org"\n---\n\ntelo\n`;
}

function write(slug: string, body: string): void {
  writeFileSync(join(root, "src/content/blog", `${slug}.mdx`), body);
}

const article: AiSafetyArticle = { slug: "demo-clanok", lane: "advanced", quizIds: [] };

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "e65-backfill-"));
  mkdirSync(join(root, "src/content/blog"), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("ai-safety backfill generator", () => {
  it("builds SQL for a well-formed article with the lane's default course", () => {
    write("demo-clanok", frontmatter());
    const sql = buildAiSafetyBackfillSql(root, [article]);
    expect(sql).toContain("$slug$demo-clanok$slug$");
    expect(sql).toContain("$course$ai-bezpecnost-pre-odbornikov$course$");
    expect(sql).toContain("$diff$advanced$diff$");
    expect(sql).toContain("$pub$2026-09-10T07:00:00+02:00$pub$");
  });

  it("rejects a lane that disagrees with the manifest", () => {
    write("demo-clanok", frontmatter({ difficulty: "beginner" }));
    expect(() => loadAiSafetyPost(root, article, 0)).toThrow(/manifest lane/);
  });

  it("rejects a missing required key", () => {
    write("demo-clanok", frontmatter({ seo_description: "" }));
    expect(() => loadAiSafetyPost(root, article, 0)).toThrow(/missing frontmatter key/);
  });

  it("rejects a foreign category", () => {
    write("demo-clanok", frontmatter({ category_slug: "ai-scamy" }));
    expect(() => loadAiSafetyPost(root, article, 0)).toThrow(/category_slug/);
  });
});
