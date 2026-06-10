import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ListChecks, Target, Building2 } from "lucide-react";

import type { TestPack } from "@/content/test-packs";
import { fetchPackWithQuestions, fetchPlatformPacks } from "@/lib/platform/pack-queries";
import { RelatedTestPackArticleCard } from "@/components/test-packs/RelatedTestPackArticleCard";
import { RelatedTestPacks } from "@/components/test-packs/RelatedTestPacks";
import { TestPackHeroFallback } from "@/components/test-packs/TestPackHeroFallback";
import { Button } from "@/components/ui/button";
import { buildPackQuizJsonLd, INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";
const COPYRIGHT_HOLDER = "am.bonum s. r. o.";

// Quiz engine loads only when the user actually starts the test
// (mirrors test.index.tsx) — keeps TestFlow + the question bank out of
// the entry chunk.
const TestFlow = lazy(() =>
  import("@/components/quiz/flow/TestFlow").then((m) => ({ default: m.TestFlow })),
);

export const Route = createFileRoute("/tests/$slug")({
  // E37 Phase F — detail RPC + catalog RPC fetched in parallel by the
  // route loader (client-side; the app is CSR, so head() applies after
  // hydration and only JS-executing crawlers see the tags). The catalog
  // list is needed by <RelatedTestPacks /> below the fold; loading it
  // with the detail keeps the page render synchronous from the
  // component's perspective.
  loader: async ({ params }) => {
    const [detail, allPacks] = await Promise.all([
      fetchPackWithQuestions(params.slug),
      fetchPlatformPacks(),
    ]);
    if (!detail) throw notFound();
    return { ...detail, allPacks };
  },
  head: ({ loaderData }) => {
    const pack = loaderData?.pack;
    if (!pack) return { meta: [] };
    const t = tFor("testy");
    const url = `${SITE_ORIGIN}/tests/${pack.slug}`;
    return {
      meta: [
        {
          title: t("pack_meta_title", {
            title: pack.title,
            industry: INDUSTRY_LABEL[pack.industry],
          }),
        },
        { name: "description", content: pack.tagline },
        { name: "author", content: COPYRIGHT_HOLDER },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: pack.title },
        { property: "og:description", content: pack.tagline },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: pack.title },
        { name: "twitter:description", content: pack.tagline },
        { name: "twitter:image", content: `${SITE_ORIGIN}/og-default.png` },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildPackQuizJsonLd(pack)),
        },
      ],
    };
  },
  component: PackPage,
});

function PackPage() {
  const t = tFor("testy");
  const tCommon = tFor("common");
  const tTake = tFor("take");
  const loaderData = Route.useLoaderData();
  const pack: TestPack = loaderData.pack;
  const questions = loaderData.questions;
  const allPacks = loaderData.allPacks;
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <div className="min-h-screen bg-hero">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
              {tTake("loading")}
            </div>
          }
        >
          <TestFlow
            config={{
              kind: "pack",
              questions,
              passingThreshold: pack.passingThreshold,
              label: INDUSTRY_LABEL[pack.industry],
            }}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:pt-12">
        {/* E28 — detail-page hero alignment with catalog. The flat 7xl
            emoji on white bg created a jarring visual discontinuity
            after clicking through from the gradient-hero catalog card.
            Reusing TestPackHeroFallback variant="featured" (originally
            added for the catalog's spotlight slot) closes the gap with
            zero new component code. */}
        <TestPackHeroFallback
          industry={pack.industry}
          emoji={pack.industryEmoji}
          title={pack.title}
          variant="featured"
          testid="test-pack-hero"
        />
        <header className="mt-6 text-center">
          <h1 data-testid="test-pack-heading" className="text-3xl font-black sm:text-4xl">
            {pack.title}
          </h1>
          <p
            data-testid="test-pack-tagline"
            className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            {pack.tagline}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">{pack.targetPersona}</p>
          <ul
            data-testid="test-pack-meta"
            className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs"
            aria-label={t("pack_questions_aria")}
          >
            <li
              data-testid="test-pack-meta-questions"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-foreground"
            >
              <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("pack_questions_inline", { n: questions.length })}
            </li>
            <li
              data-testid="test-pack-meta-threshold"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-foreground"
            >
              <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("pack_threshold", { threshold: pack.passingThreshold })}
            </li>
            <li
              data-testid="test-pack-meta-industry"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-foreground"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {INDUSTRY_LABEL[pack.industry]}
            </li>
          </ul>
        </header>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            data-testid="test-pack-start-button"
            onClick={() => setStarted(true)}
            disabled={questions.length === 0}
          >
            {t("pack_start")}
          </Button>
          <Button asChild variant="outline">
            <Link to="/test">{t("pack_standard_cta")}</Link>
          </Button>
        </div>

        {questions.length === 0 && (
          <p className="mt-6 text-center text-sm text-warning">{t("pack_empty")}</p>
        )}

        {pack.sources && pack.sources.length > 0 && (
          <section
            aria-labelledby="pack-sources-h"
            className="mt-12 border-t border-border/60 pt-6"
          >
            <h2
              id="pack-sources-h"
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {tCommon("sources")}
            </h2>
            <ul className="mt-3 space-y-1 text-sm" role="list">
              {pack.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <RelatedTestPackArticleCard packSlug={pack.slug} />

        <RelatedTestPacks current={pack} all={allPacks} />

        <p className="mt-10 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          {t("pack_copyright", {
            year: pack.publishedAt
              ? new Date(pack.publishedAt).getFullYear()
              : new Date().getFullYear(),
            holder: COPYRIGHT_HOLDER,
          })}
        </p>
      </main>
    </div>
  );
}
