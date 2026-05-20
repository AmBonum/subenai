import { useRef } from "react";

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

// Client-side chip filter. The /blog index lifts URL state for the
// active filter (`?cat=...`) via TanStack search params so the choice
// is shareable / bookmarkable; this component is unaware — onChange is
// the seam. Mobile uses horizontal scroll with a right-edge fade mask
// + clicked-chip auto-centers via scrollIntoView for affordance.
export function CategoryFilter({ options, activeSlug, onChange, totalCount }: CategoryFilterProps) {
  // Ref to the scroll container so a chip click can center itself on
  // mobile. Without this, tapping the 6th chip in a 10-chip row
  // changes its visual state but leaves it at the right edge — easy to
  // miss "yes, my filter applied".
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleSelect = (slug: string | null): void => {
    onChange(slug);
    const key = slug ?? "__all__";
    const node = chipRefs.current.get(key);
    if (node && scrollerRef.current) {
      // `block: "nearest"` confines the scroll to the horizontal
      // container — iOS Safari would otherwise scroll-jack the whole
      // page if it considered the chip "out of view" vertically.
      node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const registerChip = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) chipRefs.current.set(key, node);
    else chipRefs.current.delete(key);
  };

  return (
    <div className="relative" data-testid="blog-category-filter-wrapper">
      <div
        ref={scrollerRef}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:flex-wrap md:overflow-visible md:pb-0"
        role="group"
        aria-label="filter podľa kategórie"
        data-testid="blog-category-filter"
      >
        <FilterChip
          active={activeSlug === null}
          label="všetko"
          count={totalCount}
          onClick={() => handleSelect(null)}
          testid="blog-category-filter-all"
          buttonRef={registerChip("__all__")}
        />
        {options.map((opt) => {
          const visual = visualForCategory(opt.slug);
          const active = activeSlug === opt.slug;
          return (
            <FilterChip
              key={opt.slug}
              active={active}
              label={opt.name}
              count={opt.count}
              glyph={visual.glyph}
              accentHex={visual.accentHex}
              onClick={() => handleSelect(opt.slug)}
              testid={`blog-category-filter-${opt.slug}`}
              buttonRef={registerChip(opt.slug)}
            />
          );
        })}
      </div>
      {/* Right-edge fade mask — mobile-only affordance that there's
          more horizontally. Pointer-events-none so it never blocks
          chip taps. Hidden on md+ where chips wrap. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-card to-transparent md:hidden"
        data-testid="blog-category-filter-edge-fade"
      />
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
  buttonRef: (node: HTMLButtonElement | null) => void;
}

function FilterChip({
  active,
  label,
  count,
  onClick,
  glyph,
  accentHex,
  testid,
  buttonRef,
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
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={baseStyle}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-xs font-medium transition-all md:py-1.5 ${
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
