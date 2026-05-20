// E33 Phase 1 (D5) — schema.org WebApplication JSON-LD for the
// composer builder at /test/builder.
//
// Pulled into a pure builder so the route's head() stays small and
// the schema is unit-testable without booting the i18n bundle.
// Mirrors the pattern from buildCourseJsonLd / buildTestsFaqJsonLd.
//
// Why WebApplication (not Course or HowTo): the composer is a TOOL
// that users interact with to build a test, not a course they
// consume. WebApplication is schema.org's canonical type for
// browser-based tools — surfaces in Google's tool / utility results.

import { SITE_ORIGIN } from "@/config/site";

export interface ComposerJsonLdInput {
  /** Slovak page name (e.g. tFor("composer")("meta_title")) */
  name: string;
  /** Slovak description (e.g. tFor("composer")("meta_description")) */
  description: string;
}

export function buildComposerJsonLd(input: ComposerJsonLdInput): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/test/builder`;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    description: input.description,
    url,
    inLanguage: "sk-SK",
    isAccessibleForFree: true,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Cybersecurity training",
    operatingSystem: "Web",
    browserRequirements: "Modern browser with JavaScript enabled",
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    provider: {
      "@type": "Organization",
      name: "subenai",
      url: SITE_ORIGIN,
    },
  };
}
