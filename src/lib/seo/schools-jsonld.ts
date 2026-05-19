// E19.1 — schema.org JSON-LD builders for the /schools landing.
//
// Three blocks emitted from the route's head():
//   1. EducationalOrganization — establishes subenai as an authoritative
//      ed-tech entity; surfaces in Knowledge Graph / Google Business
//      adjacencies for school searches.
//   2. HowTo — Google can render the 4-step Composer edu-mode flow as
//      a step-by-step rich result. High-leverage for "ako pripraviť
//      test pre triedu" search intent.
//   3. FAQPage — same pattern as the home FAQ JSON-LD (see
//      faq-jsonld.ts) but scoped to the /schools FAQ block.
//
// All builders return plain JSON-serialisable objects; the route is
// responsible for `JSON.stringify`-ing them into a script element.

import type { FaqEntry } from "@/lib/seo/faq-jsonld";

export interface HowToStep {
  name: string;
  text: string;
}

export interface SchoolsOrgInput {
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  contactEmail: string;
}

export function buildSchoolsFaqJsonLd(entries: ReadonlyArray<FaqEntry>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}

export function buildSchoolsHowToJsonLd(
  name: string,
  description: string,
  steps: ReadonlyArray<HowToStep>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function buildSchoolsOrgJsonLd(input: SchoolsOrgInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: input.name,
    description: input.description,
    url: input.url,
    logo: input.logoUrl,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: input.contactEmail,
      availableLanguage: ["sk", "cs"],
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(
  items: ReadonlyArray<BreadcrumbItem>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
