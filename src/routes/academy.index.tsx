import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

// E55.3 — public Academy hub (articles + interactive lessons). Indexable.
const URL = `${SITE_ORIGIN}/academy`;
const TITLE = "Akadémia · subenai";
const DESC =
  "Interaktívne kurzy a články o podvodoch — uč sa rozpoznať ich na reálnych príkladoch.";

export const Route = createFileRoute("/academy/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
