import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

interface PodporaSearch {
  cancelled?: 1;
}

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>): PodporaSearch => ({
    cancelled: search.cancelled === "1" || search.cancelled === 1 ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Podpora projektu — subenai" },
      {
        name: "description",
        content:
          "Podpor bezplatný vzdelávací projekt o digitálnej bezpečnosti — jednorazovo alebo mesačne. Faktúra na vyžiadanie.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Podpora projektu — subenai" },
      {
        property: "og:description",
        content:
          "Podpor bezplatný vzdelávací projekt o digitálnej bezpečnosti — jednorazovo alebo mesačne.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/support` },
      { property: "og:locale", content: "sk_SK" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/support` }],
  }),
});
