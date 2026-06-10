import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Industry, TestPack } from "@/content/test-packs";
import { INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import { TestPackCard } from "@/components/test-packs/TestPackCard";
import { TestsValueStrip } from "@/components/tests/TestsValueStrip";
import { TestsFaqSection } from "@/components/tests/TestsFaqSection";
import { TestsLearningStrip } from "@/components/tests/TestsLearningStrip";
import { Button } from "@/components/ui/button";
import { tFor } from "@/i18n/quiz";

type SortKey = "newest" | "questions_desc";

function sortPacks(packs: TestPack[], sort: SortKey): TestPack[] {
  const copy = [...packs];
  if (sort === "newest") {
    copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } else if (sort === "questions_desc") {
    copy.sort(
      (a, b) =>
        (b.questionCount ?? b.questionIds.length) - (a.questionCount ?? a.questionIds.length),
    );
  }
  return copy;
}

export const Route = createLazyFileRoute("/tests/")({
  component: TestsCatalogPage,
});

function TestsCatalogPage() {
  const t = tFor("testy");
  const allPacks = Route.useLoaderData() as TestPack[];
  const [activeIndustries, setActiveIndustries] = useState<Set<Industry>>(new Set());
  const [sort, setSort] = useState<SortKey>("newest");

  const availableIndustries = useMemo(() => {
    const set = new Set<Industry>();
    for (const p of allPacks) set.add(p.industry);
    return [...set];
  }, [allPacks]);

  const filtered = useMemo(() => {
    const base =
      activeIndustries.size === 0
        ? allPacks
        : allPacks.filter((p) => activeIndustries.has(p.industry));
    return sortPacks(base, sort);
  }, [allPacks, activeIndustries, sort]);

  // D7 — algorithmic featured: top pack by current sort. When sort is
  // "newest" that's the most recently published; when sort is
  // "questions_desc" it's the deepest. Either way the user gets a
  // visually anchored "this is the recommended starting point" tile.
  const featured = filtered[0];
  const rest = filtered.slice(1);

  function toggleIndustry(i: Industry) {
    setActiveIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pt-16">
        <header className="mb-8 text-center">
          <h1 data-testid="tests-catalog-heading" className="text-4xl font-black sm:text-5xl">
            {t("page_heading")}
          </h1>
          <p
            data-testid="tests-catalog-intro"
            className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            {t("page_intro")}
          </p>
        </header>

        <TestsValueStrip />

        {availableIndustries.length > 1 && (
          <section
            aria-labelledby="filters-h"
            className="mb-6 rounded-2xl border border-border/60 bg-card/30 p-4"
          >
            <h2
              id="filters-h"
              className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("filter_industry")}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {availableIndustries.map((i) => {
                const active = activeIndustries.has(i);
                return (
                  // E37 Phase I — touch target ≥ 44px (WCAG 2.5.5 AAA + iOS HIG).
                  // Was py-1.5 ≈ 32px tall; now min-h-11 = 44px. Same visual
                  // weight on desktop, finger-friendly on mobile.
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleIndustry(i)}
                    aria-pressed={active}
                    data-testid={`tests-catalog-filter-${i}`}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {INDUSTRY_LABEL[i]}
                  </button>
                );
              })}
              {activeIndustries.size > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveIndustries(new Set())}
                  data-testid="tests-catalog-filter-clear"
                  className="ml-auto inline-flex min-h-11 items-center px-2 text-xs text-muted-foreground underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:text-foreground hover:underline"
                >
                  {t("clear_filter", { n: activeIndustries.size })}
                </button>
              )}
            </div>
          </section>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          {/* E37 Phase I — result-count badge (P1). Anchors the user's
              filtered-set size before the grid renders; especially useful
              for screen-reader users + when the grid is below the fold. */}
          <p
            data-testid="tests-catalog-result-count"
            className="text-xs font-medium text-muted-foreground"
            aria-live="polite"
          >
            {t("result_count", { n: filtered.length })}
          </p>
          <div className="flex items-center gap-2">
            <label
              htmlFor="tests-catalog-sort"
              className="text-xs font-medium text-muted-foreground"
              data-testid="tests-catalog-sort-label"
            >
              {t("sort_label")}
            </label>
            {/* E37 Phase I — touch target ≥ 44px on the select. */}
            <select
              id="tests-catalog-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              data-testid="tests-catalog-sort"
              className="min-h-11 rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="newest">{t("sort_newest")}</option>
              <option value="questions_desc">{t("sort_questions_desc")}</option>
            </select>
          </div>
        </div>

        {/* E37 Phase I — SR-only landmark heading for the catalog grid.
            Lets assistive-tech users jump to the list via the headings
            outline (was previously a bare <div>). */}
        <h2 data-testid="tests-catalog-grid-heading" className="sr-only">
          {t("grid_aria")}
        </h2>

        {filtered.length === 0 ? (
          // E37 Phase I — empty state now offers a one-click recovery.
          // Previously the user had to scroll up to clear filters; now
          // the action is co-located with the explanation. Falls back
          // gracefully (no button) when no filter is active — that means
          // the platform genuinely has 0 packs (only reachable on a fresh
          // DB without the Phase B' migration applied).
          <div
            role="status"
            data-testid="tests-catalog-empty"
            className="rounded-2xl border border-border/60 bg-card/30 p-8 text-center text-muted-foreground"
          >
            <p>{t("empty")}</p>
            {activeIndustries.size > 0 && (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                data-testid="tests-catalog-empty-clear"
                onClick={() => setActiveIndustries(new Set())}
              >
                {t("clear_filter_action")}
              </Button>
            )}
          </div>
        ) : (
          // E37 Phase I — semantic <ul> + role="list" for screen readers.
          // Forces Safari/VoiceOver to announce the list size (it strips
          // list-role from <ul list-none> by design, so we re-apply via
          // role attribute).
          <ul
            data-testid="tests-catalog-grid"
            role="list"
            className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
          >
            {featured && (
              <li className="sm:col-span-2 lg:col-span-3">
                <TestPackCard pack={featured} featured />
              </li>
            )}
            {rest.map((p) => (
              <li key={p.slug}>
                <TestPackCard pack={p} />
              </li>
            ))}
          </ul>
        )}

        <TestsLearningStrip />

        <TestsFaqSection />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/test" data-testid="tests-catalog-cta-standard">
              {t("cta_standard")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/courses" data-testid="tests-catalog-cta-courses">
              {t("cta_courses")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
