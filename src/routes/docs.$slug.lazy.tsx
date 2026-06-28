import { createLazyFileRoute, useParams } from "@tanstack/react-router";

import { DocsArticlePage } from "@/components/docs/DocsArticlePage";
import { getPublicDoc } from "@/content/docs";

// E54.4 — lazy component for /docs/$slug. Split from the route definition so
// the Markdown renderer (react-markdown) ships in its own chunk. getPublicDoc
// is synchronous in-memory, so re-deriving the doc here is free; the route
// loader already throws notFound() for unknown slugs.

export const Route = createLazyFileRoute("/docs/$slug")({
  component: DocArticleRoute,
});

function DocArticleRoute() {
  const { slug } = useParams({ from: "/docs/$slug" });
  const doc = getPublicDoc(slug);
  if (!doc) return null;
  return <DocsArticlePage doc={doc} />;
}
