import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";
import { formatQuestionCount } from "@/lib/blog/slovak-plurals";

// E16.7 — homepage FAQ as a two-level collapsible.
//
// Before: every category section was always open; only individual
//   questions inside collapsed/expanded. A first-time visitor saw a
//   wall of 13 questions immediately.
// Now:    the top level (5 category groups) is itself a Radix
//   <Accordion type="multiple"> with no defaultValue — every category
//   starts collapsed. The reader sees a clean scannable list of FIVE
//   topic chips, picks one, then drills into the questions inside.
//   Multi-open mode means opening a second category does NOT collapse
//   the first (different from the single-question accordion inside
//   each section, which IS single — only one answer expanded per
//   category at a time, mirroring docs-site FAQ patterns).
//
// SEO: separate from the UI — a FAQPage JSON-LD blob is emitted from
//   the route's head() at SSR time (see routes/index.tsx) — Google
//   sees ALL questions + answers as structured data even though the
//   UI starts collapsed. Rich-result eligibility is independent of
//   UI state.
//
// Anchor IDs: every question carries id="faq-q-<category>-<id>" so a
//   help-desk link can deep-link to a specific Q. We re-use the same
//   <id> values that build the i18n keys.

type FaqItem = { id: string; question: string; answer: ReactNode };

export interface FaqSection {
  // Slug-style — feeds the anchor id + analytics.
  slug: string;
  title: string;
  items: FaqItem[];
}

interface HomeFaqSectionProps {
  sections: FaqSection[];
  // E19.5 — optional overrides so /schools (or any other page) can
  // reuse the two-level accordion without inheriting the home page's
  // copy. When undefined the home defaults apply (backward compat).
  heading?: string;
  subheading?: string;
  docsHint?: ReactNode;
  testIdPrefix?: string;
}

export function HomeFaqSection({
  sections,
  heading,
  subheading,
  docsHint,
  testIdPrefix = "home-faq",
}: HomeFaqSectionProps) {
  const t = tFor("marketing");
  const resolvedHeading = heading ?? t("home.faq_heading");
  const resolvedSubheading = subheading ?? t("home.faq_subheading");
  // `expanded` is a controlled array of slugs currently open. Empty
  // by default — Radix uses [] as "all closed".
  const [expanded, setExpanded] = useState<string[]>([]);

  // Memo so the helper doesn't recreate on every render — keeps the
  // "expand all / collapse all" button identity stable for a11y tools.
  const allSlugs = useMemo(() => sections.map((s) => s.slug), [sections]);
  const allOpen = expanded.length === sections.length;
  const toggleAll = (): void => {
    setExpanded(allOpen ? [] : allSlugs);
  };

  return (
    <section
      className="mt-20"
      aria-labelledby={`${testIdPrefix}-heading`}
      data-testid={`${testIdPrefix}-section`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={`${testIdPrefix}-heading`}
            className="text-2xl font-bold"
            data-testid={`${testIdPrefix}-heading`}
          >
            {resolvedHeading}
          </h2>
          <p
            className="mt-2 text-sm text-muted-foreground"
            data-testid={`${testIdPrefix}-subheading`}
          >
            {resolvedSubheading}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-semibold uppercase tracking-widest text-primary underline-offset-4 hover:underline"
          data-testid={`${testIdPrefix}-toggle-all`}
          aria-pressed={allOpen}
        >
          {allOpen ? t("home.faq_collapse_all") : t("home.faq_expand_all")}
        </button>
      </div>

      <Accordion
        type="multiple"
        value={expanded}
        onValueChange={(next) => setExpanded(next)}
        className="mt-6 flex flex-col gap-3"
        data-testid={`${testIdPrefix}-categories`}
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.slug}
            value={section.slug}
            className="rounded-2xl border border-border/60 bg-card/40 px-5"
            data-testid={`${testIdPrefix}-category-${section.slug}`}
          >
            <AccordionTrigger
              className="text-left text-base font-semibold hover:no-underline [&[data-state=open]>svg]:rotate-180"
              data-testid={`${testIdPrefix}-category-trigger-${section.slug}`}
            >
              <span className="flex flex-1 items-center justify-between gap-3 pr-3">
                <span>{section.title}</span>
                <span
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                  data-testid={`${testIdPrefix}-category-count-${section.slug}`}
                >
                  {formatQuestionCount(section.items.length)}
                </span>
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                aria-hidden="true"
              />
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <Accordion
                type="single"
                collapsible
                className="border-t border-border/40 pt-2"
                data-testid={`${testIdPrefix}-questions-${section.slug}`}
              >
                {section.items.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    id={`faq-q-${section.slug}-${item.id}`}
                    className="scroll-mt-24 border-b border-border/40 last:border-b-0"
                    data-testid={`${testIdPrefix}-question-${section.slug}-${item.id}`}
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {docsHint !== undefined ? (
        <div
          className="mt-6 text-xs text-muted-foreground"
          data-testid={`${testIdPrefix}-docs-hint`}
        >
          {docsHint}
        </div>
      ) : (
        <p className="mt-6 text-xs text-muted-foreground" data-testid={`${testIdPrefix}-docs-hint`}>
          Nenašiel si odpoveď?{" "}
          <Link to={ROUTES.blog} className="font-medium text-primary underline underline-offset-2">
            Otvor akadémiu
          </Link>
          {" — 80+ podrobných sprievodcov a článkov, alebo nás kontaktuj cez stránku v päte."}
        </p>
      )}
    </section>
  );
}
