import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { COURSES } from "@/content/courses";
import type { CourseCategory } from "@/content/courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { CoursesCatalogSkeleton } from "@/components/courses/CoursesCatalogSkeleton";
import { CoursesValueStrip } from "@/components/courses/CoursesValueStrip";
import { CoursesFaqSection } from "@/components/courses/CoursesFaqSection";
import { Button } from "@/components/ui/button";
import { SITE_ORIGIN } from "@/config/site";
import { searchCourses } from "@/lib/courses/search";
import { useBlogPostsByRelatedCourses } from "@/lib/blog/queries";
import { buildCoursesItemListJsonLd } from "@/lib/seo/courses-jsonld";
import { buildCoursesFaqJsonLd } from "@/lib/seo/courses-faq-schema";
import { tFor } from "@/i18n/quiz";

// E25 Phase 2 — /courses catalog senior redesign.
//
// Before: text-only hero + emoji-card grid + bottom CTA.
// After: text-only hero followed by a 3-tile value strip
// (10 minutes · Real examples · Free), search + category filter,
// card grid where each card carries a compact "Čítaj k tomu:" slot
// linking to a related blog post (D6 — wire orphan), FAQ accordion,
// and the bottom CTA.
//
// SEO: head() now emits TWO JSON-LD blobs (was: just ItemList). The
// ItemList wraps each course as a ListItem (kept for catalog
// signaling); a new FAQPage carries the 5 Q&As. Per-course Course
// schema is emitted on the detail route (out of this scope), not
// repeated on the catalog — Google penalizes duplicate Course blobs.

export const Route = createFileRoute("/courses/")({
  head: () => {
    const t = tFor("skolenia");
    const url = `${SITE_ORIGIN}/courses`;
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow, max-image-preview:large" },
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
          children: JSON.stringify(
            buildCoursesItemListJsonLd(
              COURSES.map((c) => ({
                slug: c.slug,
                title: c.title,
                tagline: c.tagline,
                estimatedMinutes: c.estimatedMinutes,
                publishedAt: c.publishedAt,
                updatedAt: c.updatedAt,
              })),
              t("list_name"),
            ),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildCoursesFaqJsonLd(
              (key) => t(`faq_${key}`),
              (key) => t(`faq_a${key.slice(1)}`),
            ),
          ),
        },
      ],
    };
  },
  component: CoursesIndexPage,
});

type Audience = "general" | "seniors" | "business" | "investors" | "students";
type SortKey = "newest" | "shortest" | "beginner";
const AUDIENCES: Audience[] = ["general", "seniors", "business", "investors", "students"];

function inferAudience(slug: string): Audience[] {
  const seniors = ["chran-svojich-blizkych", "rodina-deti-seniori"];
  const business = ["bec-pracovisko-fake-ceo", "malvertising-fake-reklamy"];
  const investors = ["investicne-podvody-krypto-ai", "pig-butchering-podvod"];
  const students = ["studenti-online", "ai-pomocnik-kazdy-den"];
  const tags: Audience[] = [];
  if (seniors.includes(slug)) tags.push("seniors");
  if (business.includes(slug)) tags.push("business");
  if (investors.includes(slug)) tags.push("investors");
  if (students.includes(slug)) tags.push("students");
  if (tags.length === 0) tags.push("general");
  return tags;
}

function CoursesIndexPage() {
  const t = tFor("skolenia");
  const tCourses = tFor("courses_misc");
  const [activeCategories, setActiveCategories] = useState<Set<CourseCategory>>(new Set());
  const [activeAudiences, setActiveAudiences] = useState<Set<Audience>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const availableCategories = useMemo(() => {
    const seen = new Set<CourseCategory>();
    for (const c of COURSES) seen.add(c.category);
    return [...seen];
  }, []);

  const filtered = useMemo(() => {
    let result = COURSES;
    if (activeCategories.size > 0) {
      result = result.filter((c) => activeCategories.has(c.category));
    }
    if (activeAudiences.size > 0) {
      result = result.filter((c) => inferAudience(c.slug).some((a) => activeAudiences.has(a)));
    }
    if (query.trim()) {
      result = searchCourses(result, query);
    }
    const sorted = [...result];
    if (sortKey === "newest") {
      sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    } else if (sortKey === "shortest") {
      sorted.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    } else {
      sorted.sort((a, b) => {
        const da = a.difficulty === "začiatočník" ? 0 : 1;
        const db = b.difficulty === "začiatočník" ? 0 : 1;
        if (da !== db) return da - db;
        return a.estimatedMinutes - b.estimatedMinutes;
      });
    }
    return sorted;
  }, [activeCategories, activeAudiences, query, sortKey]);

  // Batched cross-link fetch: one supabase round-trip for all visible
  // course slugs instead of N per-card subscriptions. Stable because
  // the slug list is sorted inside the hook's queryKey.
  const allSlugs = useMemo(() => COURSES.map((c) => c.slug), []);
  const relatedQuery = useBlogPostsByRelatedCourses(allSlugs);
  const relatedMap = relatedQuery.data ?? {};

  function toggleCategory(cat: CourseCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleAudience(aud: Audience) {
    setActiveAudiences((prev) => {
      const next = new Set(prev);
      if (next.has(aud)) next.delete(aud);
      else next.add(aud);
      return next;
    });
  }

  const isFiltered =
    activeCategories.size > 0 || activeAudiences.size > 0 || query.trim().length > 0;
  const queryTrim = query.trim();

  const resultLine = (() => {
    if (!isFiltered || filtered.length === 0) return null;
    const head =
      filtered.length === 1
        ? t("result_one")
        : filtered.length < 5
          ? t("result_few", { n: filtered.length })
          : t("result_many", { n: filtered.length });
    const tail = queryTrim ? t("result_for_query", { q: queryTrim }) : "";
    return `${head}${tail}`;
  })();

  const emptyLine = queryTrim ? t("empty_for_query", { q: queryTrim }) : t("empty_for_filters");

  return (
    <div data-testid="courses-catalog-root" className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pt-16">
        <header className="mb-8 text-center">
          <h1 data-testid="courses-catalog-heading" className="text-4xl font-black sm:text-5xl">
            {t("page_heading")}
          </h1>
          <p
            data-testid="courses-catalog-intro"
            className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            {t("page_intro")}
          </p>
        </header>

        <CoursesValueStrip />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              data-testid="courses-catalog-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              aria-label={t("search_aria")}
              className="h-11 w-full rounded-xl border border-border/60 bg-card/30 pl-10 pr-10 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-card/60 focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                type="button"
                aria-label={t("clear_search_aria")}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>{t("sort_label")}</span>
            <select
              data-testid="courses-catalog-sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-11 rounded-xl border border-border/60 bg-card/30 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <option value="newest">{t("sort_newest")}</option>
              <option value="shortest">{t("sort_shortest")}</option>
              <option value="beginner">{t("sort_beginner")}</option>
            </select>
          </label>
        </div>

        {availableCategories.length > 1 && (
          <section
            data-testid="courses-catalog-filter-section"
            aria-labelledby="filters-h"
            className="mb-4 rounded-2xl border border-border/60 bg-card/30 p-4"
          >
            <h2
              id="filters-h"
              className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("filter_topic")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => {
                const active = activeCategories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    data-testid={`courses-catalog-filter-${cat}`}
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {tCourses(`category_label.${cat}`)}
                  </button>
                );
              })}
              {activeCategories.size > 0 && (
                <button
                  type="button"
                  data-testid="courses-catalog-filter-clear-all"
                  onClick={() => setActiveCategories(new Set())}
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t("clear_filter", { n: activeCategories.size })}
                </button>
              )}
            </div>
          </section>
        )}

        <section
          data-testid="courses-catalog-audience-section"
          aria-labelledby="audience-filters-h"
          className="mb-8 rounded-2xl border border-border/60 bg-card/30 p-4"
        >
          <h2
            id="audience-filters-h"
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("filter_audience")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((aud) => {
              const active = activeAudiences.has(aud);
              return (
                <button
                  key={aud}
                  type="button"
                  data-testid={`courses-catalog-audience-${aud}`}
                  onClick={() => toggleAudience(aud)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t(`audience_${aud}`)}
                </button>
              );
            })}
          </div>
        </section>

        {resultLine && <p className="mb-4 text-sm text-muted-foreground">{resultLine}</p>}

        {filtered.length === 0 ? (
          <div data-testid="courses-catalog-empty" className="py-16 text-center">
            <p className="text-muted-foreground">{emptyLine}</p>
            <p className="mt-2 text-sm text-muted-foreground/70">{t("empty_hint")}</p>
          </div>
        ) : relatedQuery.isLoading && Object.keys(relatedMap).length === 0 ? (
          <CoursesCatalogSkeleton />
        ) : (
          <div
            data-testid="courses-catalog-grid"
            className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          >
            {filtered.map((c) => (
              <CourseCard key={c.slug} course={c} relatedArticle={relatedMap[c.slug] ?? null} />
            ))}
          </div>
        )}

        <CoursesFaqSection />

        <div className="mt-12 flex justify-center">
          <Button asChild>
            <Link to="/test" data-testid="courses-catalog-cta-test">
              {t("cta_test")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
