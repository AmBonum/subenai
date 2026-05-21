import { useId, useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tFor } from "@/i18n/admin";
import { cn } from "@/lib/utils";

// E47 — collapsed-by-default info panel that ships on every /admin/*
// route. Renders directly under <PageHeader>. Content is read entirely
// from the `explainers.<pageKey>.*` subtree of the admin i18n namespace
// — see src/i18n/locales/{sk,en,cs}/admin.json. The route passes only
// the pageKey; the component owns the rest of the contract.
//
// Persistence: open/closed state is stored per pageKey in localStorage
// under the `admin-explainer-<pageKey>` key, so an admin who expanded
// the panel on one page keeps it expanded across reloads, but pages
// stay independent (collapsing the dashboard panel does not also
// collapse the users panel).
//
// a11y: Radix Collapsible wires aria-expanded + aria-controls on the
// trigger. The trigger is a real <button>, so Enter / Space toggle it.
// Heading inside the trigger is <h2> — one level below PageHeader's
// <h1>, so screen-reader hierarchy stays intact.

interface ExplainerSection {
  heading: string;
  items: string[];
}

interface ExplainerDocLink {
  label: string;
  href: string;
}

export interface AdminPageExplainerProps {
  /**
   * Matches the nav key from AdminSidebar (dashboard | tests |
   * quick_test | share_card | questions | answer_sets | trainings |
   * users | categories | reports | support | blog | pages | navigation
   * | header | footer | dsr | dpa_requests | settings | security).
   */
  pageKey: string;
}

// E47 — declared on /cookies under the `prefs` category (E40 row). Named
// constant so the storage-allowlist linter at
// tests/security/storage-allowlist.test.ts can attribute every write to
// this owner instead of seeing a generic local-variable name.
const EXPLAINER_STORAGE_PREFIX = "admin-explainer-";

function readPersisted(pageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EXPLAINER_STORAGE_PREFIX + pageKey) === "1";
  } catch {
    return false;
  }
}

function writePersisted(pageKey: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPLAINER_STORAGE_PREFIX + pageKey, open ? "1" : "0");
  } catch {
    // Quota exceeded / disabled storage — silently degrade. The next
    // render still works; state just won't survive reload.
  }
}

// Lazy-initialised on first render so reduced-motion users never see a
// pre-effect frame with motion enabled (the previous useEffect-on-mount
// pattern had a one-frame FOMR window). SSR-safe via the window guard.
// Belt-and-suspenders: the chevron also carries `motion-reduce:transition-none`,
// so even if this returns the wrong value on first paint, the OS-level
// media query still wins via CSS.
function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function AdminPageExplainer({ pageKey }: AdminPageExplainerProps) {
  const t = tFor("explainers");
  const tObj = tFor.object("explainers");
  const bodyId = useId();

  const [open, setOpen] = useState<boolean>(() => readPersisted(pageKey));
  const [reducedMotion] = useState<boolean>(() => readReducedMotion());

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    writePersisted(pageKey, next);
  };

  const title = t(`${pageKey}.title`);
  const lead = t(`${pageKey}.lead`);
  const configureHeading = t(`${pageKey}.sections.what_you_configure.heading`);
  const timeHeading = t(`${pageKey}.sections.time_impact.heading`);
  const pitfallsHeading = t(`${pageKey}.sections.pitfalls.heading`);
  const docsHeading = t(`${pageKey}.docs.heading`);

  const sections = useMemo(() => {
    return {
      configure: tObj<ExplainerSection>(`${pageKey}.sections.what_you_configure`),
      time: tObj<ExplainerSection>(`${pageKey}.sections.time_impact`),
      pitfalls: tObj<ExplainerSection>(`${pageKey}.sections.pitfalls`),
      docs: tObj<ExplainerDocLink[]>(`${pageKey}.docs.links`) ?? [],
    };
    // pageKey is the only input that changes the section shape; the
    // resolver functions are stable references per section (cached in
    // _create-resolver.ts).
  }, [pageKey, tObj]);

  return (
    // scroll-mt-20 keeps deep-link / focus jumps from landing under the
    // admin shell's sticky 56-px header (z-20, semi-transparent).
    <div data-testid="admin-explainer-root" className="w-full scroll-mt-20">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div
          className={cn(
            "rounded-lg border border-border/60 bg-muted/60 shadow-sm",
            reducedMotion && "[&_*]:transition-none",
          )}
          data-reduced-motion={reducedMotion ? "true" : "false"}
        >
          <CollapsibleTrigger
            data-testid="admin-explainer-toggle"
            aria-controls={bodyId}
            className={cn(
              "group flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left",
              "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <h2
              data-testid="admin-explainer-title"
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
            data-testid="admin-explainer-body"
            id={bodyId}
            className="overflow-hidden data-[state=closed]:hidden"
          >
            <div className="border-t border-border/60 px-4 py-4 text-sm">
              {/* max-w-prose constrains reading width to ~65ch on wide
                  viewports; break-words lets long unbreakable tokens
                  (env var names like VITE_DPA_TEMPLATE_DRAFT_WATERMARK)
                  wrap on mobile instead of clipping inside the panel. */}
              <div className="max-w-prose space-y-4 break-words">
                <p
                  data-testid="admin-explainer-lead"
                  className="text-muted-foreground leading-relaxed"
                >
                  {lead}
                </p>

                {sections.configure?.items?.length ? (
                  <section data-testid="admin-explainer-section-configure" className="space-y-1.5">
                    <h3
                      data-testid="admin-explainer-section-configure-heading"
                      className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
                    >
                      {configureHeading}
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                      {sections.configure.items.map((item, i) => (
                        <li key={i} data-testid={`admin-explainer-configure-item-${i}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {sections.time?.items?.length ? (
                  <section data-testid="admin-explainer-section-time" className="space-y-1.5">
                    <h3
                      data-testid="admin-explainer-section-time-heading"
                      className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
                    >
                      {timeHeading}
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                      {sections.time.items.map((item, i) => (
                        <li key={i} data-testid={`admin-explainer-time-item-${i}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {sections.pitfalls?.items?.length ? (
                  <section data-testid="admin-explainer-section-pitfalls" className="space-y-1.5">
                    <h3
                      data-testid="admin-explainer-section-pitfalls-heading"
                      className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
                    >
                      {pitfallsHeading}
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                      {sections.pitfalls.items.map((item, i) => (
                        <li key={i} data-testid={`admin-explainer-pitfalls-item-${i}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {sections.docs.length ? (
                  <section className="space-y-1.5">
                    <h3
                      data-testid="admin-explainer-docs-heading"
                      className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
                    >
                      {docsHeading}
                    </h3>
                    <ul className="space-y-1.5">
                      {sections.docs.map((link, i) => (
                        <li key={`${link.href}-${i}`}>
                          <a
                            data-testid={`admin-explainer-doc-link-${i}`}
                            href={link.href}
                            // WCAG 1.4.1 (Use of Color) — links inside body
                            // content need a non-colour indicator at rest,
                            // not just on hover.
                            className="inline-flex items-center gap-1.5 text-primary underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
                          >
                            {link.label}
                            <ExternalLink aria-hidden="true" className="h-3 w-3" />
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
