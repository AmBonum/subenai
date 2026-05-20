import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { buildComposerJsonLd } from "@/lib/seo/composer-jsonld";
import { tFor } from "@/i18n/quiz";

interface BuilderSearch {
  config?: string;
}

export const Route = createFileRoute("/test/builder")({
  validateSearch: (search: Record<string, unknown>): BuilderSearch => ({
    config: typeof search.config === "string" ? search.config : undefined,
  }),
  // E33 Phase 1 (D5) — full SEO head() upgraded from minimal title +
  // description + robots to the canonical-set we ship on every public
  // surface (E23/E24/E25): OG + Twitter card + canonical + JSON-LD
  // WebApplication schema. The composer is the only first-of-its-kind
  // free B2B test builder in SK; it should rank on queries like
  // "tvorba testov bezpečnosti", "custom phishing test online".
  head: () => {
    const t = tFor("composer");
    const url = `${SITE_ORIGIN}/test/builder`;
    const ogImage = `${SITE_ORIGIN}/og-default.png`;
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: t("meta_title") },
        { property: "og:description", content: t("meta_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("meta_title") },
        { name: "twitter:description", content: t("meta_description") },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildComposerJsonLd({
              name: t("meta_title"),
              description: t("meta_description"),
            }),
          ),
        },
      ],
    };
  },
});
