import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const tSkoly = tFor("marketing");

export const Route = createFileRoute("/skoly")({
  head: () => ({
    meta: [
      { title: tSkoly("skoly.meta_title") },
      { name: "description", content: tSkoly("skoly.meta_description") },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: SkolyPage,
});

function SkolyPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header>
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("skoly.back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t("skoly.title")}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("skoly.hero")}
          </p>
        </header>

        <article className="prose prose-sm mt-10 max-w-none space-y-8 text-foreground">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.what_heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.what_body_prefix")}
              <Link to={ROUTES.zostav} className="underline underline-offset-2">
                {t("skoly.what_body_link")}
              </Link>
              {t("skoly.what_body_suffix")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.step1_heading")}</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                {t("skoly.step1_li1_prefix")}
                <Link to={ROUTES.zostav} className="underline underline-offset-2">
                  {t("skoly.step1_li1_link")}
                </Link>
                {t("skoly.step1_li1_suffix")}
              </li>
              <li>{t("skoly.step1_li2")}</li>
              <li>{t("skoly.step1_li3")}</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.step2_heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.step2_p1_prefix")}
              <strong>{t("skoly.step2_p1_settings")}</strong>
              {t("skoly.step2_p1_middle")}
              <strong>{t("skoly.step2_p1_password")}</strong>
              {t("skoly.step2_p1_middle2")}
              <strong className="text-foreground">{t("skoly.step2_p1_emph")}</strong>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.step2_p2_prefix")}
              <em>{t("skoly.step2_p2_button")}</em>
              {t("skoly.step2_p2_suffix")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.step3_heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.step3_p_prefix")}
              <strong>{t("skoly.step3_p_emph")}</strong>
              {t("skoly.step3_p_suffix")}
            </p>
            <details className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-foreground">
                {t("skoly.step3_email_summary")}
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs text-foreground">
                {t("skoly.step3_email_template")}
              </pre>
            </details>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.step4_heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.step4_p_prefix")}
              <strong>{t("skoly.step4_p_emph")}</strong>
              {t("skoly.step4_p_suffix")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>{t("skoly.step4_li1")}</li>
              <li>{t("skoly.step4_li2")}</li>
              <li>{t("skoly.step4_li3")}</li>
              <li>{t("skoly.step4_li4")}</li>
              <li>
                <strong>{t("skoly.step4_li5_emph")}</strong>
                {t("skoly.step4_li5_suffix")}
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.step4_session")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.gdpr_heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skoly.gdpr_p_prefix")}
              <strong className="text-foreground">{t("skoly.gdpr_p_controller")}</strong>
              {t("skoly.gdpr_p_middle")}
              <strong>{t("skoly.gdpr_p_entity")}</strong>
              {t("skoly.gdpr_p_middle2")}
              <strong className="text-foreground">{t("skoly.gdpr_p_processor")}</strong>
              {t("skoly.gdpr_p_suffix")}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("skoly.gdpr_li1_emph")}</strong>
                {t("skoly.gdpr_li1_suffix")}
              </li>
              <li>
                <strong>{t("skoly.gdpr_li2_emph")}</strong>
                {t("skoly.gdpr_li2_suffix")}
              </li>
              <li>
                <strong>{t("skoly.gdpr_li3_emph")}</strong>
                {t("skoly.gdpr_li3_suffix")}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                {t("skoly.gdpr_li3_end")}
              </li>
              <li>
                <strong>{t("skoly.gdpr_li4_emph")}</strong>
                {t("skoly.gdpr_li4_prefix")}
                <Link to={ROUTES.privacy} className="underline underline-offset-2">
                  {t("skoly.gdpr_li4_link")}
                </Link>
                {t("skoly.gdpr_li4_suffix")}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("skoly.faq_heading")}</h2>
            <dl className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <div>
                <dt className="font-semibold text-foreground">{t("skoly.faq_pwd_q")}</dt>
                <dd className="mt-1">{t("skoly.faq_pwd_a")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{t("skoly.faq_retention_q")}</dt>
                <dd className="mt-1">{t("skoly.faq_retention_a")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{t("skoly.faq_delete_q")}</dt>
                <dd className="mt-1">{t("skoly.faq_delete_a")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{t("skoly.faq_max_q")}</dt>
                <dd className="mt-1">{t("skoly.faq_max_a")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{t("skoly.faq_retake_q")}</dt>
                <dd className="mt-1">{t("skoly.faq_retake_a")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{t("skoly.faq_mobile_q")}</dt>
                <dd className="mt-1">{t("skoly.faq_mobile_a")}</dd>
              </div>
            </dl>
          </section>
        </article>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            {t("skoly.outro_prefix")}
            <Link
              to={ROUTES.zostav}
              className="font-semibold text-foreground underline underline-offset-2"
            >
              {t("skoly.outro_link")}
            </Link>
            {t("skoly.outro_middle")}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            {t("skoly.outro_suffix")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <strong>{SITE_ORIGIN}</strong> · ©&nbsp;am.bonum s.&nbsp;r.&nbsp;o.
          </p>
        </div>

        <Footer />
      </main>
    </div>
  );
}
