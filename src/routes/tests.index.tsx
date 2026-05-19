import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { listPublishedPacks, type Industry, type TestPack } from "@/content/test-packs";
import { INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import { TestPackCard } from "@/components/test-packs/TestPackCard";
import { TestsValueStrip } from "@/components/tests/TestsValueStrip";
import { TestsFaqSection } from "@/components/tests/TestsFaqSection";
import { TestsLearningStrip } from "@/components/tests/TestsLearningStrip";
import { buildTestsFaqJsonLd } from "@/lib/seo/tests-faq-schema";
import { Button } from "@/components/ui/button";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";

// E25 Phase 1 — /tests catalog senior redesign.
//
// Before: text-only hero + emoji-card grid + bottom CTAs.
// After: text-only hero followed by a 3-tile value strip
// (Anonymous · 5 minutes · Free), industry filter, sort dropdown,
// card grid with the top pack rendered as a featured spotlight,
// FAQ accordion with 5 Q&As, and the bottom CTAs.
//
// SEO: head() now emits TWO JSON-LD blobs — the existing ItemList for
// the pack catalog AND a new FAQPage for the FAQ Q&As. Both ship at
// SSR time so Google sees them without JS execution. Rich-result
// eligibility is independent of the accordion's collapsed UI state.

type SortKey = "newest" | "questions_desc";

function sortPacks(packs: TestPack[], sort: SortKey): TestPack[] {
  const copy = [...packs];
  if (sort === "newest") {
    copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } else if (sort === "questions_desc") {
    copy.sort((a, b) => b.questionIds.length - a.questionIds.length);
  }
  return copy;
}

export const Route = createFileRoute("/tests/")({
  head: () => {
    const t = tFor("testy");
    const url = `${SITE_ORIGIN}/tests`;
    const packs = listPublishedPacks();
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: t("meta_title") },
        { property: "og:description", content: t("og_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("list_name"),
            itemListElement: packs.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_ORIGIN}/tests/${p.slug}`,
              name: p.title,
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildTestsFaqJsonLd(
              (key) => t(`faq_${key}`),
              (key) => t(`faq_a${key.slice(1)}`),
            ),
          ),
        },
      ],
    };
  },
  component: TestsCatalogPage,
});

function TestsCatalogPage() {
  const t = tFor("testy");
  const allPacks = listPublishedPacks();
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
            <div className="flex flex-wrap gap-2">
              {availableIndustries.map((i) => {
                const active = activeIndustries.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleIndustry(i)}
                    aria-pressed={active}
                    data-testid={`tests-catalog-filter-${i}`}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
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
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t("clear_filter", { n: activeIndustries.size })}
                </button>
              )}
            </div>
          </section>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-end gap-2 text-sm">
          <label
            htmlFor="tests-catalog-sort"
            className="text-xs font-medium text-muted-foreground"
            data-testid="tests-catalog-sort-label"
          >
            {t("sort_label")}
          </label>
          <select
            id="tests-catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            data-testid="tests-catalog-sort"
            className="rounded-md border border-border/60 bg-background/60 px-2 py-1 text-sm text-foreground"
          >
            <option value="newest">{t("sort_newest")}</option>
            <option value="questions_desc">{t("sort_questions_desc")}</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p
            role="status"
            data-testid="tests-catalog-empty"
            className="rounded-2xl border border-border/60 bg-card/30 p-8 text-center text-muted-foreground"
          >
            {t("empty")}
          </p>
        ) : (
          <div
            data-testid="tests-catalog-grid"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {featured && (
              <div className="sm:col-span-2 lg:col-span-3">
                <TestPackCard pack={featured} featured />
              </div>
            )}
            {rest.map((p) => (
              <TestPackCard key={p.slug} pack={p} />
            ))}
          </div>
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
