import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { buildCookiesPolicyJsonLd } from "@/lib/seo/legal-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/schools-jsonld";
import { tFor } from "@/i18n/legal";

// E33 perf — Route definition (head metadata only) stays in this eager
// .tsx file; the page component lives in `cookies.lazy.tsx` so the
// 354-line legal copy + DocTocSidebar tree only loads when a visitor
// actually navigates to /cookies. Previously bundled into the entry
// chunk for every page view.

const tCookies = tFor("cookies");

function buildCookiesHead() {
  const url = `${SITE_ORIGIN}/cookies`;
  const policyJsonLd = buildCookiesPolicyJsonLd({
    name: tCookies("meta_title"),
    description: tCookies("meta_description"),
    url,
    inLanguage: "sk-SK",
    privacyPolicyUrl: `${SITE_ORIGIN}/privacy`,
    publisherName: "am.bonum s. r. o.",
    publisherUrl: SITE_ORIGIN,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Domov", url: `${SITE_ORIGIN}/` },
    { name: "Cookies", url },
  ]);
  return {
    meta: [
      { title: tCookies("meta_title") },
      { name: "description", content: tCookies("meta_description") },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "language", content: "sk-SK" },
      { property: "og:title", content: tCookies("meta_title") },
      { property: "og:description", content: tCookies("meta_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:locale", content: "sk_SK" },
      { property: "og:site_name", content: "subenai" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: tCookies("meta_title") },
      { name: "twitter:description", content: tCookies("meta_description") },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(policyJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ],
  };
}

export const Route = createFileRoute("/cookies")({
  head: buildCookiesHead,
});
