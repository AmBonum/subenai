import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import { DocsArticlePage } from "@/components/docs/DocsArticlePage";
import { DocsExplainerPage } from "@/components/docs/DocsExplainerPage";
import { DocsStubPage } from "@/components/docs/DocsStubPage";
import { getPublicDoc } from "@/content/docs";

export const Route = createLazyFileRoute("/docs/app/$slug")({
  component: AppDocPage,
});

const routeApi = getRouteApi("/docs/app/$slug");

function AppDocPage() {
  const { slug, entry } = routeApi.useLoaderData();
  if (entry.kind === "explainer") {
    return <DocsExplainerPage explainerKey={entry.explainerKey} />;
  }
  if (entry.kind === "guide") {
    const doc = getPublicDoc(entry.docSlug);
    if (doc) return <DocsArticlePage doc={doc} />;
  }
  return <DocsStubPage area="app" slug={slug} />;
}
