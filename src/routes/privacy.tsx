import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/legal";

const tPrivacy = tFor("privacy");

const PROCESSING_ROW_KEYS = [
  "completion",
  "review",
  "survey",
  "anticheat",
  "composer",
  "edu",
  "analytics",
  "consent_record",
  "sponsorship",
] as const;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: tPrivacy("meta_title") },
      { name: "description", content: tPrivacy("meta_description") },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const t = tFor("privacy");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("last_updated")}</p>
        </header>

        <article className="prose prose-sm max-w-none space-y-6 text-foreground prose-headings:text-foreground prose-a:text-primary">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s1.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s1.intro")}</p>
            <ul className="list-none space-y-1 pl-0 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">{t("s1.company")}</strong>
              </li>
              <li>{t("s1.address")}</li>
              <li>{t("s1.ids")}</li>
              <li>{t("s1.registry")}</li>
              <li>{t("s1.executive")}</li>
              <li>
                {t("s1.contact_label")}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s1.dpo")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s2.heading")}</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("s2.answers_label")}</strong>
                {t("s2.answers_text")}
              </li>
              <li>
                <strong>{t("s2.details_label")}</strong>
                {t("s2.details_text")}
              </li>
              <li>
                <strong>{t("s2.session_label")}</strong>
                {t("s2.session_text")}
              </li>
              <li>
                <strong>{t("s2.consent_label")}</strong>
                {t("s2.consent_text")}
              </li>
              <li>
                <strong>{t("s2.trap_label")}</strong>
                {t("s2.trap_prefix")}
                <strong className="text-foreground">{t("s2.trap_emph")}</strong>
                {t("s2.trap_middle")}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{t("s2.trap_code")}</code>
                {t("s2.trap_suffix")}
              </li>
              <li>
                <strong>{t("s2.survey_label")}</strong>
                {t("s2.survey_prefix")}
                <strong>{t("s2.survey_emph")}</strong>
                {t("s2.survey_suffix")}
              </li>
              <li>
                <strong>{t("s2.anticheat_label")}</strong>
                {t("s2.anticheat_text")}
              </li>
              <li>
                <strong>{t("s2.logs_label")}</strong>
                {t("s2.logs_text")}
              </li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s2.exclusions_label")}</strong>
              {t("s2.exclusions_text")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s3.heading")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-semibold">{t("s3.col_purpose")}</th>
                    <th className="py-2 pr-4 text-left font-semibold">{t("s3.col_basis")}</th>
                    <th className="py-2 text-left font-semibold">{t("s3.col_retention")}</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {PROCESSING_ROW_KEYS.map((rowKey, idx) => (
                    <tr
                      key={rowKey}
                      className={
                        idx < PROCESSING_ROW_KEYS.length - 1 ? "border-b border-border/60" : ""
                      }
                    >
                      <td className="py-2 pr-4">{t(`s3.rows.${rowKey}.purpose`)}</td>
                      <td className="py-2 pr-4">{t(`s3.rows.${rowKey}.basis`)}</td>
                      <td className="py-2">{t(`s3.rows.${rowKey}.retention`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s4.heading")}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("s4.supabase_label")}</strong>
                {t("s4.supabase_text")}
              </li>
              <li>
                <strong>{t("s4.cloudflare_label")}</strong>
                {t("s4.cloudflare_text")}
              </li>
              <li>
                <strong>{t("s4.stripe_label")}</strong>
                {t("s4.stripe_prefix")}
                <strong>{t("s4.stripe_emph")}</strong>
                {t("s4.stripe_middle")}
                <Link to={ROUTES.podpora} className="underline underline-offset-2">
                  {t("s4.stripe_link")}
                </Link>
                {t("s4.stripe_suffix")}
              </li>
              <li>
                <strong>{t("s4.resend_label")}</strong>
                {t("s4.resend_text")}
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s4.no_sell")}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s4.share_label")}</strong>
              {t("s4.share_text")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s4.utm_label")}</strong>
              {t("s4.utm_prefix")}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{t("s4.utm_code")}</code>
              {t("s4.utm_middle")}
              <strong>{t("s4.utm_emph")}</strong>
              {t("s4.utm_suffix")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s5.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s5.intro")}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                {t("s5.right_access_prefix")}
                <strong>{t("s5.right_access_emph")}</strong>
                {t("s5.right_access_suffix")}
              </li>
              <li>
                {t("s5.right_rect_prefix")}
                <strong>{t("s5.right_rect_emph")}</strong>
                {t("s5.right_rect_suffix")}
              </li>
              <li>
                {t("s5.right_erase_prefix")}
                <strong>{t("s5.right_erase_emph")}</strong>
                {t("s5.right_erase_suffix")}
              </li>
              <li>
                {t("s5.right_restrict_prefix")}
                <strong>{t("s5.right_restrict_emph")}</strong>
                {t("s5.right_restrict_suffix")}
              </li>
              <li>
                {t("s5.right_port_prefix")}
                <strong>{t("s5.right_port_emph")}</strong>
                {t("s5.right_port_suffix")}
              </li>
              <li>
                {t("s5.right_object_prefix")}
                <strong>{t("s5.right_object_emph")}</strong>
                {t("s5.right_object_suffix")}
              </li>
              <li>
                {t("s5.right_withdraw_prefix")}
                <strong>{t("s5.right_withdraw_emph")}</strong>
                {t("s5.right_withdraw_suffix")}
              </li>
              <li>
                {t("s5.right_complaint_prefix")}
                <strong>{t("s5.right_complaint_emph")}</strong>
                {t("s5.right_complaint_suffix")}
                <a
                  href="https://dataprotection.gov.sk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {t("s5.complaint_link")}
                </a>
              </li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{t("s5.deadline")}</p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s5.self_service_label")}</strong>
              {t("s5.self_service_prefix")}
              <strong>{t("s5.self_service_emph")}</strong>
              {t("s5.self_service_middle")}
              <code>{t("s5.self_service_code")}</code>
              {t("s5.self_service_suffix")}
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s5.retention_label")}</strong>
              {t("s5.retention_prefix")}
              <code>{t("s5.retention_code")}</code>
              {t("s5.retention_suffix")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s6.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s6.p1_prefix")}
              <strong>{t("s6.p1_emph")}</strong>
              {t("s6.p1_suffix")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s6.p2")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s7.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s7.intro_prefix")}
              <Link to={ROUTES.podpora} className="underline underline-offset-2">
                {t("s7.intro_link")}
              </Link>
              {t("s7.intro_suffix")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("s7.email_label")}</strong>
                {t("s7.email_text")}
              </li>
              <li>
                <strong>{t("s7.name_label")}</strong>
                {t("s7.name_text")}
              </li>
              <li>
                <strong>{t("s7.vat_label")}</strong>
                {t("s7.vat_text")}
              </li>
              <li>
                <strong>{t("s7.billing_label")}</strong>
                {t("s7.billing_text")}
              </li>
              <li>
                <strong>{t("s7.payment_label")}</strong>
                {t("s7.payment_prefix")}
                <strong>{t("s7.payment_emph")}</strong>
                {t("s7.payment_suffix")}
              </li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s7.basis_label")}</strong>
              {t("s7.basis_text")}
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s7.retention_label")}</strong>
              <strong>{t("s7.retention_emph")}</strong>
              {t("s7.retention_suffix")}
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s7.refund_label")}</strong>
              {t("s7.refund_prefix")}
              <strong>{t("s7.refund_emph1")}</strong>
              {t("s7.refund_middle")}
              <strong>{t("s7.refund_emph2")}</strong>
              {t("s7.refund_middle2")}
              <Link to={ROUTES.spravovat} className="underline underline-offset-2">
                {t("s7.refund_link")}
              </Link>
              {t("s7.refund_suffix")}
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s7.public_label")}</strong>
              {t("s7.public_prefix")}
              <Link to={ROUTES.sponzori} className="underline underline-offset-2">
                {t("s7.public_link")}
              </Link>
              {t("s7.public_middle")}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              {t("s7.public_suffix")}
            </p>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              <strong>{t("s7.limit_label")}</strong>
              {t("s7.limit_text")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s8.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s8.intro_prefix")}
              <strong>{t("s8.intro_emph")}</strong>
              {t("s8.intro_middle")}
              <strong>{t("s8.intro_emph2")}</strong>
              {t("s8.intro_middle2")}
              <code>{t("s8.intro_code")}</code>
              {t("s8.intro_suffix")}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("s8.data_label")}</strong>
                {t("s8.data_text")}
              </li>
              <li>
                <strong>{t("s8.access_label")}</strong>
                {t("s8.access_text")}
              </li>
              <li>
                <strong>{t("s8.purpose_label")}</strong>
                {t("s8.purpose_text")}
              </li>
              <li>
                <strong>{t("s8.role_label")}</strong>
                {t("s8.role_prefix")}
                <strong>{t("s8.role_emph1")}</strong>
                {t("s8.role_middle")}
                <strong>{t("s8.role_emph2")}</strong>
                {t("s8.role_middle2")}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{t("s8.role_code")}</code>
                {t("s8.role_suffix")}
              </li>
              <li>
                <strong>{t("s8.basis_label")}</strong>
                {t("s8.basis_text")}
              </li>
              <li>
                <strong>{t("s8.retention_label")}</strong>
                {t("s8.retention_text")}
              </li>
            </ul>
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{t("s8.callout_label")}</strong>
              {t("s8.callout_prefix")}
              <strong>{t("s8.callout_emph")}</strong>
              {t("s8.callout_middle")}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{t("s8.callout_code")}</code>
              {t("s8.callout_suffix")}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s9.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s9.text")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s10.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s10.text")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s11.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s11.prefix")}
              <Link to={ROUTES.cookies} className="underline underline-offset-2">
                {t("s11.link")}
              </Link>
              {t("s11.suffix")}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
