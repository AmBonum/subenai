import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TESTS_FAQ_KEYS } from "@/lib/seo/tests-faq-schema";
import { tFor } from "@/i18n/quiz";

// E25 Phase 1 — flat FAQ accordion for /tests.
//
// 5 hand-picked questions covering the highest-friction first-time-
// visitor concerns. Two-level grouping (HomeFaqSection pattern) is
// overkill for 5 flat items — single-level Radix Accordion in
// `type="single" collapsible` mode keeps the focus tight: one answer
// open at a time, all collapsed by default.
//
// SEO: a parallel JSON-LD FAQPage blob is emitted by the route's
// head() at SSR time. Google rich-result eligibility is independent
// of UI state — every Q+A renders in <head> even when collapsed.

export function TestsFaqSection() {
  const t = tFor("testy");
  return (
    <section className="mt-16" data-testid="tests-faq-section" aria-labelledby="tests-faq-heading">
      <h2
        id="tests-faq-heading"
        data-testid="tests-faq-heading"
        className="mb-6 text-2xl font-bold"
      >
        {t("faq_heading")}
      </h2>
      <Accordion type="single" collapsible className="flex flex-col gap-3">
        {TESTS_FAQ_KEYS.map((key) => (
          <AccordionItem
            key={key}
            value={key}
            className="rounded-xl border border-border/60 bg-card/40 px-5"
            data-testid={`tests-faq-item-${key}`}
          >
            <AccordionTrigger
              className="text-left text-base font-semibold hover:no-underline"
              data-testid={`tests-faq-trigger-${key}`}
            >
              {t(`faq_${key}`)}
            </AccordionTrigger>
            <AccordionContent
              className="text-sm leading-relaxed text-muted-foreground"
              data-testid={`tests-faq-answer-${key}`}
            >
              {t(`faq_a${key.slice(1)}`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
