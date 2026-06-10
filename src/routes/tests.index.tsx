import { createFileRoute } from "@tanstack/react-router";
import type { TestPack } from "@/content/test-packs";
import { fetchPlatformPacks } from "@/lib/platform/pack-queries";
import { buildTestsFaqJsonLd } from "@/lib/seo/tests-faq-schema";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";

// E25 Phase 1 — /tests catalog senior redesign. The component +
// its heavy imports live in tests.index.lazy.tsx so they stay out of
// the entry chunk; this eager file keeps only the route definition,
// the loader, and head().
//
// SEO: head() emits TWO JSON-LD blobs — the ItemList for the pack
// catalog AND a FAQPage for the FAQ Q&As. The app is CSR, so they
// apply after hydration: JS-executing crawlers (Googlebot) see them,
// plain HTML fetchers don't.

export const Route = createFileRoute("/tests/")({
  // E37 Phase F — catalog list comes from get_platform_packs() RPC via
  // the route loader (client-side; the app is CSR). The loader runs
  // before head() and component(), so both see the same data via
  // Route.useLoaderData().
  loader: () => fetchPlatformPacks(),
  head: ({ loaderData }) => {
    const t = tFor("testy");
    const url = `${SITE_ORIGIN}/tests`;
    const packs = (loaderData ?? []) as TestPack[];
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: t("meta_title") },
        { property: "og:description", content: t("og_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${SITE_ORIGIN}/og-default.png` },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("list_name"),
            itemListElement: packs.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_ORIGIN}/tests/${p.slug}`,
              name: p.title,
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildTestsFaqJsonLd(
              (key) => t(`faq_${key}`),
              (key) => t(`faq_a${key.slice(1)}`),
            ),
          ),
        },
      ],
    };
  },
});
