import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/useConsent";
import { CONSENT_VERSION } from "@/lib/consent";
import { ROUTES } from "@/config/routes";
import { DocTocSidebar, type DocTocItem } from "@/components/layout/DocTocSidebar";
import { SmartBackLink } from "@/components/layout/SmartBackLink";
import { tFor } from "@/i18n/legal";

const COOKIE_ROW_KEYS = [
  "consent",
  "supabase",
  "locale",
  "prefs",
  "analytics",
  "marketing",
] as const;

const STRIPE_ROW_KEYS = ["stripe_mid", "stripe_sid", "stripe_m", "stripe_test"] as const;

const TOC_ITEMS: DocTocItem[] = [
  { id: "cookies-s1", label: "Čo sú cookies" },
  { id: "cookies-s2", label: "Kategórie" },
  { id: "cookies-s3", label: "Tretie strany" },
  { id: "cookies-s4", label: "Spravovať súhlas" },
  { id: "cookies-s5", label: "Vypnutie cez prehliadač" },
  { id: "cookies-s6", label: "Zmeny zásad" },
  { id: "cookies-s7", label: "Súvisiace dokumenty" },
];

export const Route = createLazyFileRoute("/cookies")({
  component: CookiesPage,
});

function CookiesPage() {
  const { openPreferences, record } = useConsent();
  const t = tFor("cookies");

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <SmartBackLink
            fallbackTo={ROUTES.home}
            backLabel={t("back")}
            fallbackLabel={t("back_home")}
            testId="cookies-back-home"
            className="text-sm text-muted-foreground hover:text-foreground"
          />
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

        {/* `min-w-0` on the article is load-bearing: CSS grid items
            default to `min-width: auto` (= content min-width), so the
            cookies category table (intrinsic ~580 px wide) was forcing
            this column to overflow on 320/375 px viewports. The table
            already has `overflow-x-auto` on its own wrapper at line
            97, but that's a no-op while the parent grid track keeps
            stretching to the table's intrinsic width. `min-w-0` lets
            the column shrink to its grid-track size and the table
            wrapper's own scroll then engages as intended. */}
        <div className="grid gap-10 lg:grid-cols-[1fr_240px]">
          <article className="prose prose-sm min-w-0 max-w-none space-y-6 text-foreground prose-headings:text-foreground prose-a:text-primary">
            <div className="lg:hidden">
              <DocTocSidebar items={TOC_ITEMS} testIdPrefix="cookies" />
            </div>

            <section
              id="cookies-s1"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s1-heading"
              data-testid="cookies-section-s1"
            >
              <h2 id="cookies-s1-heading" className="text-xl font-semibold">
                {t("s1.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("s1.prefix")}
                <code>{t("s1.code1")}</code>
                {t("s1.middle1")}
                <code>{t("s1.code2")}</code>
                {t("s1.middle2")}
              </p>
            </section>

            <section
              id="cookies-s2"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s2-heading"
              data-testid="cookies-section-s2"
            >
              <h2 id="cookies-s2-heading" className="text-xl font-semibold">
                {t("s2.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("s2.intro")}</p>

              <div data-testid="cookies-category-table-wrapper" className="overflow-x-auto">
                <table
                  data-testid="cookies-category-table"
                  className="w-full border-collapse text-sm"
                >
                  <caption className="sr-only">{t("s2.heading")}</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        {t("s2.col_category")}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        {t("s2.col_key")}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        {t("s2.col_purpose")}
                      </th>
                      <th scope="col" className="py-2 text-left font-semibold">
                        {t("s2.col_duration")}
                      </th>
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

            <section
              id="cookies-s3"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s3-heading"
              data-testid="cookies-section-s3"
            >
              <h2 id="cookies-s3-heading" className="text-xl font-semibold">
                {t("s3.heading")}
              </h2>
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

            <section
              id="cookies-s4"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s4-heading"
              data-testid="cookies-section-s4"
            >
              <h2 id="cookies-s4-heading" className="text-xl font-semibold">
                {t("s4.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("s4.intro")}</p>
              <div className="pt-2">
                <Button data-testid="cookies-manage-button" onClick={openPreferences}>
                  {t("s4.button")}
                </Button>
              </div>

              {/* E21.4 — current consent status display: surfaces what's
                  active RIGHT NOW so a reader doesn't have to guess.
                  The "manage" button already exists; this is the visibility
                  half that was missing. */}
              {record ? (
                <div
                  className="mt-4 rounded-xl border border-success/40 bg-success/5 p-4"
                  data-testid="cookies-current-status"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <p
                        data-testid="cookies-last-consent"
                        className="text-xs text-muted-foreground"
                      >
                        {t("s4.last_consent", {
                          timestamp: new Date(record.timestamp).toLocaleString("sk-SK"),
                          version: record.version,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
                  data-testid="cookies-no-record"
                >
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{t("s4.no_record")}</p>
                  </div>
                </div>
              )}
            </section>

            <section
              id="cookies-s5"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s5-heading"
              data-testid="cookies-section-s5"
            >
              <h2 id="cookies-s5-heading" className="text-xl font-semibold">
                {t("s5.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("s5.prefix")}
                <code>{t("s5.code")}</code>
                {t("s5.suffix")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("s5.dnt_note")}</p>
            </section>

            <section
              id="cookies-s6"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s6-heading"
              data-testid="cookies-section-s6"
            >
              <h2 id="cookies-s6-heading" className="text-xl font-semibold">
                {t("s6.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("s6.prefix")}
                <code>{t("s6.code")}</code>
                {t("s6.suffix")}
              </p>
            </section>

            <section
              id="cookies-s7"
              className="scroll-mt-24 space-y-2"
              aria-labelledby="cookies-s7-heading"
              data-testid="cookies-section-s7"
            >
              <h2 id="cookies-s7-heading" className="text-xl font-semibold">
                {t("s7.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("s7.prefix")}
                <Link
                  to={ROUTES.privacy}
                  data-testid="cookies-privacy-link"
                  className="underline underline-offset-2"
                >
                  {t("s7.link")}
                </Link>
                {t("s7.suffix")}
              </p>
            </section>
          </article>

          <aside className="hidden lg:block">
            <DocTocSidebar items={TOC_ITEMS} testIdPrefix="cookies" />
          </aside>
        </div>
      </main>
    </div>
  );
}
