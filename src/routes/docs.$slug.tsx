import { createFileRoute, notFound } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { getPublicDoc } from "@/content/docs";

// E54.4 — public /docs/<slug>. Static segments /docs/app and /docs/admin
// win over this dynamic route, so it only ever serves public slugs.
// Indexable; unknown slug → notFound(). The component (which pulls in the
// react-markdown renderer) lives in docs.$slug.lazy.tsx so it stays out of
// the main bundle (perf-budget).

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    const doc = getPublicDoc(params.slug);
    if (!doc) throw notFound();
    return doc;
  },
  head: ({ loaderData }) => {
    const url = loaderData ? `${SITE_ORIGIN}/docs/${loaderData.slug}` : `${SITE_ORIGIN}/docs`;
    const title = loaderData
      ? `${loaderData.title} · Dokumentácia · subenai`
      : "Dokumentácia · subenai";
    const desc = loaderData?.description ?? "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});
