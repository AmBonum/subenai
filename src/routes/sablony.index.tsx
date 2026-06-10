import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

const TITLE = "Test šablóny: bezplatné kvízy o online podvodoch | subenai";
const DESCRIPTION =
  "Verejná knižnica šablón kvízov o phishingu, fake e-shopoch, AI deepfake a ďalších online podvodoch. V slovenčine, zadarmo, pod CC BY 4.0.";

export const Route = createFileRoute("/sablony/")({
  head: () => {
    const url = `${SITE_ORIGIN}/sablony`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${SITE_ORIGIN}/og-default.png` },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});
