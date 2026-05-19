import { useState } from "react";
import { ChevronDown, List } from "lucide-react";

// E21.2 — shared "On this page" TOC for long-prose documentation
// surfaces (/privacy, /cookies, soon /about).
//
// Desktop (lg+): sticky right-side column, always visible.
// Mobile (<lg): collapsed disclosure at the top of the doc body.
//
// Anchors must be `id` attributes on the section headings or section
// wrappers in the consuming page. Each `id` must include
// `scroll-mt-24` (or page-level equivalent) so deep-link landings
// don't slide under the site header.
//
// Item structure is intentionally minimal — the consumer maps each
// page's section i18n keys to the {id, label} shape.

export interface DocTocItem {
  id: string;
  label: string;
}

interface Props {
  items: DocTocItem[];
  testIdPrefix: string;
  // Optional override of the "On this page" heading. Default Slovak
  // is "Obsah" matching the rest of the site's UI tone.
  heading?: string;
}

export function DocTocSidebar({ items, testIdPrefix, heading = "Obsah" }: Props) {
  const [openMobile, setOpenMobile] = useState(false);

  return (
    <>
      {/* Desktop sticky sidebar */}
      <nav
        aria-label={heading}
        className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
        data-testid={`${testIdPrefix}-toc-desktop`}
      >
        <p
          className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground"
          data-testid={`${testIdPrefix}-toc-heading`}
        >
          {heading}
        </p>
        <ol className="space-y-1.5 border-l border-border/60 pl-3" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground"
                data-testid={`${testIdPrefix}-toc-item-${item.id}`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile collapsible disclosure */}
      <details
        open={openMobile}
        onToggle={(e) => setOpenMobile((e.target as HTMLDetailsElement).open)}
        className="mb-6 rounded-2xl border border-border/60 bg-card/40 lg:hidden"
        data-testid={`${testIdPrefix}-toc-mobile`}
      >
        <summary
          className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"
          data-testid={`${testIdPrefix}-toc-mobile-trigger`}
        >
          <span className="inline-flex items-center gap-2">
            <List className="size-4" aria-hidden="true" />
            {heading}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {items.length}
            </span>
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${openMobile ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </summary>
        <ol
          className="space-y-1.5 border-t border-border/60 px-4 py-3"
          role="list"
          data-testid={`${testIdPrefix}-toc-mobile-list`}
        >
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setOpenMobile(false)}
                data-testid={`${testIdPrefix}-toc-mobile-item-${item.id}`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
