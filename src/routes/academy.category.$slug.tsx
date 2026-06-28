import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

// E55.3 — category archive. Indexable. The category name + filtered entries
// are resolved client-side in the lazy component.
export const Route = createFileRoute("/academy/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Kategória · Akadémia · subenai` },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/academy/category/${params.slug}` },
    ],
  }),
});
