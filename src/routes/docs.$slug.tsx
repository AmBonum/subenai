import { createFileRoute, notFound } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { DocsArticlePage } from "@/components/docs/DocsArticlePage";
import { getPublicDoc } from "@/content/docs";

// E54.4 — public /docs/<slug>. Static segments /docs/app and /docs/admin
// win over this dynamic route, so it only ever serves public slugs.
// Indexable; unknown slug → notFound().

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
  component: DocArticleRoute,
});

function DocArticleRoute() {
  const doc = Route.useLoaderData();
  return <DocsArticlePage doc={doc} />;
}
