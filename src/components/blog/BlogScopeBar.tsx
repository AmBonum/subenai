import { BlogSearchInput } from "@/components/blog/BlogSearchInput";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { tFor } from "@/i18n/blog";

interface CategoryOption {
  slug: string;
  name: string;
  count: number;
}

interface BlogScopeBarProps {
  searchValue: string;
  onSearchChange: (next: string) => void;
  categoryOptions: CategoryOption[];
  activeCategorySlug: string | null;
  onCategoryChange: (next: string | null) => void;
  totalClusterCount: number;
}

// Combined "scope" surface — search input + category chips inside one
// bordered card. Lives between the (compressed) hero and the pillars
// section so filters reach the mobile fold-1 (current page buries them
// ~screen 3). One semantic <section role="search"> keeps the controls
// visually + a11y-grouped as a single mental unit.
export function BlogScopeBar({
  searchValue,
  onSearchChange,
  categoryOptions,
  activeCategorySlug,
  onCategoryChange,
  totalClusterCount,
}: BlogScopeBarProps) {
  const t = tFor("index");
  return (
    <section
      role="search"
      aria-label={t("scope_heading")}
      className="mt-6 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm md:mt-8 md:p-5"
      data-testid="blog-scope-bar"
    >
      <div className="flex flex-col gap-4">
        <div data-testid="blog-scope-bar-search">
          <BlogSearchInput value={searchValue} onChange={onSearchChange} />
        </div>
        <div data-testid="blog-scope-bar-filters">
          <CategoryFilter
            options={categoryOptions}
            activeSlug={activeCategorySlug}
            onChange={onCategoryChange}
            totalCount={totalClusterCount}
          />
        </div>
      </div>
    </section>
  );
}
