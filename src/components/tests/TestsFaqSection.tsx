import { CircleDollarSign, Clock, Users, Shield, Share2 } from "lucide-react";

import { FaqAccordion, type FaqAccordionItemKey } from "@/components/ui/faq/FaqAccordion";
import { ROUTES } from "@/config/routes";
import { TESTS_FAQ_KEYS } from "@/lib/seo/tests-faq-schema";
import { tFor } from "@/i18n/quiz";

// E26 — senior-level FAQ rewrite for /tests.
//
// Now consumes the shared FaqAccordion ui component (parallel to the
// course version). Adds:
//   - Per-Q anchor IDs (#faq-tests-q-q1) → deep-link from help desk
//   - Eyebrow ("Pred testom") + subheading framing the section
//   - "Najčastejšia" badge on Q1 (visual trust signal)
//   - Lucide icon per Q for scan-ability
//   - Expand-all / collapse-all toggle
//   - Rescue footer ("Nenašiel si odpoveď? Otvor akadémiu · Napíš nám")
//
// JSON-LD FAQPage continues to ship from the route head() — every
// Q+A is in <head> regardless of accordion UI state.

const TESTS_FAQ_ICONS = {
  q1: CircleDollarSign, // "Je test zadarmo?" — money question
  q2: Clock, // "Koľko času zaberie?" — time question
  q3: Users, // "Pre koho je test?" — audience question
  q4: Shield, // "Aké údaje zbierate?" — privacy question
  q5: Share2, // "Môžem poslať kolegom?" — sharing question
} as const;

export function TestsFaqSection() {
  const t = tFor("testy");
  const items: FaqAccordionItemKey[] = TESTS_FAQ_KEYS.map((key) => ({
    key,
    icon: TESTS_FAQ_ICONS[key],
  }));
  return (
    <FaqAccordion
      items={items}
      getQ={(key) => t(`faq_${key}`)}
      getA={(key) => t(`faq_a${key.slice(1)}`)}
      testIdPrefix="tests-faq"
      anchorPrefix="faq-tests"
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
          testid: "tests-faq-footer-cta-blog",
        },
        {
          label: t("faq_footer_cta_contact"),
          href: ROUTES.kontakt,
          testid: "tests-faq-footer-cta-contact",
        },
      ]}
    />
  );
}
