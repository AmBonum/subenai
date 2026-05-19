import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

// E16.4 — SSR head metadata for /blog (the "Akadémia" surface). Mirrors
// the SEO contract of per-article routes (titles, descriptions, OG,
// Twitter, robots) so Google + social previews see the right thing on
// the index page too. Description matches the SK i18n string the
// visible <h1>/<p> render (i18n/locales/sk/blog.json → index.*) —
// keep them in sync when copy changes.
//
// Branded title moves the SK search-intent signal from "blog" (low
// value) to "akadémia bezpečnosti" (long-tail, B2B-friendly). URL
// path stays /blog for backward compat (sitemap, RSS, JSON-LD,
// inbound links all reference it).

const PAGE_TITLE = "akadémia subenai — návody o internetových podvodoch";
const BLOG_INDEX_DESCRIPTION =
  "akadémia subenai — sprievodcovia a návody, ako rozpoznať scam skôr, než ťa dostane. reálne príklady, psychológia manipulácie, krátke testy. v slovenčine.";

export const Route = createFileRoute("/blog/")({
  head: () => {
    const url = `${SITE_ORIGIN}/blog`;
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: "description", content: BLOG_INDEX_DESCRIPTION },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: PAGE_TITLE },
        { property: "og:description", content: BLOG_INDEX_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: PAGE_TITLE },
        { name: "twitter:description", content: BLOG_INDEX_DESCRIPTION },
      ],
      links: [
        { rel: "canonical", href: url },
        // Surface the RSS feed at the index level so feed readers can
        // discover it via <link rel="alternate"> autodetect.
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "akadémia subenai — RSS",
          href: `${SITE_ORIGIN}/blog/rss.xml`,
        },
      ],
    };
  },
});
