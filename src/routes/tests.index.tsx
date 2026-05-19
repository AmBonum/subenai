import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { listPublishedPacks, type Industry } from "@/content/test-packs";
import { INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import { TestPackCard } from "@/components/test-packs/TestPackCard";
import { Button } from "@/components/ui/button";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";

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
      ],
    };
  },
  component: FirmaIndexPage,
});

function FirmaIndexPage() {
  const t = tFor("testy");
  const allPacks = listPublishedPacks();
  const [activeIndustries, setActiveIndustries] = useState<Set<Industry>>(new Set());

  const availableIndustries = useMemo(() => {
    const set = new Set<Industry>();
    for (const p of allPacks) set.add(p.industry);
    return [...set];
  }, [allPacks]);

  const filtered = useMemo(() => {
    if (activeIndustries.size === 0) return allPacks;
    return allPacks.filter((p) => activeIndustries.has(p.industry));
  }, [allPacks, activeIndustries]);

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

        {availableIndustries.length > 1 && (
          <section
            aria-labelledby="filters-h"
            className="mb-8 rounded-2xl border border-border/60 bg-card/30 p-4"
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
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t("clear_filter", { n: activeIndustries.size })}
                </button>
              )}
            </div>
          </section>
        )}

        {filtered.length === 0 ? (
          <p
            role="status"
            className="rounded-2xl border border-border/60 bg-card/30 p-8 text-center text-muted-foreground"
          >
            {t("empty")}
          </p>
        ) : (
          <div
            data-testid="tests-catalog-grid"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((p) => (
              <TestPackCard key={p.slug} pack={p} />
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/test">{t("cta_standard")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/courses">{t("cta_courses")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
