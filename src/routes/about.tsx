import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

const ABOUT_URL = `${SITE_ORIGIN}/about`;
const tAbout = tFor("marketing");

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: ABOUT_URL,
  name: tAbout("about.jsonld_name"),
  inLanguage: "sk-SK",
  description: tAbout("about.jsonld_description"),
  isPartOf: {
    "@type": "WebSite",
    name: "subenai",
    url: SITE_ORIGIN,
  },
  publisher: {
    "@type": "Organization",
    name: "am.bonum s. r. o.",
    url: SITE_ORIGIN,
  },
};

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: tAbout("about.meta_title") },
      { name: "description", content: tAbout("about.meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tAbout("about.meta_title") },
      { property: "og:description", content: tAbout("about.meta_og_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: ABOUT_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: ABOUT_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(aboutJsonLd),
      },
    ],
  }),
});
