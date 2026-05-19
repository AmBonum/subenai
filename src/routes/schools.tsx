import { createFileRoute } from "@tanstack/react-router";

import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { SchoolsBreadcrumb } from "@/components/schools/SchoolsBreadcrumb";
import { SchoolsHero } from "@/components/schools/SchoolsHero";
import { PersonaComparisonTable } from "@/components/schools/PersonaComparisonTable";
import { EduWorkflowSteps } from "@/components/schools/EduWorkflowSteps";
import { SchoolsGdprCard } from "@/components/schools/SchoolsGdprCard";
import { SchoolsFaqSection } from "@/components/schools/SchoolsFaqSection";
import { SchoolsFooterCta } from "@/components/schools/SchoolsFooterCta";
import { SchoolsStickyCta } from "@/components/schools/SchoolsStickyCta";
import {
  buildSchoolsFaqJsonLd,
  buildSchoolsHowToJsonLd,
  buildSchoolsOrgJsonLd,
} from "@/lib/seo/schools-jsonld";
import { tFor } from "@/i18n/marketing";

// E12.5 (legacy) → E19 (senior rework).
//
// Public marketing page for the edu-mode flow. NOT auth-gated by
// design — GDPR Art. 28 disclosure must be crawlable BEFORE a school
// decision-maker signs anything, and the underlying product
// (Composer edu-mode at /test/zostav) is itself public + password-
// gated, so an /app/schools route would duplicate without value.
//
// Page is composed of small focused sections (see ./components/schools).
// Three JSON-LD blocks emitted from head() — EducationalOrganization,
// HowTo (4-step Composer flow), FAQPage (the 6-Q block at the bottom).

const tHead = tFor("marketing");

function buildSchoolsHead() {
  const url = `${SITE_ORIGIN}/schools`;
  const ogImage = `${SITE_ORIGIN}/og-default.png`;

  const orgJsonLd = buildSchoolsOrgJsonLd({
    name: "subenai",
    description: tHead("skoly.meta_description"),
    url: SITE_ORIGIN,
    logoUrl: `${SITE_ORIGIN}/logo.svg`,
    contactEmail: CONTACT_EMAIL,
  });

  const howToJsonLd = buildSchoolsHowToJsonLd(
    tHead("skoly.workflow_heading"),
    tHead("skoly.workflow_subheading"),
    [
      { name: tHead("skoly.step1_heading"), text: tHead("skoly.step1_outcome") },
      { name: tHead("skoly.step2_heading"), text: tHead("skoly.step2_outcome") },
      { name: tHead("skoly.step3_heading"), text: tHead("skoly.step3_outcome") },
      { name: tHead("skoly.step4_heading"), text: tHead("skoly.step4_outcome") },
    ],
  );

  const faqJsonLd = buildSchoolsFaqJsonLd([
    { question: tHead("skoly.faq_pwd_q"), answer: tHead("skoly.faq_pwd_a") },
    { question: tHead("skoly.faq_retention_q"), answer: tHead("skoly.faq_retention_a") },
    { question: tHead("skoly.faq_delete_q"), answer: tHead("skoly.faq_delete_a") },
    { question: tHead("skoly.faq_max_q"), answer: tHead("skoly.faq_max_a") },
    { question: tHead("skoly.faq_retake_q"), answer: tHead("skoly.faq_retake_a") },
    { question: tHead("skoly.faq_mobile_q"), answer: tHead("skoly.faq_mobile_a") },
  ]);

  return {
    meta: [
      { title: tHead("skoly.meta_title") },
      { name: "description", content: tHead("skoly.meta_description") },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "language", content: "sk-SK" },
      { property: "og:title", content: tHead("skoly.meta_title") },
      { property: "og:description", content: tHead("skoly.meta_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: ogImage },
      { property: "og:image:alt", content: tHead("skoly.meta_og_image_alt") },
      { property: "og:locale", content: "sk_SK" },
      { property: "og:site_name", content: "subenai" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: tHead("skoly.meta_title") },
      { name: "twitter:description", content: tHead("skoly.meta_description") },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(orgJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(howToJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd) },
    ],
  };
}

export const Route = createFileRoute("/schools")({
  head: buildSchoolsHead,
  component: SchoolsPage,
});

function SchoolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main
        className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12"
        data-testid="schools-main"
      >
        <SchoolsBreadcrumb />
        <SchoolsHero />
        <PersonaComparisonTable />
        <EduWorkflowSteps />
        <SchoolsGdprCard />
        <SchoolsFaqSection />
        <SchoolsFooterCta />
      </main>
      <SchoolsStickyCta />
    </div>
  );
}
