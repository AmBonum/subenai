import { createFileRoute, notFound } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { fetchAcademyEntry } from "@/lib/academy/queries";
import { buildAcademyJsonLd } from "@/lib/seo/academy-jsonld";
import { jsonLdString } from "@/lib/seo/json-ld";

// E55.3 — Academy entry (article or interactive lesson). Loader feeds the
// head/JSON-LD; the lazy component renders the body (with [[quiz:…]] widgets).
export const Route = createFileRoute("/academy/$slug")({
  loader: async ({ params }) => {
    const entry = await fetchAcademyEntry(params.slug);
    if (!entry) throw notFound();
    return entry;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Nenájdené · subenai" }, { name: "robots", content: "noindex" }] };
    }
    const entry = loaderData;
    const url = `${SITE_ORIGIN}/academy/${entry.slug}`;
    const ogImage = entry.og_image_url ?? entry.hero_image_url ?? `${SITE_ORIGIN}/og-default.png`;
    return {
      meta: [
        { title: entry.seo_title ?? `${entry.title} · subenai` },
        { name: "description", content: entry.seo_description ?? entry.excerpt },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: entry.title },
        { property: "og:description", content: entry.excerpt },
        { property: "og:type", content: entry.content_type === "lesson" ? "article" : "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: entry.canonical_url ?? url }],
      scripts: [{ type: "application/ld+json", children: jsonLdString(buildAcademyJsonLd(entry)) }],
    };
  },
});
