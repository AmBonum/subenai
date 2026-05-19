import type { BlogPostListItem } from "@/lib/blog/queries";

import { BlogPostCard } from "./BlogPostCard";
import { CategoryBadge } from "./CategoryBadge";

interface SuggestedCategory {
  slug: string;
  name: string;
  count: number;
}

interface BlogSearchEmptyStateProps {
  // What the user typed (only the search input — category-only empties
  // get a simpler message and pass undefined here).
  query?: string;
  // Active category name when the empty state is caused by a category
  // filter rather than a search. Mutually exclusive with `query`.
  categoryName?: string;
  // 3-5 suggested categories rendered as chips. Caller passes the top
  // categories by post-count for the loaded list (excluding the
  // currently-active one if any).
  suggestedCategories: SuggestedCategory[];
  // 2-3 pillar articles surfaced as a fallback navigation row. These
  // are the editorial anchors of the blog — most likely to satisfy a
  // bounced reader.
  fallbackPillars: BlogPostListItem[];
  // Reset button handler — clears search query AND active category.
  onClear: () => void;
}

// E16.5 — senior-UX empty state when the search yields zero matches.
//
// Replaces the prior one-line "nenašli sme nič" with a visually
// prominent panel that:
//   • echoes the query verbatim so the user sees what was searched
//   • offers a "vymazať hľadanie" button to start over
//   • surfaces the top categories as clickable chips (most common
//     reason users land on /blog is topical browsing — chip click is
//     2x faster than re-typing)
//   • shows 2-3 pillar articles as a fallback "ak hľadáš základy"
//     row — bounce-prevention for queries we genuinely can't satisfy
//
// Design parallels the patterns used by Stripe Docs / Vercel Blog
// search-zero pages: clear acknowledgment of failure + immediate
// alternative paths, not a dead end.
export function BlogSearchEmptyState({
  query,
  categoryName,
  suggestedCategories,
  fallbackPillars,
  onClear,
}: BlogSearchEmptyStateProps) {
  const isSearch = typeof query === "string" && query.length > 0;
  return (
    <div
      className="mt-12 overflow-hidden rounded-2xl border border-dashed border-border bg-card/40 p-8 md:p-12"
      data-testid="blog-search-empty"
      role="region"
      aria-live="polite"
      aria-labelledby="blog-search-empty-title"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-5xl" aria-hidden="true" data-testid="blog-search-empty-icon">
          🔍
        </p>
        <h3
          id="blog-search-empty-title"
          className="mt-6 text-2xl font-bold tracking-tight md:text-3xl"
          data-testid="blog-search-empty-title"
        >
          {isSearch ? "nenašli sme nič" : "v tejto kategórii zatiaľ nič nie je"}
        </h3>
        {isSearch && (
          <p className="mt-3 text-base text-muted-foreground" data-testid="blog-search-empty-query">
            pre hľadaný výraz <span className="font-semibold text-foreground">„{query}"</span> sme
            nenašli žiaden článok.
          </p>
        )}
        {!isSearch && categoryName && (
          <p
            className="mt-3 text-base text-muted-foreground"
            data-testid="blog-search-empty-category"
          >
            v kategórii <span className="font-semibold text-foreground">{categoryName}</span> zatiaľ
            neboli publikované žiadne články. čoskoro pribudnú.
          </p>
        )}
        <button
          type="button"
          onClick={onClear}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
          data-testid="blog-search-empty-clear"
        >
          vymazať hľadanie a zobraziť všetky články
        </button>
      </div>

      {suggestedCategories.length > 0 && (
        <div
          className="mx-auto mt-10 max-w-3xl text-center"
          data-testid="blog-search-empty-suggestions"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            skús prejsť kategóriou
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestedCategories.map((cat) => (
              <CategoryBadge
                key={cat.slug}
                slug={cat.slug}
                name={`${cat.name} (${cat.count})`}
                variant="link"
                size="md"
                testid={`blog-search-empty-suggestion-${cat.slug}`}
              />
            ))}
          </div>
        </div>
      )}

      {fallbackPillars.length > 0 && (
        <div className="mt-12 border-t border-border pt-8" data-testid="blog-search-empty-pillars">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            alebo si pozri základných sprievodcov
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fallbackPillars.map((post) => (
              <li key={post.id} data-testid={`blog-search-empty-pillar-${post.slug}`}>
                <BlogPostCard post={post} variant="compact" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
