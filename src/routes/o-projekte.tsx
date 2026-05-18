import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { SITE_ORIGIN } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const ABOUT_URL = `${SITE_ORIGIN}/o-projekte`;
const tAbout = tFor("marketing");

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: ABOUT_URL,
  name: tAbout("about.jsonld_name"),
  inLanguage: "sk-SK",
  description: tAbout("about.jsonld_description"),
  isPartOf: {
    "@type": "WebSite",
    name: "subenai",
    url: SITE_ORIGIN,
  },
  publisher: {
    "@type": "Organization",
    name: "am.bonum s. r. o.",
    url: SITE_ORIGIN,
  },
};

export const Route = createFileRoute("/o-projekte")({
  head: () => ({
    meta: [
      { title: tAbout("about.meta_title") },
      { name: "description", content: tAbout("about.meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tAbout("about.meta_title") },
      { property: "og:description", content: tAbout("about.meta_og_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: ABOUT_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: ABOUT_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(aboutJsonLd),
      },
    ],
  }),
  component: AboutPage,
});

export function AboutPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("about.back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("about.title")}
          </h1>
          <p className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
            {t("about.tagline")}
          </p>
        </header>

        <article className="prose prose-sm max-w-none space-y-8 text-foreground prose-headings:text-foreground prose-a:text-primary">
          <section
            aria-labelledby="ciel"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
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
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/zmeny</code>
              {t("about.money_zmeny_suffix")}
            </p>
          </section>

          <section
            aria-labelledby="co-sponzori"
            className="space-y-3 rounded-2xl border border-border/60 bg-card p-6"
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
                <code className="rounded bg-muted px-1 py-0.5 text-xs">/sponzori</code>
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
                >
                  {t("about.limits_li5_link")}
                </Link>
                {t("about.limits_li5_suffix_end")}
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="podporit"
            className="space-y-4 rounded-2xl border border-primary/40 bg-card p-6 text-center sm:p-8"
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
              >
                {t("about.support_cta_primary")}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                to={ROUTES.sponzori}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                {t("about.support_cta_secondary")}
              </Link>
            </div>
          </section>
        </article>

        <Footer />
      </main>
    </div>
  );
}
