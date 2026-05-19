import { useMemo } from "react";

import { HomeFaqSection, type FaqSection } from "@/components/home/HomeFaqSection";
import { tFor } from "@/i18n/marketing";

// E19.5 — collapsible FAQ adapter for /schools.
//
// Reuses the home FAQ accordion (Radix two-level, multi-open outer,
// single-open inner). Two groups so the wall of 6 long answers
// becomes a scannable list of two topics:
//   - "Heslo a prístup" — auth-oriented (password loss, retake)
//   - "Dáta a GDPR" — data-oriented (retention, delete, max, mobile)
//
// Existing i18n keys preserved verbatim; this is purely a
// presentation change. The full Q+A text remains in the DOM (Radix
// AccordionContent), so the SEO/SR experience matches the previous
// <dl>.

export function SchoolsFaqSection() {
  const t = tFor("marketing");

  const sections = useMemo<FaqSection[]>(
    () => [
      {
        slug: "pristup",
        title: t("skoly.faq_section_pristup"),
        items: [
          {
            id: "pwd",
            question: t("skoly.faq_pwd_q"),
            answer: t("skoly.faq_pwd_a"),
          },
          {
            id: "retake",
            question: t("skoly.faq_retake_q"),
            answer: t("skoly.faq_retake_a"),
          },
        ],
      },
      {
        slug: "data",
        title: t("skoly.faq_section_data"),
        items: [
          {
            id: "retention",
            question: t("skoly.faq_retention_q"),
            answer: t("skoly.faq_retention_a"),
          },
          {
            id: "delete",
            question: t("skoly.faq_delete_q"),
            answer: t("skoly.faq_delete_a"),
          },
          {
            id: "max",
            question: t("skoly.faq_max_q"),
            answer: t("skoly.faq_max_a"),
          },
          {
            id: "mobile",
            question: t("skoly.faq_mobile_q"),
            answer: t("skoly.faq_mobile_a"),
          },
        ],
      },
    ],
    [t],
  );

  return (
    <div data-testid="schools-faq">
      <HomeFaqSection
        sections={sections}
        heading={t("skoly.faq_heading")}
        subheading={t("skoly.faq_section_pristup") + " · " + t("skoly.faq_section_data")}
        testIdPrefix="schools-faq"
        docsHint={null}
      />
    </div>
  );
}
