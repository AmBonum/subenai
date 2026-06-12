import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

// M3 — /sponsors is the single sponsors surface: the full filterable
// public list (the former /sponsors/all grid) under the index page's
// heading and empty/error states. /sponsors/all 301s here (see
// public/_redirects + sponsors_.all.tsx for the client-side redirect).
// The component ships in sponsors.lazy.tsx; the view implementation in
// -sponsors-view.tsx.

// Backwards-compat re-exports so existing imports from "@/routes/sponsors"
// (unit tests) keep working after the merge.
export { SponzoriView, type PublicSponsor } from "./-sponsors-view";

const tSponzori = tFor("sponzori");
const SPONZORI_URL = `${SITE_ORIGIN}/sponsors`;

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: tSponzori("head_title") },
      { name: "description", content: tSponzori("head_description_index") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tSponzori("head_title") },
      { property: "og:url", content: SPONZORI_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SPONZORI_URL }],
  }),
});
