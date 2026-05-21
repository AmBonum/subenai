import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

export const Route = createFileRoute("/sablony/$slug")({
  head: ({ params }) => {
    const url = `${SITE_ORIGIN}/sablony/${params.slug}`;
    const title = "Test šablóna | subenai";
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Bezplatná šablóna kvízu o online bezpečnosti — pustite kolegom, žiakom alebo rodine. Slovenčina, CC BY 4.0.",
        },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});
