import { createLazyFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogScopeBar } from "@/components/blog/BlogScopeBar";
import { BlogSearchEmptyState } from "@/components/blog/BlogSearchEmptyState";
import { PillarsSection } from "@/components/blog/PillarsSection";
import { tFor } from "@/i18n/blog";
import {
  trackBlogFilterChange,
  trackBlogIndexView,
  trackBlogSearch,
} from "@/lib/analytics/blog-events";
import { isPillarSlug } from "@/lib/blog/pillar-slugs";
import { useBlogPostList } from "@/lib/blog/queries";
import { buildBlogIndexJsonLd } from "@/lib/seo/blog-jsonld";
import { formatArticleCount } from "@/lib/blog/slovak-plurals";
import { useState } from "react";

export const Route = createLazyFileRoute("/blog/")({
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const t = tFor("index");
  const query = useBlogPostList();
  // Active category lives in the URL search params so `/blog?cat=...`
  // round-trips through reload + share. Search query stays in
  // component state (high-frequency keystrokes; not worth URL churn).
  const { cat } = useSearch({ from: "/blog/" });
  const activeCategory = cat ?? null;
  const navigate = useNavigate({ from: "/blog/" });
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Split into pillars + clusters once; the filter chip then narrows
  // the "clusters" list. Pillars stay visible on the hero row even when
  // a category filter is active (they're the editorial anchors —
  // surfacing them top-level keeps the IA legible). Memo on the
  // referentially stable query.data to avoid re-running on every render.
  const posts = useMemo(() => query.data ?? [], [query.data]);
  const pillars = useMemo(() => posts.filter((p) => isPillarSlug(p.slug)), [posts]);
  const clusters = useMemo(() => posts.filter((p) => !isPillarSlug(p.slug)), [posts]);

  // Category aggregates derived from the raw list so counts match
  // what's actually rendered.
  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of posts) {
      const existing = map.get(p.category.slug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(p.category.slug, { slug: p.category.slug, name: p.category.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [posts]);

  const filteredClusters = useMemo(() => {
    let out = clusters;
    if (activeCategory) {
      out = out.filter((p) => p.category.slug === activeCategory);
    }
    if (normalizedSearch.length > 1) {
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(normalizedSearch) ||
          p.excerpt.toLowerCase().includes(normalizedSearch),
      );
    }
    return out;
  }, [clusters, activeCategory, normalizedSearch]);

  // GA4 page_view fires once on mount; gtag's `config` triggered on
  // initial HTML load already counted the first hit, but TanStack
  // Router transitions in/out of /blog don't. The hook also fires the
  // dedicated 'blog_index_view' for funnel pivots in GA4 Explorer.
  useEffect(() => {
    trackBlogIndexView();
  }, []);

  // Debounced search event so we don't fire one per keystroke. 600 ms
  // is the conventional GA4 search debounce (long enough that mid-word
  // typing collapses to a single event, short enough to feel real-time
  // when reading reports).
  useEffect(() => {
    if (normalizedSearch.length < 2) return;
    const handle = window.setTimeout(() => {
      trackBlogSearch({
        query: normalizedSearch,
        result_count: filteredClusters.length,
      });
    }, 600);
    return () => window.clearTimeout(handle);
  }, [normalizedSearch, filteredClusters.length]);

  // Wraps the chip-click → navigate so the URL search param updates
  // AND fires the filter analytics on actual change (no duplicate
  // events when the same chip is re-pressed). `replace: true` keeps
  // the back button useful — users shouldn't have to step through
  // every chip click.
  const lastFilterRef = useRef<string | null>(activeCategory);
  const handleCategoryChange = (next: string | null): void => {
    void navigate({
      to: "/blog",
      search: (prev) => ({ ...prev, cat: next ?? undefined }),
      replace: true,
    });
    if (lastFilterRef.current !== next) {
      lastFilterRef.current = next;
      trackBlogFilterChange({ category_slug: next });
    }
  };

  // Empty-state helpers — when no clusters match the current filters,
  // we surface a suggested-categories chip row + a fallback pillars
  // grid so the reader has a clear next step.
  const handleClearFilters = (): void => {
    void navigate({
      to: "/blog",
      search: (prev) => ({ ...prev, cat: undefined }),
      replace: true,
    });
    setSearchQuery("");
    if (lastFilterRef.current !== null) {
      lastFilterRef.current = null;
      trackBlogFilterChange({ category_slug: null });
    }
  };
  const suggestedCategories = useMemo(() => {
    // Top 5 by post-count, excluding the currently-selected category.
    return categoryOptions.filter((opt) => opt.slug !== activeCategory).slice(0, 5);
  }, [categoryOptions, activeCategory]);
  const fallbackPillars = useMemo(() => pillars.slice(0, 3), [pillars]);
  // What kind of empty did we hit? Drives the message copy.
  const emptyKind: "search" | "category" | "search_in_category" | null = (() => {
    if (filteredClusters.length > 0) return null;
    if (normalizedSearch.length > 1 && activeCategory) return "search_in_category";
    if (normalizedSearch.length > 1) return "search";
    if (activeCategory) return "category";
    return null;
  })();
  const activeCategoryName = activeCategory
    ? (categoryOptions.find((c) => c.slug === activeCategory)?.name ?? activeCategory)
    : undefined;

  return (
    <main className="container mx-auto px-4 py-8 md:py-12" data-testid="blog-index-root">
      {/* Hero — compressed on mobile so the ScopeBar reaches fold-1.
          Left-aligned on small screens (reading flow), centered desktop. */}
      <header className="mx-auto max-w-4xl text-left md:text-center" data-testid="blog-index-hero">
        <p
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
          data-testid="blog-index-eyebrow"
        >
          <span aria-hidden="true">🎓</span> {t("eyebrow")}
        </p>
        <h1
          className="mt-4 text-3xl font-bold tracking-tight md:mt-6 md:text-5xl lg:text-6xl"
          data-testid="blog-index-title"
        >
          {t("title")}
        </h1>
        <p
          className="mt-4 text-base text-muted-foreground md:mt-6 md:text-xl"
          data-testid="blog-index-description"
        >
          {t("description")}
        </p>
      </header>

      {/* Combined Scope Card — search + filter chips. Lives directly
          under hero so the most important controls are above the fold
          on mobile. Skipped during loading/error/empty since chips
          would be empty anyway. */}
      {query.data && query.data.length > 0 && (
        <div data-testid="blog-index-scope-wrapper">
          <BlogScopeBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            categoryOptions={categoryOptions}
            activeCategorySlug={activeCategory}
            onCategoryChange={handleCategoryChange}
            totalClusterCount={clusters.length}
          />
        </div>
      )}

      {query.isLoading && (
        <p className="mt-12 text-center text-muted-foreground" data-testid="blog-index-loading">
          {t("loading")}
        </p>
      )}

      {query.isError && (
        <p className="mt-12 text-center" data-testid="blog-index-error" role="alert">
          {t("error")}
        </p>
      )}

      {query.data && query.data.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground" data-testid="blog-index-empty">
          {t("empty_state")}
        </p>
      )}

      {query.data && query.data.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildBlogIndexJsonLd(query.data)),
          }}
          data-testid="blog-index-jsonld"
        />
      )}

      {/* Featured pillars — collapsible. Caller hides the section
          entirely when search ≥ 2 chars (the user has expressed
          topical intent and we want matches above pillars). Otherwise
          PillarsSection owns its open/closed state. */}
      {pillars.length > 0 && normalizedSearch.length < 2 && <PillarsSection pillars={pillars} />}

      {/* Cluster grid (filter chips now live in ScopeBar above).
          Heading swaps to a search-results frame the moment the user
          starts searching (≥2 chars — same threshold the empty-state
          + pillars-hide flows already use). Otherwise it stays the
          editorial "najnovšie články" + "podľa témy" subheading. */}
      {clusters.length > 0 && (
        <section
          className="mt-12 border-t border-border pt-10 md:mt-16 md:pt-12"
          data-testid="blog-index-clusters-section"
          data-mode={normalizedSearch.length > 1 ? "search" : "latest"}
        >
          <div>
            <h2
              className="text-2xl font-bold tracking-tight md:text-3xl"
              data-testid="blog-index-clusters-heading"
            >
              {normalizedSearch.length > 1
                ? t("search_results_heading", { query: searchQuery.trim() })
                : t("latest_heading")}
            </h2>
            <p
              className="mt-2 text-sm text-muted-foreground"
              data-testid="blog-index-clusters-subheading"
            >
              {normalizedSearch.length > 1
                ? t("search_results_subheading", {
                    count: formatArticleCount(filteredClusters.length),
                  })
                : t("category_heading")}
            </p>
          </div>
          {emptyKind !== null ? (
            <BlogSearchEmptyState
              query={
                emptyKind === "search" || emptyKind === "search_in_category"
                  ? searchQuery.trim()
                  : undefined
              }
              categoryName={emptyKind === "category" ? activeCategoryName : undefined}
              suggestedCategories={suggestedCategories}
              fallbackPillars={fallbackPillars}
              onClear={handleClearFilters}
            />
          ) : (
            <ul
              className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              data-testid="blog-index-list"
            >
              {filteredClusters.map((post) => (
                <li key={post.id} data-testid={`blog-post-card-${post.slug}`}>
                  <BlogPostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
