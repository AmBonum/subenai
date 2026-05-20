import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { tFor } from "@/i18n/blog";
import { visualForCategory } from "@/lib/blog/category-visuals";

interface CategoryOption {
  slug: string;
  name: string;
  count: number;
}

interface CategoryFilterProps {
  options: CategoryOption[];
  activeSlug: string | null; // null = "all"
  onChange: (slug: string | null) => void;
  totalCount: number;
}

// Number of category chips visible on mobile before the "ďalšie
// kategórie" expander hides the rest. Slovak category names average
// ~25 chars (e.g. "Bezpečnosť pre rodičov a seniorov"), so a 320 px
// content column fits exactly one chip per row — at 13 categories
// that's a 700 px filter strip on a 812 px viewport, which buries the
// article grid below the fold. Capping at the 3 most-popular keeps the
// filter to a single screen and the rest is one tap away.
const MOBILE_VISIBLE_CHIPS = 3;

// Client-side chip filter. The /blog index lifts URL state for the
// active filter (`?cat=...`) via TanStack search params so the choice
// is shareable / bookmarkable; this component is unaware — onChange is
// the seam.
//
// 2026-05-20: dropped the mobile horizontal-scroll layout (chips
// off-screen behind an invisible iOS scrollbar) and the v1 flat-wrap
// replacement (14 rows on a 375 px viewport). Final shape:
//   - mobile: top-3 chips + "ďalšie kategórie (N)" expander
//   - desktop (md+): every chip wraps inline; expander hidden
// The active chip is always rendered even when collapsed — otherwise
// the row would advertise "všetko" pressed while the URL filter sits
// on a hidden one.
export function CategoryFilter({ options, activeSlug, onChange, totalCount }: CategoryFilterProps) {
  const t = tFor("index");
  const [expanded, setExpanded] = useState(false);

  // options arrive already sorted by count desc. Pick the top N + the
  // currently-active chip if it would otherwise be hidden. Keep the
  // sort stable so the visible row never shuffles when the user
  // changes filter.
  const topSlice = options.slice(0, MOBILE_VISIBLE_CHIPS);
  const visibleOnMobile =
    activeSlug && !topSlice.some((o) => o.slug === activeSlug)
      ? [...topSlice, options.find((o) => o.slug === activeSlug)!]
      : topSlice;
  const visibleSlugs = new Set(visibleOnMobile.map((o) => o.slug));
  const hiddenCount = options.length - visibleSlugs.size;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="filter podľa kategórie"
      data-testid="blog-category-filter"
    >
      <FilterChip
        active={activeSlug === null}
        label="všetko"
        count={totalCount}
        onClick={() => onChange(null)}
        testid="blog-category-filter-all"
      />
      {options.map((opt) => {
        const visual = visualForCategory(opt.slug);
        const active = activeSlug === opt.slug;
        // On mobile (default-collapsed), chips outside the visible
        // slice are hidden via Tailwind's `hidden md:inline-flex` —
        // keeping them in the DOM means a screen reader still finds
        // them via heading-level navigation, and the desktop layout
        // doesn't need a second branch. When `expanded`, the mobile
        // hide is lifted by overriding `hidden` with `inline-flex`.
        const mobileVisible = visibleSlugs.has(opt.slug) || expanded;
        return (
          <FilterChip
            key={opt.slug}
            active={active}
            label={opt.name}
            count={opt.count}
            glyph={visual.glyph}
            accentHex={visual.accentHex}
            onClick={() => onChange(opt.slug)}
            testid={`blog-category-filter-${opt.slug}`}
            mobileVisible={mobileVisible}
          />
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="blog-category-filter"
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-transparent px-3.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground md:hidden md:py-1.5"
          data-testid="blog-category-filter-toggle"
        >
          <span>
            {expanded ? t("scope_filters_less") : t("scope_filters_more", { count: hiddenCount })}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  glyph?: string;
  accentHex?: string;
  testid: string;
  // Mobile visibility — collapsed-set chips render `hidden md:inline-flex`
  // so they're in DOM (a11y, no layout shift on expand) but not visible
  // on mobile until the user taps the expander. Defaults to true for
  // the "všetko" chip which is always shown.
  mobileVisible?: boolean;
}

function FilterChip({
  active,
  label,
  count,
  onClick,
  glyph,
  accentHex,
  testid,
  mobileVisible = true,
}: FilterChipProps) {
  const baseStyle =
    active && accentHex
      ? {
          backgroundColor: accentHex,
          color: "#fff",
          boxShadow: `0 4px 12px -2px ${accentHex}80`,
        }
      : undefined;
  // Vertical padding bumps mobile chip height to ~40 px (combined
  // with row gap = effective ≥44 px touch target per WCAG 2.5.5).
  // Desktop keeps the denser py-1.5 so the chip row visual rhythm
  // stays compact.
  const visibility = mobileVisible ? "inline-flex" : "hidden md:inline-flex";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={baseStyle}
      className={`${visibility} items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-xs font-medium transition-all md:py-1.5 ${
        active
          ? "border-transparent"
          : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
      data-testid={testid}
    >
      {glyph && <span aria-hidden="true">{glyph}</span>}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 text-[10px] font-semibold ${
          active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
