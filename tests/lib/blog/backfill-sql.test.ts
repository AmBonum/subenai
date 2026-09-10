import { describe, it, expect } from "vitest";
import {
  buildBlogBackfillSql,
  staggeredPublishedAt,
  type BlogBackfillPost,
} from "@/lib/blog/backfill-sql";

const post: BlogBackfillPost = {
  slug: "demo-clanok",
  title: "demo",
  subtitle: null,
  excerpt: "krátky výťah",
  body_mdx: "telo s $body$ pascou a 'apostrofom'\n\n[[quiz:e65-x-1]]",
  category_slug: "bezpecna-praca-s-ai",
  author_slug: "subenai-editorial",
  pillar_slug: "pillar-slug",
  difficulty: "advanced",
  related_course_slug: "ai-bezpecnost-pre-odbornikov",
  primary_keyword: "demo",
  search_intent: "informational",
  reading_minutes: 7,
  seo_title: "demo | subenai",
  seo_description: "popis",
  canonical_url: null,
  hero_image_url: null,
  og_image_url: null,
  sources: [{ label: "z", url: "https://example.org", publisher: "Ex", accessed_at: "2026-09-10" }],
  published_at: "2026-09-10T07:00:00+02:00",
};

const opts = { title: "T", sourceNote: "S" };

describe("buildBlogBackfillSql", () => {
  const sql = buildBlogBackfillSql([post], opts);

  it("is idempotent and transactional", () => {
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("ON CONFLICT (slug) DO UPDATE SET");
    expect(sql.trim().endsWith("COMMIT;")).toBe(true);
  });

  it("resolves category, author and pillar by slug subselects", () => {
    expect(sql).toContain("FROM public.blog_categories WHERE slug = $cat$bezpecna-praca-s-ai$cat$");
    expect(sql).toContain("FROM public.blog_authors WHERE slug = $auth$subenai-editorial$auth$");
    expect(sql).toContain("FROM public.blog_posts WHERE slug = $pillar$pillar-slug$pillar$");
  });

  it("escapes a body containing the dollar tag and writes article + lane columns", () => {
    expect(sql).toContain("$body_$telo s $body$ pascou");
    expect(sql).toContain("'article'");
    expect(sql).toContain("$diff$advanced$diff$");
    expect(sql).toContain("'published'");
    expect(sql).toContain("$pub$2026-09-10T07:00:00+02:00$pub$");
  });

  it("writes NULL for absent optional fields", () => {
    const noPillar = buildBlogBackfillSql([{ ...post, pillar_slug: null, difficulty: null }], opts);
    expect(noPillar).toContain("NULL, -- pillar_post_id");
    expect(noPillar).toContain("NULL, -- difficulty");
    expect(noPillar).toContain("NULL, -- subtitle");
  });

  it("is deterministic", () => {
    expect(buildBlogBackfillSql([post], opts)).toBe(sql);
  });
});

describe("staggeredPublishedAt", () => {
  it("adds 75 minutes per index from 07:00 Bratislava time", () => {
    expect(staggeredPublishedAt(0)).toBe("2026-09-10T07:00:00+02:00");
    expect(staggeredPublishedAt(2)).toBe("2026-09-10T09:30:00+02:00");
  });
});
