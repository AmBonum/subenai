import { createFileRoute, notFound } from "@tanstack/react-router";

import { lookupDoc } from "@/lib/docs/manifest";

// E47.1 / E48.1 / E54.3 — leaf for /docs/app/<slug>. The parent
// docs.app.tsx gates access (any authenticated user, including admins; no
// onboarding requirement — see note on docs.app.tsx). We verify the slug
// exists in the manifest (unknown → notFound) and pick the renderer from
// the entry's discriminant: explainer-backed slugs render real content,
// the rest still show the stub until dedicated content lands. The component
// lives in docs.app.$slug.lazy.tsx so guide pages (react-markdown + 3D
// scenes) stay out of the main bundle.

export const Route = createFileRoute("/docs/app/$slug")({
  loader: ({ params }) => {
    const entry = lookupDoc("app", params.slug);
    if (!entry) throw notFound();
    return { slug: params.slug, entry };
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
});
