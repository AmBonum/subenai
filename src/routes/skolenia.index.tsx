import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { COURSES } from "@/content/courses";
import type { CourseCategory } from "@/content/courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SITE_ORIGIN } from "@/config/site";
import { searchCourses } from "@/lib/courses/search";
import { tFor } from "@/i18n/quiz";

export const Route = createFileRoute("/skolenia/")({
  head: () => {
    const t = tFor("skolenia");
    const url = `${SITE_ORIGIN}/skolenia`;
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
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("list_name"),
            itemListElement: COURSES.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_ORIGIN}/kurzy/${c.slug}`,
              name: c.title,
            })),
          }),
        },
      ],
    };
  },
  component: CoursesIndexPage,
});

function CoursesIndexPage() {
  const t = tFor("skolenia");
  const tCourses = tFor("courses_misc");
  const [activeCategories, setActiveCategories] = useState<Set<CourseCategory>>(new Set());
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
    if (query.trim()) {
      result = searchCourses(result, query);
    }
    return result;
  }, [activeCategories, query]);

  function toggleCategory(cat: CourseCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const isFiltered = activeCategories.size > 0 || query.trim().length > 0;
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
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pt-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black sm:text-5xl">{t("page_heading")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("page_intro")}
          </p>
        </header>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
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

        {availableCategories.length > 1 && (
          <section
            aria-labelledby="filters-h"
            className="mb-8 rounded-2xl border border-border/60 bg-card/30 p-4"
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
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
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
                  onClick={() => setActiveCategories(new Set())}
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t("clear_filter", { n: activeCategories.size })}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Result count */}
        {resultLine && <p className="mb-4 text-sm text-muted-foreground">{resultLine}</p>}

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">{emptyLine}</p>
            <p className="mt-2 text-sm text-muted-foreground/70">{t("empty_hint")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <Button asChild>
            <Link to="/test">{t("cta_test")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
