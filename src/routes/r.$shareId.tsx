import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";

// Re-export for unit tests; unused in the app graph, so it tree-shakes
// out of the entry chunk (the implementation ships in the lazy chunk).
export { SharePage } from "./-share-page";

export const Route = createFileRoute("/r/$shareId")({
  // E23 — share-page head() expanded for viral conversion. Specifically:
  //   - noindex: every share_id is a unique URL with personal-result
  //     content; we don't want Google indexing thousands of these and
  //     diluting domain authority.
  //   - canonical → site root: a backlink from a shared result still
  //     credits the homepage in Google's link graph.
  //   - full OG + Twitter set for the link preview. Note the app is
  //     client-rendered: head() applies after hydration, so only
  //     JS-executing scrapers see these tags — plain HTML fetchers get
  //     the static-shell defaults from index.html.
  head: ({ params }) => {
    const t = tFor("share");
    const url = `${SITE_ORIGIN}/r/${params.shareId}`;
    const ogImage = `${SITE_ORIGIN}/og-default.png`;
    return {
      meta: [
        { title: t("meta_title", { shareId: params.shareId }) },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "noindex, nofollow" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: t("og_title") },
        { property: "og:description", content: t("og_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:image:alt", content: t("og_image_alt") },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("og_title") },
        { name: "twitter:description", content: t("og_description") },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
    };
  },
});
