import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { COURSES_FAQ_KEYS } from "@/lib/seo/courses-faq-schema";
import { tFor } from "@/i18n/quiz";

// E25 Phase 2 — flat FAQ accordion for /courses.
//
// Same single-level pattern as TestsFaqSection. 5 hand-picked
// questions covering the highest-friction first-time-visitor
// concerns specific to free courses: payment, time, certificates,
// audience, sharing.
//
// SEO: parallel JSON-LD FAQPage emitted from the route head().

export function CoursesFaqSection() {
  const t = tFor("skolenia");
  return (
    <section
      className="mt-16"
      data-testid="courses-faq-section"
      aria-labelledby="courses-faq-heading"
    >
      <h2
        id="courses-faq-heading"
        data-testid="courses-faq-heading"
        className="mb-6 text-2xl font-bold"
      >
        {t("faq_heading")}
      </h2>
      <Accordion type="single" collapsible className="flex flex-col gap-3">
        {COURSES_FAQ_KEYS.map((key) => (
          <AccordionItem
            key={key}
            value={key}
            className="rounded-xl border border-border/60 bg-card/40 px-5"
            data-testid={`courses-faq-item-${key}`}
          >
            <AccordionTrigger
              className="text-left text-base font-semibold hover:no-underline"
              data-testid={`courses-faq-trigger-${key}`}
            >
              {t(`faq_${key}`)}
            </AccordionTrigger>
            <AccordionContent
              className="text-sm leading-relaxed text-muted-foreground"
              data-testid={`courses-faq-answer-${key}`}
            >
              {t(`faq_a${key.slice(1)}`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
