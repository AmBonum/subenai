import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const KONTAKT_URL = `${SITE_ORIGIN}${ROUTES.kontakt}`;
const tKontakt = tFor("marketing");

interface Topic {
  labelKey: string;
  subjectKey: string;
  hintKey: string;
}

const TOPICS: Topic[] = [
  {
    labelKey: "kontakt.topic_tech_label",
    subjectKey: "kontakt.topic_tech_subject",
    hintKey: "kontakt.topic_tech_hint",
  },
  {
    labelKey: "kontakt.topic_content_label",
    subjectKey: "kontakt.topic_content_subject",
    hintKey: "kontakt.topic_content_hint",
  },
  {
    labelKey: "kontakt.topic_sponsor_label",
    subjectKey: "kontakt.topic_sponsor_subject",
    hintKey: "kontakt.topic_sponsor_hint",
  },
  {
    labelKey: "kontakt.topic_gdpr_label",
    subjectKey: "kontakt.topic_gdpr_subject",
    hintKey: "kontakt.topic_gdpr_hint",
  },
  {
    labelKey: "kontakt.topic_press_label",
    subjectKey: "kontakt.topic_press_subject",
    hintKey: "kontakt.topic_press_hint",
  },
  {
    labelKey: "kontakt.topic_other_label",
    subjectKey: "kontakt.topic_other_subject",
    hintKey: "kontakt.topic_other_hint",
  },
];

function buildMailto(prefix: string, subject: string): string {
  const params = new URLSearchParams({ subject: `${prefix}${subject}` });
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: tKontakt("kontakt.meta_title") },
      { name: "description", content: tKontakt("kontakt.meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tKontakt("kontakt.meta_title") },
      { property: "og:description", content: tKontakt("kontakt.meta_og_description") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: KONTAKT_URL },
    ],
    links: [{ rel: "canonical", href: KONTAKT_URL }],
  }),
  component: KontaktPage,
});

export function KontaktPage() {
  const t = tFor("marketing");
  const subjectPrefix = t("kontakt.subject_prefix");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("kontakt.back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
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
          <a
            href={buildMailto(subjectPrefix, t("kontakt.title"))}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] sm:w-auto"
          >
            {t("kontakt.main_button", { email: CONTACT_EMAIL })}
            <span aria-hidden="true">→</span>
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("kontakt.main_fallback_prefix")}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{CONTACT_EMAIL}</code>
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground">{t("kontakt.topics_heading")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("kontakt.topics_body")}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <li key={topic.subjectKey}>
                <a
                  href={buildMailto(subjectPrefix, t(topic.subjectKey))}
                  className="block h-full rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/60"
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {t(topic.labelKey)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(topic.hintKey)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground sm:p-8">
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
            <Link to={ROUTES.privacy} className="text-primary underline underline-offset-2">
              {t("kontakt.operator_gdpr_link")}
            </Link>
            {t("kontakt.operator_gdpr_middle")}
            <a
              href={buildMailto(subjectPrefix, t("kontakt.topic_gdpr_subject"))}
              className="underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            {t("kontakt.operator_gdpr_suffix")}
          </p>
        </section>

        <Footer />
      </main>
    </div>
  );
}
