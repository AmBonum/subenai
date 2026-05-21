import { createFileRoute, notFound } from "@tanstack/react-router";

import { DocsStubPage } from "@/components/docs/DocsStubPage";
import { lookupDoc } from "@/lib/docs/manifest";

// E47.1 / E48.1 — leaf for /docs/app/<slug>. The parent docs.app.tsx
// gates access (any authenticated user, including admins; no
// onboarding requirement — see note on docs.app.tsx). Here we only
// verify the slug exists in the manifest; unknown slug → notFound().

export const Route = createFileRoute("/docs/app/$slug")({
  loader: ({ params }) => {
    const entry = lookupDoc("app", params.slug);
    if (!entry) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Dokumentácia · app/${loaderData.slug} · SubenAI`
          : "Dokumentácia · SubenAI",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AppDocPage,
});

function AppDocPage() {
  const { slug } = Route.useLoaderData();
  return <DocsStubPage area="app" slug={slug} />;
}
