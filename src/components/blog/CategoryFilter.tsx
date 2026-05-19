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

// Client-side chip filter. Stays in component state — the blog index
// fetches the full list once (already < 100 rows) and filters locally
// to avoid a refetch per chip click. URL-state encoding could come in
// a later epic if SEO insists on filtered URLs (today: per-category
// archive routes at /blog/kategoria/$slug already cover that need).
export function CategoryFilter({ options, activeSlug, onChange, totalCount }: CategoryFilterProps) {
  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:flex-wrap md:overflow-visible md:pb-0"
      role="tablist"
      aria-label="Filter podľa kategórie"
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
          />
        );
      })}
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
}

function FilterChip({ active, label, count, onClick, glyph, accentHex, testid }: FilterChipProps) {
  const baseStyle =
    active && accentHex
      ? {
          backgroundColor: accentHex,
          color: "#fff",
          boxShadow: `0 4px 12px -2px ${accentHex}80`,
        }
      : undefined;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={baseStyle}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
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
