import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { ROUTES } from "@/config/routes";
import { HomeFaqSection, type FaqSection } from "@/components/home/HomeFaqSection";
import { tFor } from "@/i18n/marketing";

export const Route = createLazyFileRoute("/about")({
  component: AboutPage,
});

export function AboutPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link
            to={ROUTES.home}
            className="text-sm text-muted-foreground hover:text-foreground"
            data-testid="about-back-home"
          >
            {t("about.back_home")}
          </Link>
          <h1
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            data-testid="about-heading"
          >
            {t("about.title")}
          </h1>
          <p
            className="mt-4 text-lg font-semibold text-foreground sm:text-xl"
            data-testid="about-tagline"
          >
            {t("about.tagline")}
          </p>
        </header>

        <article className="prose prose-sm max-w-none space-y-8 text-foreground prose-headings:text-foreground prose-a:text-primary">
          <section
            aria-labelledby="ciel"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
            data-testid="about-section-ciel"
          >
            <h2 id="ciel" className="text-xl font-semibold">
              {t("about.ciel_heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("about.ciel_p1")}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("about.ciel_p2")}</p>
          </section>

          <section
            aria-labelledby="bezplatne"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
            data-testid="about-section-bezplatne"
          >
            <h2 id="bezplatne" className="text-xl font-semibold">
              {t("about.bezplatne_heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.bezplatne_p1_prefix")}
              <strong>{t("about.bezplatne_p1_emph")}</strong>
              {t("about.bezplatne_p1_suffix")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.bezplatne_p2")}
            </p>
          </section>

          <section
            aria-labelledby="preco-sponsorship"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
            data-testid="about-section-sponsorship"
          >
            <h2 id="preco-sponsorship" className="text-xl font-semibold">
              {t("about.sponsorship_heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.sponsorship_p1_prefix")}
              <strong>{t("about.sponsorship_p1_emph")}</strong>
              {t("about.sponsorship_p1_suffix")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.sponsorship_p2")}
            </p>
          </section>

          <section
            aria-labelledby="kam-id-peniaze"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
            data-testid="about-section-money"
          >
            <h2 id="kam-id-peniaze" className="text-xl font-semibold">
              {t("about.money_heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("about.money_p1")}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("about.money_li1_emph")}</strong>
                {t("about.money_li1_suffix")}
              </li>
              <li>
                <strong>{t("about.money_li2_emph")}</strong>
                {t("about.money_li2_suffix")}
              </li>
              <li>
                <strong>{t("about.money_li3_emph")}</strong>
                {t("about.money_li3_suffix")}
              </li>
              <li>
                <strong>{t("about.money_li4_emph")}</strong>
                {t("about.money_li4_suffix")}
              </li>
              <li>
                <strong>{t("about.money_li5_emph")}</strong>
                {t("about.money_li5_suffix")}
              </li>
              <li>
                <strong>{t("about.money_li6_emph")}</strong>
                {t("about.money_li6_suffix")}
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.money_zmeny_prefix")}
              <Link
                to={ROUTES.zmeny}
                data-testid="about-money-changelog-link"
                className="underline underline-offset-2"
              >
                /changelog
              </Link>
              {t("about.money_zmeny_suffix")}
            </p>
          </section>

          <section
            aria-labelledby="co-sponzori"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
            data-testid="about-section-sponsors"
          >
            <h2 id="co-sponzori" className="text-xl font-semibold">
              {t("about.sponsors_heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.sponsors_p1")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                {t("about.sponsors_li1_prefix")}
                <Link
                  to={ROUTES.sponzori}
                  data-testid="about-sponsors-link"
                  className="underline underline-offset-2"
                >
                  /sponsors
                </Link>
                {t("about.sponsors_li1_suffix")}
              </li>
              <li>{t("about.sponsors_li2")}</li>
              <li>{t("about.sponsors_li3")}</li>
              <li>
                {t("about.sponsors_li4_prefix")}
                <strong>{t("about.sponsors_li4_emph")}</strong>
                {t("about.sponsors_li4_suffix")}
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="co-nerobime"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
            data-testid="about-section-limits"
          >
            <h2 id="co-nerobime" className="text-xl font-semibold">
              {t("about.limits_heading")}
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("about.limits_li1_emph")}</strong>
                {t("about.limits_li1_suffix")}
              </li>
              <li>
                <strong>{t("about.limits_li2_emph")}</strong>
                {t("about.limits_li2_suffix")}
              </li>
              <li>
                <strong>{t("about.limits_li3_emph")}</strong>
                {t("about.limits_li3_suffix")}
              </li>
              <li>
                <strong>{t("about.limits_li4_emph")}</strong>
                {t("about.limits_li4_suffix")}
              </li>
              <li>
                <strong>{t("about.limits_li5_emph")}</strong>
                {t("about.limits_li5_suffix_prefix")}
                <Link
                  to={ROUTES.cookies}
                  className="underline underline-offset-2 hover:text-foreground"
                  data-testid="about-cookies-link"
                >
                  {t("about.limits_li5_link")}
                </Link>
                {t("about.limits_li5_suffix_end")}
              </li>
            </ul>
          </section>

          <AboutFaq />

          <section
            aria-labelledby="podporit"
            className="space-y-4 rounded-2xl border border-primary/40 bg-card p-6 text-center sm:p-8"
            data-testid="about-section-support"
          >
            <h2 id="podporit" className="text-xl font-semibold">
              {t("about.support_heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.support_body")}
            </p>
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
              <Link
                to={ROUTES.podpora}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
                data-testid="about-support-cta-primary"
              >
                {t("about.support_cta_primary")}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                to={ROUTES.sponzori}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                data-testid="about-support-cta-secondary"
              >
                {t("about.support_cta_secondary")}
              </Link>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

// E21.5 — FAQ section added to /about. Reuses the home accordion
// adapter (HomeFaqSection) parametrised via `testIdPrefix="about-faq"`
// (introduced in E19.5). 5 questions cover the most common
// objections that arrive in support emails about identity,
// independence, monetisation, and data scope.
function AboutFaq() {
  const t = tFor("marketing");
  const sections = useMemo<FaqSection[]>(
    () => [
      {
        slug: "identity",
        title: t("about.faq_section_identity"),
        items: [
          {
            id: "kto",
            question: t("about.faq_kto_q"),
            answer: t("about.faq_kto_a"),
          },
          {
            id: "independent",
            question: t("about.faq_independent_q"),
            answer: t("about.faq_independent_a"),
          },
        ],
      },
      {
        slug: "model",
        title: t("about.faq_section_model"),
        items: [
          {
            id: "free",
            question: t("about.faq_free_q"),
            answer: t("about.faq_free_a"),
          },
          {
            id: "data",
            question: t("about.faq_data_q"),
            answer: t("about.faq_data_a"),
          },
          {
            id: "ai",
            question: t("about.faq_ai_q"),
            answer: t("about.faq_ai_a"),
          },
        ],
      },
    ],
    [t],
  );

  return (
    <div data-testid="about-faq">
      <HomeFaqSection
        sections={sections}
        heading={t("about.faq_heading")}
        subheading={t("about.faq_subheading")}
        testIdPrefix="about-faq"
        docsHint={null}
      />
    </div>
  );
}
