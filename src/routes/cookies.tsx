import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/useConsent";
import { CONSENT_VERSION } from "@/lib/consent";
import { tFor } from "@/i18n/legal";

const tCookies = tFor("cookies");

const COOKIE_ROW_KEYS = ["consent", "supabase", "prefs", "analytics", "marketing"] as const;

const STRIPE_ROW_KEYS = ["stripe_mid", "stripe_sid", "stripe_m", "stripe_test"] as const;

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: tCookies("meta_title") },
      { name: "description", content: tCookies("meta_description") },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const { openPreferences, record } = useConsent();
  const t = tFor("cookies");

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link
            to="/"
            data-testid="cookies-back-home"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("back_home")}
          </Link>
          <h1
            data-testid="cookies-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("title")}
          </h1>
          <p data-testid="cookies-version-line" className="mt-2 text-sm text-muted-foreground">
            {t("version_line", { version: CONSENT_VERSION })}
          </p>
        </header>

        <article className="prose prose-sm max-w-none space-y-6 text-foreground prose-headings:text-foreground prose-a:text-primary">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s1.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s1.prefix")}
              <code>{t("s1.code1")}</code>
              {t("s1.middle1")}
              <code>{t("s1.code2")}</code>
              {t("s1.middle2")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s2.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s2.intro")}</p>

            <div data-testid="cookies-category-table-wrapper" className="overflow-x-auto">
              <table
                data-testid="cookies-category-table"
                className="w-full border-collapse text-sm"
              >
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-semibold">{t("s2.col_category")}</th>
                    <th className="py-2 pr-4 text-left font-semibold">{t("s2.col_key")}</th>
                    <th className="py-2 pr-4 text-left font-semibold">{t("s2.col_purpose")}</th>
                    <th className="py-2 text-left font-semibold">{t("s2.col_duration")}</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {COOKIE_ROW_KEYS.map((rowKey) => (
                    <tr key={rowKey} className="border-b border-border/60">
                      <td className="py-2 pr-4">{t(`s2.rows.${rowKey}.category`)}</td>
                      <td className="py-2 pr-4">
                        <code>{t(`s2.rows.${rowKey}.key`)}</code>
                      </td>
                      <td className="py-2 pr-4">{t(`s2.rows.${rowKey}.purpose`)}</td>
                      <td className="py-2">{t(`s2.rows.${rowKey}.duration`)}</td>
                    </tr>
                  ))}
                  {STRIPE_ROW_KEYS.map((rowKey, idx) => (
                    <tr
                      key={rowKey}
                      className={
                        idx < STRIPE_ROW_KEYS.length - 1 ? "border-b border-border/60" : ""
                      }
                    >
                      {idx === 0 ? (
                        <td className="py-2 pr-4" rowSpan={STRIPE_ROW_KEYS.length}>
                          {t("s2.stripe_category_prefix")}
                          <code>{t("s2.stripe_category_code")}</code>
                          {t("s2.stripe_category_suffix")}
                        </td>
                      ) : null}
                      <td className="py-2 pr-4">
                        <code>{t(`s2.rows.${rowKey}.key`)}</code>
                      </td>
                      <td className="py-2 pr-4">{t(`s2.rows.${rowKey}.purpose`)}</td>
                      <td className="py-2">{t(`s2.rows.${rowKey}.duration`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s3.heading")}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>{t("s3.supabase_label")}</strong>
                {t("s3.supabase_text")}
              </li>
              <li>
                <strong>{t("s3.stripe_label")}</strong>
                {t("s3.stripe_prefix")}
                <code>{t("s3.stripe_code1")}</code>
                {t("s3.stripe_mid1")}
                <code>{t("s3.stripe_code2")}</code>
                {t("s3.stripe_mid2")}
                <code>{t("s3.stripe_code3")}</code>
                {t("s3.stripe_mid3")}
                <code>{t("s3.stripe_code4")}</code>
                {t("s3.stripe_mid4")}
                <code>{t("s3.stripe_code5")}</code>
                {t("s3.stripe_suffix")}
              </li>
              <li>
                <strong>{t("s3.cloudflare_label")}</strong>
                {t("s3.cloudflare_text")}
              </li>
              <li>
                <strong>{t("s3.future_emph")}</strong>
                {t("s3.future_prefix")}
                <strong>{t("s3.future_emph2")}</strong>
                {t("s3.future_suffix")}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s4.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("s4.intro")}</p>
            <div className="pt-2">
              <Button data-testid="cookies-manage-button" onClick={openPreferences}>
                {t("s4.button")}
              </Button>
            </div>
            {record ? (
              <p data-testid="cookies-last-consent" className="pt-2 text-xs text-muted-foreground">
                {t("s4.last_consent", {
                  timestamp: new Date(record.timestamp).toLocaleString("sk-SK"),
                  version: record.version,
                })}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s5.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s5.prefix")}
              <code>{t("s5.code")}</code>
              {t("s5.suffix")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s6.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s6.prefix")}
              <code>{t("s6.code")}</code>
              {t("s6.suffix")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t("s7.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("s7.prefix")}
              <Link
                to="/privacy"
                data-testid="cookies-privacy-link"
                className="underline underline-offset-2"
              >
                {t("s7.link")}
              </Link>
              {t("s7.suffix")}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
