import { Gift, Clock, Award, Users, Share2 } from "lucide-react";

import { FaqAccordion, type FaqAccordionItemKey } from "@/components/ui/faq/FaqAccordion";
import { ROUTES } from "@/config/routes";
import { COURSES_FAQ_KEYS } from "@/lib/seo/courses-faq-schema";
import { tFor } from "@/i18n/quiz";

// E26 — senior-level FAQ rewrite for /courses.
//
// Mirror of TestsFaqSection. Same shared FaqAccordion ui component,
// different copy + different icon mapping per course-specific Q
// concerns:
//   q1 Gift          — "Sú školenia platené?"
//   q2 Clock         — "Ako dlho trvá?"
//   q3 Award         — "Dostanem certifikát?"
//   q4 Users         — "Pre koho sú určené?"
//   q5 Share2        — "Môžem poslať kolegom?"

const COURSES_FAQ_ICONS = {
  q1: Gift,
  q2: Clock,
  q3: Award,
  q4: Users,
  q5: Share2,
} as const;

export function CoursesFaqSection() {
  const t = tFor("skolenia");
  const items: FaqAccordionItemKey[] = COURSES_FAQ_KEYS.map((key) => ({
    key,
    icon: COURSES_FAQ_ICONS[key],
  }));
  return (
    <FaqAccordion
      items={items}
      getQ={(key) => t(`faq_${key}`)}
      getA={(key) => t(`faq_a${key.slice(1)}`)}
      testIdPrefix="courses-faq"
      anchorPrefix="faq-courses"
      heading={t("faq_heading")}
      eyebrow={t("faq_eyebrow")}
      subheading={t("faq_subheading")}
      popularBadge={t("faq_popular_badge")}
      expandAllLabel={t("faq_expand_all")}
      collapseAllLabel={t("faq_collapse_all")}
      footerLabel={t("faq_footer_label")}
      footerCtas={[
        {
          label: t("faq_footer_cta_blog"),
          href: ROUTES.blog,
          testid: "courses-faq-footer-cta-blog",
        },
        {
          label: t("faq_footer_cta_contact"),
          href: ROUTES.kontakt,
          testid: "courses-faq-footer-cta-contact",
        },
      ]}
    />
  );
}
