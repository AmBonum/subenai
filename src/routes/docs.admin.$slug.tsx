import { createFileRoute, notFound } from "@tanstack/react-router";

import { DocsStubPage } from "@/components/docs/DocsStubPage";
import { lookupDoc } from "@/lib/docs/manifest";

// E47.1 / E48.1 — leaf for /docs/admin/<slug>. The parent
// docs.admin.tsx gates access (admin role + AAL2). Here we only need
// to verify the slug exists in the manifest; an unknown slug throws
// notFound() so the root notFoundComponent renders rather than a
// silent empty page.

export const Route = createFileRoute("/docs/admin/$slug")({
  loader: ({ params }) => {
    const entry = lookupDoc("admin", params.slug);
    if (!entry) throw notFound();
    return { slug: params.slug };
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
  const { slug } = Route.useLoaderData();
  return <DocsStubPage area="admin" slug={slug} />;
}
