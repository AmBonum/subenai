import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AudienceSection } from "@/components/home/AudienceSection";
import { BlogHomeSection } from "@/components/home/BlogHomeSection";
import { ChangelogTeaser } from "@/components/home/ChangelogTeaser";
import { HomeFaqSection, type FaqSection } from "@/components/home/HomeFaqSection";
import { LearningPathSection } from "@/components/home/LearningPathSection";
import { SchoolsHomeCard } from "@/components/home/SchoolsHomeCard";
import { ROUTES } from "@/config/routes";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";
import { buildFaqJsonLd } from "@/lib/seo/faq-jsonld";

const tHome = tFor("marketing");

// Plain-text FAQ used for FAQPage JSON-LD. Mirrors the visible Q&A
// content but with the <Link>-augmented prose flattened back to strings
// because schema.org/Answer.text rejects HTML markup (the rendered
// HTML is fine for users; the JSON-LD must be plain text for Google).
// Keep this list in lockstep with buildFaqSections() — same i18n keys,
// no separate copy-edit surface.
function buildFaqJsonLdEntries(t: ReturnType<typeof tFor>): { question: string; answer: string }[] {
  return [
    { question: t("home.faq.rychly_test.vazne_q"), answer: t("home.faq.rychly_test.vazne_a") },
    {
      question: t("home.faq.rychly_test.podvadzanie_q"),
      answer: t("home.faq.rychly_test.podvadzanie_a"),
    },
    {
      question: t("home.faq.rychly_test.vysledok_q"),
      answer: t("home.faq.rychly_test.vysledok_a"),
    },
    {
      question: t("home.faq.testy.testy_q"),
      answer:
        t("home.faq.testy.testy_a_prefix") +
        t("home.faq.testy.testy_a_link") +
        t("home.faq.testy.testy_a_suffix"),
    },
    {
      question: t("home.faq.testy.demograficke_q"),
      answer:
        t("home.faq.testy.demograficke_a_prefix") +
        t("home.faq.testy.demograficke_a_link") +
        t("home.faq.testy.demograficke_a_suffix"),
    },
    {
      question: t("home.faq.skolenia.co_q"),
      answer:
        t("home.faq.skolenia.co_a_prefix") +
        t("home.faq.skolenia.co_a_link") +
        t("home.faq.skolenia.co_a_suffix"),
    },
    { question: t("home.faq.skolenia.odbornik_q"), answer: t("home.faq.skolenia.odbornik_a") },
    {
      question: t("home.faq.vzdelavanie.rozdiel_q"),
      answer:
        t("home.faq.vzdelavanie.rozdiel_a_prefix") +
        t("home.faq.vzdelavanie.rozdiel_a_link_skolenia") +
        t("home.faq.vzdelavanie.rozdiel_a_middle") +
        t("home.faq.vzdelavanie.rozdiel_a_link_blog") +
        t("home.faq.vzdelavanie.rozdiel_a_suffix"),
    },
    {
      question: t("home.faq.vzdelavanie.akademia_q"),
      answer:
        t("home.faq.vzdelavanie.akademia_a_prefix") +
        t("home.faq.vzdelavanie.akademia_a_link") +
        t("home.faq.vzdelavanie.akademia_a_suffix"),
    },
    {
      question: t("home.faq.vzdelavanie.audience_q"),
      answer:
        t("home.faq.vzdelavanie.audience_a_prefix") +
        t("home.faq.vzdelavanie.audience_a_link") +
        t("home.faq.vzdelavanie.audience_a_suffix"),
    },
    {
      question: t("home.faq.podpora.zadarmo_q"),
      answer:
        t("home.faq.podpora.zadarmo_a_prefix") +
        t("home.faq.podpora.zadarmo_a_link_test") +
        t("home.faq.podpora.zadarmo_a_comma1") +
        t("home.faq.podpora.zadarmo_a_link_testy") +
        t("home.faq.podpora.zadarmo_a_comma2") +
        t("home.faq.podpora.zadarmo_a_link_skolenia") +
        t("home.faq.podpora.zadarmo_a_suffix"),
    },
    {
      question: t("home.faq.podpora.preco_q"),
      answer:
        t("home.faq.podpora.preco_a_prefix") +
        t("home.faq.podpora.preco_a_link") +
        t("home.faq.podpora.preco_a_suffix"),
    },
    {
      question: t("home.faq.bezpecnost.data_q"),
      answer:
        t("home.faq.bezpecnost.data_a_prefix") +
        t("home.faq.bezpecnost.data_a_link") +
        t("home.faq.bezpecnost.data_a_suffix"),
    },
    {
      question: t("home.faq.bezpecnost.cookies_q"),
      answer:
        t("home.faq.bezpecnost.cookies_a_prefix") +
        t("home.faq.bezpecnost.cookies_a_link") +
        t("home.faq.bezpecnost.cookies_a_suffix"),
    },
    { question: t("home.faq.bezpecnost.zmazanie_q"), answer: t("home.faq.bezpecnost.zmazanie_a") },
  ];
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: tHome("home.meta_title") },
      { name: "description", content: tHome("home.meta_description") },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "language", content: "sk-SK" },
      { property: "og:title", content: tHome("home.meta_title") },
      { property: "og:description", content: tHome("home.meta_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_ORIGIN },
      { property: "og:locale", content: "sk_SK" },
      { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: tHome("home.meta_title") },
      { name: "twitter:description", content: tHome("home.meta_description") },
      { name: "twitter:image", content: `${SITE_ORIGIN}/og-default.png` },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildFaqJsonLd(buildFaqJsonLdEntries(tHome))),
      },
    ],
  }),
  component: Index,
});

function buildFaqSections(t: ReturnType<typeof tFor>): FaqSection[] {
  return [
    {
      slug: "rychly_test",
      title: t("home.faq.rychly_test.title"),
      items: [
        {
          id: "vazne",
          question: t("home.faq.rychly_test.vazne_q"),
          answer: t("home.faq.rychly_test.vazne_a"),
        },
        {
          id: "podvadzanie",
          question: t("home.faq.rychly_test.podvadzanie_q"),
          answer: t("home.faq.rychly_test.podvadzanie_a"),
        },
        {
          id: "vysledok",
          question: t("home.faq.rychly_test.vysledok_q"),
          answer: t("home.faq.rychly_test.vysledok_a"),
        },
      ],
    },
    {
      slug: "testy",
      title: t("home.faq.testy.title"),
      items: [
        {
          id: "testy",
          question: t("home.faq.testy.testy_q"),
          answer: (
            <>
              {t("home.faq.testy.testy_a_prefix")}
              <Link
                to={ROUTES.testy}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.testy.testy_a_link")}
              </Link>
              {t("home.faq.testy.testy_a_suffix")}
            </>
          ),
        },
        {
          id: "demograficke",
          question: t("home.faq.testy.demograficke_q"),
          answer: (
            <>
              {t("home.faq.testy.demograficke_a_prefix")}
              <Link
                to={ROUTES.testy}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.testy.demograficke_a_link")}
              </Link>
              {t("home.faq.testy.demograficke_a_suffix")}
            </>
          ),
        },
      ],
    },
    {
      slug: "skolenia",
      title: t("home.faq.skolenia.title"),
      items: [
        {
          id: "skolenia-co",
          question: t("home.faq.skolenia.co_q"),
          answer: (
            <>
              {t("home.faq.skolenia.co_a_prefix")}
              <Link
                to={ROUTES.skolenia}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.skolenia.co_a_link")}
              </Link>
              {t("home.faq.skolenia.co_a_suffix")}
            </>
          ),
        },
        {
          id: "skolenia-odbornik",
          question: t("home.faq.skolenia.odbornik_q"),
          answer: t("home.faq.skolenia.odbornik_a"),
        },
      ],
    },
    {
      slug: "vzdelavanie",
      title: t("home.faq.vzdelavanie.title"),
      items: [
        {
          id: "rozdiel",
          question: t("home.faq.vzdelavanie.rozdiel_q"),
          answer: (
            <>
              {t("home.faq.vzdelavanie.rozdiel_a_prefix")}
              <Link
                to={ROUTES.skolenia}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.vzdelavanie.rozdiel_a_link_skolenia")}
              </Link>
              {t("home.faq.vzdelavanie.rozdiel_a_middle")}
              <Link
                to={ROUTES.blog}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.vzdelavanie.rozdiel_a_link_blog")}
              </Link>
              {t("home.faq.vzdelavanie.rozdiel_a_suffix")}
            </>
          ),
        },
        {
          id: "akademia",
          question: t("home.faq.vzdelavanie.akademia_q"),
          answer: (
            <>
              {t("home.faq.vzdelavanie.akademia_a_prefix")}
              <Link
                to={ROUTES.blog}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.vzdelavanie.akademia_a_link")}
              </Link>
              {t("home.faq.vzdelavanie.akademia_a_suffix")}
            </>
          ),
        },
        {
          id: "audience",
          question: t("home.faq.vzdelavanie.audience_q"),
          answer: (
            <>
              {t("home.faq.vzdelavanie.audience_a_prefix")}
              <Link
                to={ROUTES.blog}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.vzdelavanie.audience_a_link")}
              </Link>
              {t("home.faq.vzdelavanie.audience_a_suffix")}
            </>
          ),
        },
      ],
    },
    {
      slug: "podpora",
      title: t("home.faq.podpora.title"),
      items: [
        {
          id: "zadarmo",
          question: t("home.faq.podpora.zadarmo_q"),
          answer: (
            <>
              {t("home.faq.podpora.zadarmo_a_prefix")}
              <Link
                to={ROUTES.test}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.podpora.zadarmo_a_link_test")}
              </Link>
              {t("home.faq.podpora.zadarmo_a_comma1")}
              <Link
                to={ROUTES.testy}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.podpora.zadarmo_a_link_testy")}
              </Link>
              {t("home.faq.podpora.zadarmo_a_comma2")}
              <Link
                to={ROUTES.skolenia}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.podpora.zadarmo_a_link_skolenia")}
              </Link>
              {t("home.faq.podpora.zadarmo_a_suffix")}
            </>
          ),
        },
        {
          id: "podpora-preco",
          question: t("home.faq.podpora.preco_q"),
          answer: (
            <>
              {t("home.faq.podpora.preco_a_prefix")}
              <Link
                to={ROUTES.podpora}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.podpora.preco_a_link")}
              </Link>
              {t("home.faq.podpora.preco_a_suffix")}
            </>
          ),
        },
      ],
    },
    {
      slug: "bezpecnost",
      title: t("home.faq.bezpecnost.title"),
      items: [
        {
          id: "data",
          question: t("home.faq.bezpecnost.data_q"),
          answer: (
            <>
              {t("home.faq.bezpecnost.data_a_prefix")}
              <Link
                to={ROUTES.privacy}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.bezpecnost.data_a_link")}
              </Link>
              {t("home.faq.bezpecnost.data_a_suffix")}
            </>
          ),
        },
        {
          id: "cookies",
          question: t("home.faq.bezpecnost.cookies_q"),
          answer: (
            <>
              {t("home.faq.bezpecnost.cookies_a_prefix")}
              <Link
                to={ROUTES.cookies}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {t("home.faq.bezpecnost.cookies_a_link")}
              </Link>
              {t("home.faq.bezpecnost.cookies_a_suffix")}
            </>
          ),
        },
        {
          id: "zmazanie",
          question: t("home.faq.bezpecnost.zmazanie_q"),
          answer: t("home.faq.bezpecnost.zmazanie_a"),
        },
      ],
    },
  ];
}

function Index() {
  const t = tFor("marketing");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("attempts")
        .select("id", { count: "estimated", head: true });
      if (!cancelled && typeof c === "number") setCount(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Display: estimated count + a small offset so first visitors don't see "0 ľudí"
  const displayCount = count === null ? null : count + 127;
  const faqSections = buildFaqSections(t);

  return (
    <div className="min-h-screen bg-hero">
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-12 sm:pt-24">
        {/* Hero */}
        <div className="text-center">
          <div
            data-testid="home-stats-pill"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {displayCount === null
              ? t("home.stats_loading")
              : t("home.stats_count", { count: displayCount.toLocaleString("sk-SK") })}
          </div>

          <h1
            className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
            data-testid="home-hero-heading"
          >
            {t("home.hero_title_prefix")}
            <span className="text-primary">{t("home.hero_title_suffix")}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            {t("home.hero_lead")}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              to={ROUTES.test}
              data-testid="home-hero-cta"
              className="group inline-flex items-center gap-2 rounded-2xl bg-accent-gradient px-8 py-5 text-lg font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
            >
              {t("home.hero_cta")}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <p
              data-testid="home-hero-tagline"
              className="text-sm font-semibold text-foreground sm:text-base"
            >
              <span className="text-muted-foreground font-normal">{t("home.hero_no_reg")}</span>{" "}
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>{" "}
              <span className="text-muted-foreground font-normal">{t("home.hero_seconds")}</span>{" "}
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>{" "}
              <span className="text-primary">{t("home.hero_free")}</span>
            </p>
          </div>
        </div>

        {/* How it works */}
        <section className="mt-24">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("home.how_heading")}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: t("home.how_cards.questions_n"),
                title: t("home.how_cards.questions_title"),
                sub: t("home.how_cards.questions_sub"),
              },
              {
                n: t("home.how_cards.time_n"),
                title: t("home.how_cards.time_title"),
                sub: t("home.how_cards.time_sub"),
              },
              {
                n: t("home.how_cards.result_n"),
                title: t("home.how_cards.result_title"),
                sub: t("home.how_cards.result_sub"),
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-border/60 bg-card/70 p-5 text-center shadow-card backdrop-blur sm:text-left"
              >
                <div className="font-display text-4xl font-black text-primary">{c.n}</div>
                <div className="mt-1 text-base font-semibold">{c.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{c.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* E18.1 — Audience-segmented entry points */}
        <AudienceSection />

        {/* E18.2 — Test → Školenia → Akadémia funnel visualisation */}
        <LearningPathSection />

        {/* Feature cards: Testy / Školenia / O projekte */}
        <section className="mt-20 grid gap-4 md:grid-cols-3" aria-labelledby="features-h">
          <h2 id="features-h" className="sr-only">
            {t("home.features_aria")}
          </h2>
          <FeatureCard
            to={ROUTES.testy}
            emoji="🏢"
            title={t("home.feature_testy_title")}
            description={t("home.feature_testy_desc")}
            cta={t("home.feature_testy_cta")}
            testId="home-feature-card-testy"
          />
          <FeatureCard
            to={ROUTES.skolenia}
            emoji="📚"
            title={t("home.feature_skolenia_title")}
            description={t("home.feature_skolenia_desc")}
            cta={t("home.feature_skolenia_cta")}
            testId="home-feature-card-skolenia"
          />
          <FeatureCard
            to={ROUTES.oProjecte}
            emoji="🛡️"
            title={t("home.feature_about_title")}
            description={t("home.feature_about_desc")}
            cta={t("home.feature_about_cta")}
            testId="home-feature-card-about"
          />
        </section>

        {/* E18.3 — B2B / schools surface (high-LTV, distinct color) */}
        <SchoolsHomeCard />

        {/* Sponsorship — primary new ask, full-width gradient panel */}
        <section
          aria-labelledby="support-h"
          className="relative mt-16 overflow-hidden rounded-3xl border border-primary/40 bg-card p-8 sm:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-accent-gradient opacity-[0.08]"
          />
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("home.mission_kicker")}
              </p>
              <h2 id="support-h" className="text-2xl font-black tracking-tight sm:text-3xl">
                {t("home.mission_heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("home.mission_body_prefix")}
                <strong className="text-foreground">{t("home.mission_body_amount")}</strong>
                {t("home.mission_body_suffix")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                to={ROUTES.podpora}
                data-testid="home-mission-cta-support"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
              >
                {t("home.mission_cta_support")}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                to={ROUTES.oProjecte}
                data-testid="home-mission-cta-more"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                {t("home.mission_cta_more")}
              </Link>
            </div>
          </div>
        </section>

        {/* Sponsors thank-you — small acknowledgement block */}
        <section
          aria-labelledby="sponsors-h"
          className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 p-6 text-center sm:flex-row sm:items-center sm:text-left"
        >
          <div className="space-y-1">
            <p className="text-2xl" aria-hidden="true">
              🙏
            </p>
            <h2 id="sponsors-h" className="text-base font-bold">
              {t("home.sponsors_heading")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("home.sponsors_body")}</p>
          </div>
          <Link
            to={ROUTES.sponzori}
            data-testid="home-sponsors-cta"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            {t("home.sponsors_cta")}
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        {/* Brand slogan banner — light SVG variant for current dark site
            theme. When/if a light mode is introduced, swap to the dark
            variant `/su-be-na-i-slogan-dark.svg` (already in public/).
            SVG instead of PNG: vector scales crisply at any size and
            cuts the bytes shipped to the client. */}
        <section className="mt-20 flex justify-center" data-testid="home-slogan-section">
          <img
            src="/su-be-na-i-slogan-light.svg"
            alt={t("home.slogan_alt")}
            data-testid="home-slogan-image"
            className="w-full max-w-2xl"
            loading="lazy"
            decoding="async"
          />
        </section>

        {/* Akadémia — featured blog content (3 pillar articles) */}
        <BlogHomeSection />

        {/* FAQ — two-level collapsible (categories collapsed by default) */}
        <HomeFaqSection sections={faqSections} />

        {/* E18.4 — Changelog teaser — last content above the Footer */}
        <ChangelogTeaser />
      </main>
    </div>
  );
}

interface FeatureCardProps {
  to: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  testId: string;
}

function FeatureCard({ to, emoji, title, description, cta, testId }: FeatureCardProps) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="group flex h-full flex-col items-center rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-card backdrop-blur transition hover:border-primary/50 hover:bg-card md:items-start md:text-left"
    >
      <div className="text-3xl" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="mt-3 text-lg font-bold group-hover:text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {cta} <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
