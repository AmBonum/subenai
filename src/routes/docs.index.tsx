import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

// E54.4 — public documentation hub. Indexable (unlike /docs/app and
// /docs/admin, which stay noindex). Component lives in docs.index.lazy.tsx.
const DOCS_URL = `${SITE_ORIGIN}/docs`;
const TITLE = "Dokumentácia · subenai";
const DESC = "Kde čo nájdeš a ako subenai funguje — testy, kurzy, účet a ďalšie.";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: DOCS_URL },
      { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
