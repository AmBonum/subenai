import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// E26 — shared senior-level FAQ accordion.
//
// Both /tests and /courses FAQs (and any future flat-list FAQ
// surface) consume this component. The host page provides:
//   - heading + optional eyebrow + optional subheading
//   - an ordered list of Q-keys (e.g. ["q1", "q2", ...])
//   - resolver functions for the question text (key → string) and
//     answer body (key → string | ReactNode — ReactNode unlocks
//     inline internal links for future enhancements)
//   - optional iconForKey() mapping (Lucide icon per Q for visual
//     variety + scan-ability)
//   - testIdPrefix + anchorPrefix (so the same component renders
//     stable selectors and stable deep-link anchors per host)
//   - optional footer rescue CTAs ("Nenašiel si odpoveď?")
//   - optional expand-all / collapse-all controls
//
// Senior-level features baked in (none of which the previous flat
// TestsFaqSection / CoursesFaqSection had):
//   - Per-Q anchor IDs (deep-link from help desk: /tests#faq-tests-q-q1)
//   - Expand-all / collapse-all toggle (controlled multi-mode)
//   - "Popular" badge on the first Q (highest-friction signal)
//   - Lucide icon per Q (scan-ability — eye finds the right Q faster)
//   - Subtle expanded-state gradient (visual cue beyond chevron)
//   - Rescue CTA footer (anti-bounce: "didn't find it? open the blog
//     / contact us")

export interface FaqAccordionItemKey {
  key: string;
  icon?: LucideIcon;
}

export interface FaqAccordionFooterCta {
  label: string;
  href: string;
  testid?: string;
}

export interface FaqAccordionProps {
  /** Ordered list of Q-keys + optional Lucide icon per Q. */
  items: FaqAccordionItemKey[];
  /** Resolve a key to its question text. */
  getQ: (key: string) => string;
  /** Resolve a key to its answer body. ReactNode lets hosts embed
   *  inline links inside answers; plain strings work too. */
  getA: (key: string) => string | ReactNode;
  /** test-id slug — e.g. "tests-faq" produces
   *  data-testid="tests-faq-section". */
  testIdPrefix: string;
  /** DOM-anchor slug — e.g. "faq-tests" produces
   *  id="faq-tests-q-q1" on each item.  Different from testIdPrefix
   *  to allow visually-stable anchors that don't change with test
   *  refactors. */
  anchorPrefix: string;
  /** Required section heading. Renders as h2. */
  heading: string;
  /** Optional uppercase eyebrow above the heading (e.g. "PRED TESTOM"). */
  eyebrow?: string;
  /** Optional subheading rendered below the heading. */
  subheading?: string;
  /** Optional "Popular" badge label rendered on the first Q. Pass
   *  undefined to omit. */
  popularBadge?: string;
  /** Optional expand-all / collapse-all controls. When undefined,
   *  no toggle renders. */
  expandAllLabel?: string;
  collapseAllLabel?: string;
  /** Optional "Couldn't find an answer?" rescue footer. */
  footerLabel?: string;
  footerCtas?: FaqAccordionFooterCta[];
}

export function FaqAccordion({
  items,
  getQ,
  getA,
  testIdPrefix,
  anchorPrefix,
  heading,
  eyebrow,
  subheading,
  popularBadge,
  expandAllLabel,
  collapseAllLabel,
  footerLabel,
  footerCtas,
}: FaqAccordionProps) {
  // Controlled multi-open mode so expand-all / collapse-all can flip
  // the entire list. `value` is an array of currently-expanded keys.
  const [expanded, setExpanded] = useState<string[]>([]);
  const allKeys = useMemo(() => items.map((i) => i.key), [items]);
  const allOpen = expanded.length === items.length && items.length > 0;
  const showToggle = Boolean(expandAllLabel && collapseAllLabel);
  const toggleAll = () => setExpanded(allOpen ? [] : allKeys);

  return (
    <section
      className="mt-16"
      data-testid={`${testIdPrefix}-section`}
      aria-labelledby={`${testIdPrefix}-heading`}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p
              className="mb-2 text-xs font-bold uppercase tracking-widest text-primary"
              data-testid={`${testIdPrefix}-eyebrow`}
            >
              {eyebrow}
            </p>
          )}
          <h2
            id={`${testIdPrefix}-heading`}
            className="text-2xl font-bold"
            data-testid={`${testIdPrefix}-heading`}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="mt-2 max-w-2xl text-sm text-muted-foreground"
              data-testid={`${testIdPrefix}-subheading`}
            >
              {subheading}
            </p>
          )}
        </div>
        {showToggle && (
          <button
            type="button"
            onClick={toggleAll}
            aria-pressed={allOpen}
            data-testid={`${testIdPrefix}-toggle-all`}
            className="text-xs font-semibold uppercase tracking-widest text-primary underline-offset-4 hover:underline"
          >
            {allOpen ? collapseAllLabel : expandAllLabel}
          </button>
        )}
      </div>

      <Accordion
        type="multiple"
        value={expanded}
        onValueChange={(next) => setExpanded(next)}
        className="flex flex-col gap-3"
        data-testid={`${testIdPrefix}-list`}
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isPopular = idx === 0 && Boolean(popularBadge);
          return (
            <AccordionItem
              key={item.key}
              value={item.key}
              id={`${anchorPrefix}-q-${item.key}`}
              className="scroll-mt-24 rounded-xl border border-border/60 bg-card/40 px-5 transition data-[state=open]:border-primary/40 data-[state=open]:bg-gradient-to-br data-[state=open]:from-primary/5 data-[state=open]:to-accent/5"
              data-testid={`${testIdPrefix}-item-${item.key}`}
            >
              <AccordionTrigger
                className="group/trigger gap-3 text-left text-base font-semibold hover:no-underline [&[data-state=open]>svg]:rotate-180 [&>svg]:hidden"
                data-testid={`${testIdPrefix}-trigger-${item.key}`}
              >
                <span className="flex flex-1 items-start gap-3">
                  {Icon && (
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                      data-testid={`${testIdPrefix}-icon-${item.key}`}
                    >
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </span>
                  )}
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{getQ(item.key)}</span>
                      {isPopular && (
                        <span
                          data-testid={`${testIdPrefix}-popular-badge`}
                          className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"
                        >
                          {popularBadge}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/trigger:text-primary"
                  aria-hidden="true"
                />
              </AccordionTrigger>
              <AccordionContent
                className="pl-10 text-sm leading-relaxed text-muted-foreground"
                data-testid={`${testIdPrefix}-answer-${item.key}`}
              >
                {getA(item.key)}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {(footerLabel || (footerCtas && footerCtas.length > 0)) && (
        <div
          className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
          data-testid={`${testIdPrefix}-footer`}
        >
          {footerLabel && <span>{footerLabel}</span>}
          {footerCtas?.map((cta, i) => (
            <span key={cta.href}>
              {i > 0 && <span className="mx-1 text-muted-foreground/60">·</span>}
              <a
                href={cta.href}
                data-testid={cta.testid ?? `${testIdPrefix}-footer-cta-${i}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                {cta.label}
              </a>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
