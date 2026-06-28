import { createFileRoute, notFound } from "@tanstack/react-router";

import { DocsStubPage } from "@/components/docs/DocsStubPage";
import { DocsExplainerPage } from "@/components/docs/DocsExplainerPage";
import { lookupDoc } from "@/lib/docs/manifest";

// E47.1 / E48.1 / E54.6 — leaf for /docs/admin/<slug>. The parent
// docs.admin.tsx gates access (admin role + AAL2). Verify the slug exists
// (unknown → notFound) and render real content from the admin explainer
// i18n for explainer-backed slugs; the rest keep the stub. Admins only —
// never reaches anonymous or non-admin users.

export const Route = createFileRoute("/docs/admin/$slug")({
  loader: ({ params }) => {
    const entry = lookupDoc("admin", params.slug);
    if (!entry) throw notFound();
    return { slug: params.slug, entry };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Dokumentácia · admin/${loaderData.slug} · SubenAI`
          : "Dokumentácia · SubenAI",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDocPage,
});

function AdminDocPage() {
  const { slug, entry } = Route.useLoaderData();
  if (entry.kind === "explainer") {
    return <DocsExplainerPage explainerKey={entry.explainerKey} area="admin" />;
  }
  return <DocsStubPage area="admin" slug={slug} />;
}
