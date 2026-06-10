import { SITE_ORIGIN } from "@/config/site";
import type { BlogPostDetail, BlogPostListItem } from "@/lib/blog/queries";

const PUBLISHER_NAME = "subenai";
const PUBLISHER_LOGO = `${SITE_ORIGIN}/favicon.png`;

// Builds Schema.org Article JSON-LD for a blog post detail page. The
// `citation` array surfaces the structured `sources_jsonb` so Google can
// see exactly which sources back the article — a strong E-E-A-T signal
// for scam-awareness ("Your Money Your Life") content where Google
// requires verifiable expertise.
export function buildArticleJsonLd(post: BlogPostDetail): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    inLanguage: "sk-SK",
    url,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      "@type": "Organization",
      name: post.author.display_name,
      url: `${SITE_ORIGIN}/blog/autor/${post.author.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: PUBLISHER_LOGO },
    },
    image: post.og_image_url ?? post.hero_image_url ?? PUBLISHER_LOGO,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: post.category.name,
    keywords: post.primary_keyword ?? undefined,
    citation: post.sources.map((s) => ({
      "@type": "CreativeWork",
      name: s.label,
      url: s.url,
      ...(s.publisher ? { publisher: { "@type": "Organization", name: s.publisher } } : {}),
    })),
  };
}

export function buildBreadcrumbJsonLd(post: BlogPostDetail): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: PUBLISHER_NAME, item: SITE_ORIGIN },
      {
        "@type": "ListItem",
        position: 2,
        name: "blog",
        item: `${SITE_ORIGIN}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.category.name,
        item: `${SITE_ORIGIN}/blog/kategoria/${post.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: post.title,
        item: `${SITE_ORIGIN}/blog/${post.slug}`,
      },
    ],
  };
}

export function buildBlogIndexJsonLd(posts: BlogPostListItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "subenai blog",
    description: "blog o internetových podvodoch, scam-awareness a digitálnej bezpečnosti.",
    url: `${SITE_ORIGIN}/blog`,
    inLanguage: "sk-SK",
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: PUBLISHER_LOGO },
    },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_ORIGIN}/blog/${p.slug}`,
      datePublished: p.published_at,
      image: p.hero_image_url ?? PUBLISHER_LOGO,
    })),
  };
}
