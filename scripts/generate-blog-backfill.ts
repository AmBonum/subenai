#!/usr/bin/env tsx
// E65 — generate the idempotent SQL backfill for the safe-AI section
// articles from their MDX files. Deterministic (fixed stagger timestamps),
// so re-running with unchanged MDX produces a byte-identical file. Per
// CLAUDE.md the owner runs the output against prod Supabase after merge.
//
//   npm run blog:backfill
//
// Output: supabase/backfills/20260910_ai_safety_articles.sql
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import matter from "gray-matter";

import {
  AI_SAFETY_ARTICLES,
  AI_SAFETY_CATEGORY_SLUG,
  AI_SAFETY_PILLAR_SLUG,
  RELATED_COURSE_BY_LANE,
} from "@/content/academy/ai-safety-section";
import {
  buildBlogBackfillSql,
  staggeredPublishedAt,
  type BlogBackfillPost,
} from "@/lib/blog/backfill-sql";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "supabase/backfills/20260910_ai_safety_articles.sql");

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

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const posts: BlogBackfillPost[] = AI_SAFETY_ARTICLES.map((article, index) => {
  const raw = readFileSync(join(ROOT, "src/content/blog", `${article.slug}.mdx`), "utf8");
  const { data, content } = matter(raw);
  for (const key of REQUIRED) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(`${article.slug}: missing frontmatter key '${key}'`);
    }
  }
  if (data.slug !== article.slug) throw new Error(`${article.slug}: frontmatter slug mismatch`);
  if (data.category_slug !== AI_SAFETY_CATEGORY_SLUG) {
    throw new Error(`${article.slug}: category_slug must be ${AI_SAFETY_CATEGORY_SLUG}`);
  }
  if ((data.difficulty ?? null) !== article.lane) {
    throw new Error(
      `${article.slug}: difficulty '${data.difficulty}' ≠ manifest lane '${article.lane}'`,
    );
  }
  const isPillar = article.slug === AI_SAFETY_PILLAR_SLUG;
  return {
    slug: article.slug,
    title: data.title,
    subtitle: str(data.subtitle),
    excerpt: data.excerpt,
    body_mdx: content.trim(),
    category_slug: data.category_slug,
    author_slug: data.author_slug,
    pillar_slug: isPillar ? null : AI_SAFETY_PILLAR_SLUG,
    difficulty: article.lane,
    related_course_slug:
      str(data.related_course_slug) ?? RELATED_COURSE_BY_LANE[article.lane ?? "pillar"],
    primary_keyword: data.primary_keyword,
    search_intent: data.search_intent,
    reading_minutes: typeof data.reading_minutes === "number" ? data.reading_minutes : null,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    canonical_url: str(data.canonical_url),
    hero_image_url: str(data.hero_image_url),
    og_image_url: str(data.og_image_url),
    sources: data.sources,
    published_at: staggeredPublishedAt(index),
  };
});

writeFileSync(
  OUT,
  buildBlogBackfillSql(posts, {
    title: "E65 — Bezpečná práca s AI articles",
    sourceNote:
      "docs/superpowers/specs/2026-09-10-E65-ai-safety-content-design.md; requires supabase/migrations/20260910100000_blog_category_ai_safety.sql",
  }),
);
console.log(`Wrote ${posts.length} articles → ${OUT}`);
