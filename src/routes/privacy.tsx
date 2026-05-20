import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { buildPrivacyPolicyJsonLd } from "@/lib/seo/legal-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/schools-jsonld";
import { tFor } from "@/i18n/legal";

const tPrivacy = tFor("privacy");

function buildPrivacyHead() {
  const url = `${SITE_ORIGIN}/privacy`;
  const policyJsonLd = buildPrivacyPolicyJsonLd({
    name: tPrivacy("meta_title"),
    description: tPrivacy("meta_description"),
    url,
    inLanguage: "sk-SK",
    publisherName: "am.bonum s. r. o.",
    publisherUrl: SITE_ORIGIN,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Domov", url: `${SITE_ORIGIN}/` },
    { name: "Ochrana osobných údajov", url },
  ]);

  return {
    meta: [
      { title: tPrivacy("meta_title") },
      { name: "description", content: tPrivacy("meta_description") },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "language", content: "sk-SK" },
      { property: "og:title", content: tPrivacy("meta_title") },
      { property: "og:description", content: tPrivacy("meta_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:locale", content: "sk_SK" },
      { property: "og:site_name", content: "subenai" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: tPrivacy("meta_title") },
      { name: "twitter:description", content: tPrivacy("meta_description") },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(policyJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ],
  };
}

export const Route = createFileRoute("/privacy")({
  head: buildPrivacyHead,
});
