import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";
import { parseSources, type BlogPostDetail } from "@/lib/blog/queries";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/blog-jsonld";

// E16.3 Phase 2 — SSR JSON-LD via TanStack route loader + head().
//
// The lazy component file at $slug.lazy.tsx still uses useBlogPost()
// for client-side hydration + refresh on navigation; this eager file
// adds a SERVER-side loader so the post data is also available before
// the React bundle hydrates. head() then emits the Article and
// BreadcrumbList JSON-LD into the rendered HTML <head>, where Google's
// crawler sees it without depending on JS execution. The duplicate
// client+server fetch is intentional: it lets Google index the rich
// results immediately while client UX still gets the React Query
// cache-and-revalidate pattern.
//
// Returning null on miss preserves the not-found rendering path the
// lazy component already handles (no `notFound()` thrown — the
// component shows its own friendly 404 with a /blog back link).

const POST_SELECT = `id, slug, title, subtitle, excerpt, body_mdx, hero_image_url, og_image_url,
  seo_title, seo_description, canonical_url, pillar_post_id, primary_keyword,
  faq_jsonb, sources_jsonb, reading_minutes, published_at,
  category:blog_categories!inner(slug, name),
  author:blog_authors!inner(slug, display_name)`;

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }): Promise<BlogPostDetail | null> => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(POST_SELECT)
      .eq("slug", params.slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as unknown as Omit<BlogPostDetail, "sources"> & {
      sources_jsonb: unknown;
    };
    return { ...row, sources: parseSources(row.sources_jsonb) };
  },
  head: ({ loaderData }) => {
    const post = loaderData;
    if (!post) {
      return {
        meta: [
          { title: "článok nenájdený | subenai" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const url = `${SITE_ORIGIN}/blog/${post.slug}`;
    return {
      meta: [
        { title: post.seo_title ?? `${post.title} | subenai` },
        {
          name: "description",
          content: post.seo_description ?? post.excerpt,
        },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        ...(post.hero_image_url
          ? [{ property: "og:image", content: post.hero_image_url }]
          : post.og_image_url
            ? [{ property: "og:image", content: post.og_image_url }]
            : []),
        { property: "article:published_time", content: post.published_at },
        { property: "article:section", content: post.category.name },
        { property: "article:author", content: post.author.display_name },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.excerpt },
      ],
      links: [{ rel: "canonical", href: post.canonical_url ?? url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildArticleJsonLd(post)),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(buildBreadcrumbJsonLd(post)),
        },
      ],
    };
  },
});
