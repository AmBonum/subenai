import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

// E55.3 — author archive. Indexable.
export const Route = createFileRoute("/academy/author/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Autor · Akadémia · subenai` },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/academy/author/${params.slug}` },
    ],
  }),
});
