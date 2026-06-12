import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const CONTACT_URL = `${SITE_ORIGIN}${ROUTES.contact}`;
const tKontakt = tFor("marketing");

interface Topic {
  labelKey: string;
  hintKey: string;
  slug: string;
}

const TOPICS: Topic[] = [
  { labelKey: "kontakt.topic_tech_label", hintKey: "kontakt.topic_tech_hint", slug: "tech" },
  {
    labelKey: "kontakt.topic_content_label",
    hintKey: "kontakt.topic_content_hint",
    slug: "content",
  },
  {
    labelKey: "kontakt.topic_sponsor_label",
    hintKey: "kontakt.topic_sponsor_hint",
    slug: "sponsor",
  },
  { labelKey: "kontakt.topic_gdpr_label", hintKey: "kontakt.topic_gdpr_hint", slug: "gdpr" },
  { labelKey: "kontakt.topic_press_label", hintKey: "kontakt.topic_press_hint", slug: "press" },
  { labelKey: "kontakt.topic_other_label", hintKey: "kontakt.topic_other_hint", slug: "other" },
];

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: tKontakt("kontakt.meta_title") },
      { name: "description", content: tKontakt("kontakt.meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tKontakt("kontakt.meta_title") },
      { property: "og:description", content: tKontakt("kontakt.meta_og_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CONTACT_URL },
    ],
    links: [{ rel: "canonical", href: CONTACT_URL }],
  }),
  component: KontaktPage,
});

export function KontaktPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main
        data-testid="contact-page-root"
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16"
      >
        <header className="mb-10">
          <Link
            to={ROUTES.home}
            data-testid="contact-back-link"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("kontakt.back_home")}
          </Link>
          <h1
            data-testid="contact-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("kontakt.title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t("kontakt.hero_prefix")}
            <strong className="text-foreground">{t("kontakt.hero_emph")}</strong>
            {t("kontakt.hero_suffix")}
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">{t("kontakt.main_heading")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("kontakt.main_body")}</p>
          <Link
            data-testid="contact-main-form-link"
            to={ROUTES.contactForm}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] sm:w-auto"
          >
            {t("kontakt.main_button")}
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("kontakt.main_fallback_prefix")}
            <code
              data-testid="contact-email-fallback"
              className="rounded bg-muted px-1.5 py-0.5 text-foreground"
            >
              {CONTACT_EMAIL}
            </code>
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground">{t("kontakt.topics_heading")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("kontakt.topics_body")}</p>
          <ul data-testid="contact-topics-list" className="mt-4 grid gap-3 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <li key={topic.slug}>
                <Link
                  data-testid={`contact-topic-link-${topic.slug}`}
                  to={ROUTES.contactForm}
                  search={{ topic: topic.slug }}
                  className="block h-full rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/60"
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {t(topic.labelKey)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(topic.hintKey)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          data-testid="contact-operator-card"
          className="rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground sm:p-8"
        >
          <h2 className="text-base font-semibold text-foreground">
            {t("kontakt.operator_heading")}
          </h2>
          <p className="mt-2 leading-relaxed">
            <strong className="text-foreground">{t("kontakt.operator_entity")}</strong>
            <br />
            {t("kontakt.operator_address")}
            <br />
            {t("kontakt.operator_ids")}
            <br />
            {t("kontakt.operator_court")}
          </p>
          <p className="mt-4 leading-relaxed">
            {t("kontakt.operator_gdpr_prefix")}
            <Link
              to={ROUTES.privacy}
              data-testid="contact-privacy-link"
              className="text-primary underline underline-offset-2"
            >
              {t("kontakt.operator_gdpr_link")}
            </Link>
            {t("kontakt.operator_gdpr_middle")}
            <code
              data-testid="contact-gdpr-email-code"
              className="rounded bg-muted px-1.5 py-0.5 text-foreground"
            >
              {CONTACT_EMAIL}
            </code>
            {t("kontakt.operator_gdpr_suffix")}
          </p>
        </section>
      </main>
    </div>
  );
}
