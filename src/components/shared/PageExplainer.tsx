import { useId } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { TFor, TForObject } from "@/i18n/_create-resolver";
import { cn } from "@/lib/utils";

// E47 / E48 — shared, namespace-agnostic collapsible info panel.
// Both AdminPageExplainer (admin shell) and AppPageExplainer (user
// shell) delegate their JSX, a11y, and Radix wiring to this component
// while owning their own i18n resolver + localStorage key prefix.
//
// All data-testid values are derived from `testIdPrefix` so the
// admin and app variants are addressable independently in tests
// (`admin-explainer-*` vs `app-explainer-*`).
//
// Why controlled state? The wrapper owns `open` + `onOpenChange` so
// the localStorage `setItem(...)` call lives inside the wrapper file
// next to the named prefix constant — that lets the storage-allowlist
// scanner at tests/security/storage-allowlist.test.ts attribute every
// write to a clearly-named owner instead of seeing a generic local
// variable.

// Type aliases (not interfaces) so they satisfy the `JsonNode` indexed
// constraint of `TForObject` structurally.
type ExplainerSection = {
  heading: string;
  items: string[];
};

type ExplainerDocLink = {
  label: string;
  href: string;
};

export interface PageExplainerProps {
  pageKey: string;
  /** Section-scoped string resolver (output of `tFor("explainers")`). */
  t: TFor;
  /** Section-scoped raw-node resolver (output of `tFor.object("explainers")`). */
  tObj: TForObject;
  /** Test-id prefix: `admin-explainer` or `app-explainer`. */
  testIdPrefix: string;
  /** Controlled open state — wrapper owns persistence. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when the OS reports `prefers-reduced-motion: reduce`. */
  reducedMotion?: boolean;
  /**
   * Scroll offset (in tailwind `mt-N` units) for deep-link / focus jumps,
   * so the panel doesn't land under the shell's sticky header. Default 0.
   * Admin wrapper passes 20 (clears the 56-px sticky admin header);
   * app wrapper passes 0 (app shell has no sticky header).
   */
  scrollMarginTop?: 0 | 20;
}

export function PageExplainer({
  pageKey,
  t,
  tObj,
  testIdPrefix,
  open,
  onOpenChange,
  reducedMotion = false,
  scrollMarginTop = 0,
}: PageExplainerProps) {
  const bodyId = useId();
  const titleId = useId();

  const title = t(`${pageKey}.title`);
  const lead = t(`${pageKey}.lead`);
  const configureHeading = t(`${pageKey}.sections.what_you_configure.heading`);
  const timeHeading = t(`${pageKey}.sections.time_impact.heading`);
  const pitfallsHeading = t(`${pageKey}.sections.pitfalls.heading`);
  const docsHeading = t(`${pageKey}.docs.heading`);

  const configure = tObj<ExplainerSection>(`${pageKey}.sections.what_you_configure`);
  const time = tObj<ExplainerSection>(`${pageKey}.sections.time_impact`);
  const pitfalls = tObj<ExplainerSection>(`${pageKey}.sections.pitfalls`);
  const docs = tObj<ExplainerDocLink[]>(`${pageKey}.docs.links`) ?? [];

  return (
    <div
      data-testid={`${testIdPrefix}-root`}
      className={cn("w-full", scrollMarginTop === 20 && "scroll-mt-20")}
    >
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div
          className={cn(
            "rounded-lg border border-border/60 bg-muted/60 shadow-sm",
            reducedMotion && "[&_*]:transition-none",
          )}
          data-reduced-motion={reducedMotion ? "true" : "false"}
        >
          {/* h2 lives OUTSIDE the trigger (was nested previously — invalid
              HTML + broke SR heading rotor navigation). The trigger is a
              real <button> labelled by the heading via aria-labelledby. */}
          <CollapsibleTrigger
            data-testid={`${testIdPrefix}-toggle`}
            aria-controls={bodyId}
            aria-labelledby={titleId}
            className={cn(
              "group flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left",
              "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <h2
              id={titleId}
              data-testid={`${testIdPrefix}-title`}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base"
            >
              {title}
            </h2>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent
            data-testid={`${testIdPrefix}-body`}
            id={bodyId}
            className="overflow-hidden data-[state=closed]:hidden"
          >
            <div className="border-t border-border/60 px-4 py-4 text-sm">
              <div className="max-w-prose space-y-4 break-words">
                <p
                  data-testid={`${testIdPrefix}-lead`}
                  className="text-muted-foreground leading-relaxed"
                >
                  {lead}
                </p>

                <ExplainerListSection
                  name="configure"
                  heading={configureHeading}
                  items={configure?.items}
                  testIdPrefix={testIdPrefix}
                />
                <ExplainerListSection
                  name="time"
                  heading={timeHeading}
                  items={time?.items}
                  testIdPrefix={testIdPrefix}
                />
                <ExplainerListSection
                  name="pitfalls"
                  heading={pitfallsHeading}
                  items={pitfalls?.items}
                  testIdPrefix={testIdPrefix}
                />

                {docs.length ? (
                  <section className="space-y-1.5">
                    <h3
                      data-testid={`${testIdPrefix}-docs-heading`}
                      className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
                    >
                      {docsHeading}
                    </h3>
                    <ul className="space-y-1.5">
                      {docs.map((link, i) => (
                        <li key={`${link.href}-${i}`}>
                          <a
                            data-testid={`${testIdPrefix}-doc-link-${i}`}
                            href={link.href}
                            // WCAG 1.4.1 (Use of Color) — links inside body
                            // content need a non-colour indicator at rest,
                            // not just on hover.
                            className="inline-flex items-center gap-1.5 text-primary underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
                          >
                            {link.label}
                            {/* Neutral indicator icon — links are same-origin
                                (/docs/admin/* and /docs/app/*) so the previous
                                ExternalLink glyph mis-signalled "opens in new
                                tab". ArrowUpRight reads as a "go to" hint
                                without the external-site implication. */}
                            <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

/**
 * Internal — renders one bullet-list explainer section (configure / time /
 * pitfalls). Hides itself if `items` is missing or empty, so a future locale
 * that drops a section just collapses gracefully.
 */
function ExplainerListSection({
  name,
  heading,
  items,
  testIdPrefix,
}: {
  name: "configure" | "time" | "pitfalls";
  heading: string;
  items: string[] | undefined;
  testIdPrefix: string;
}) {
  if (!items?.length) return null;
  return (
    <section data-testid={`${testIdPrefix}-section-${name}`} className="space-y-1.5">
      <h3
        data-testid={`${testIdPrefix}-section-${name}-heading`}
        className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
      >
        {heading}
      </h3>
      <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} data-testid={`${testIdPrefix}-${name}-item-${i}`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
