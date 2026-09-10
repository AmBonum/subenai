import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

import {
  AI_SAFETY_ARTICLES,
  AI_SAFETY_CATEGORY_SLUG,
  AI_SAFETY_PILLAR_SLUG,
  RELATED_COURSE_BY_LANE,
  type AiSafetyArticle,
} from "@/content/academy/ai-safety-section";
import {
  buildBlogBackfillSql,
  staggeredPublishedAt,
  type BlogBackfillPost,
} from "@/lib/blog/backfill-sql";

// E65 — MDX → backfill rows for the safe-AI section. Pure with respect to
// the output: reads the manifest's MDX files under `root` and returns the SQL
// string, so the integrity test can compare against the committed file in
// memory instead of rewriting it. The CLI (scripts/generate-blog-backfill.ts)
// is the only writer.

export const AI_SAFETY_BACKFILL_PATH = "supabase/backfills/20260910_ai_safety_articles.sql";

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

export function loadAiSafetyPost(
  root: string,
  article: AiSafetyArticle,
  index: number,
): BlogBackfillPost {
  const raw = readFileSync(join(root, "src/content/blog", `${article.slug}.mdx`), "utf8");
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
}

export function buildAiSafetyBackfillSql(
  root: string,
  articles: ReadonlyArray<AiSafetyArticle> = AI_SAFETY_ARTICLES,
): string {
  const posts = articles.map((article, index) => loadAiSafetyPost(root, article, index));
  return buildBlogBackfillSql(posts, {
    title: "E65 — Bezpečná práca s AI articles",
    sourceNote:
      "docs/superpowers/specs/2026-09-10-E65-ai-safety-content-design.md; requires supabase/migrations/20260910100000_blog_category_ai_safety.sql",
  });
}
