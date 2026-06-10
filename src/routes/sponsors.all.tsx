import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

// Re-export for unit tests; unused in the app graph, so it tree-shakes
// out of the entry chunk (the implementation ships in the lazy chunk).
export { AllSponsorsView } from "./-all-sponsors-view";

const tSponzori = tFor("sponzori");
const PAGE_URL = `${SITE_ORIGIN}/sponsors/all`;

export const Route = createFileRoute("/sponsors/all")({
  head: () => ({
    meta: [
      { title: tSponzori("head_title_all") },
      { name: "description", content: tSponzori("head_description_all") },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
});
