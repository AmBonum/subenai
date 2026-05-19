import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

// E16.4 — SSR head metadata for /blog. Mirrors the SEO contract of
// per-article routes (titles, descriptions, OG, Twitter, robots) so
// Google + social previews see the right thing on the index page too.
// Description matches the SK i18n string the visible <h1>/<p> render
// (i18n/locales/sk/blog.json → index.description) — keep them in sync
// when copy changes.

const BLOG_INDEX_DESCRIPTION =
  "návody, ako rozpoznať scam skôr, než ťa dostane. reálne príklady, psychológia manipulácie, krátke testy. blog subenai.sk o internetových podvodoch v slovenčine.";

export const Route = createFileRoute("/blog/")({
  head: () => {
    const url = `${SITE_ORIGIN}/blog`;
    return {
      meta: [
        { title: "blog o internetových podvodoch | subenai" },
        { name: "description", content: BLOG_INDEX_DESCRIPTION },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: "blog o internetových podvodoch | subenai" },
        { property: "og:description", content: BLOG_INDEX_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "blog o internetových podvodoch | subenai" },
        { name: "twitter:description", content: BLOG_INDEX_DESCRIPTION },
      ],
      links: [
        { rel: "canonical", href: url },
        // Surface the RSS feed at the index level so feed readers can
        // discover it via <link rel="alternate"> autodetect.
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "subenai blog RSS",
          href: `${SITE_ORIGIN}/blog/rss.xml`,
        },
      ],
    };
  },
});
