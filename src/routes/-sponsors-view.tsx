// Non-route module (the "-" prefix excludes it from route generation).
// Hosts the merged /sponsors page view (M3: the former latest-5 index and
// the /sponsors/all filterable grid are one page now). The eager
// sponsors.tsx route file stays head()-only while sponsors.lazy.tsx pulls
// this into the route's async chunk.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatMonthYear } from "@/lib/sponsors";
import { CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

export interface PublicSponsor {
  id: string;
  display_name: string;
  display_link: string | null;
  display_message: string | null;
  created_at: string;
  has_refund: boolean;
}

interface SponzoriViewProps {
  fetchSponsors: () => Promise<PublicSponsor[]>;
}

type StatusFilter = "all" | "accepted" | "refunded";

export function SponzoriView({ fetchSponsors }: SponzoriViewProps) {
  const t = tFor("sponzori");
  const [all, setAll] = useState<PublicSponsor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetchSponsors()
      .then((rows) => {
        if (!cancelled) setAll(rows);
      })
      .catch(() => {
        if (!cancelled) setError("fetch_failed");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSponsors]);

  const filtered = useMemo(() => {
    if (!all) return [];
    const q = nameQuery.trim().toLowerCase();
    // Inclusive bounds. dateFrom is 00:00 of the chosen day; dateTo is end-of-day.
    // Parsing as ISO YYYY-MM-DD makes new Date() honor local timezone, which is
    // what the user means when they type "1. mája 2026 — 31. mája 2026".
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return all.filter((s) => {
      if (q) {
        const hay = `${s.display_name} ${s.display_message ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fromTs !== null || toTs !== null) {
        const created = new Date(s.created_at).getTime();
        if (fromTs !== null && created < fromTs) return false;
        if (toTs !== null && created > toTs) return false;
      }
      if (statusFilter === "accepted" && s.has_refund) return false;
      if (statusFilter === "refunded" && !s.has_refund) return false;
      return true;
    });
  }, [all, nameQuery, dateFrom, dateTo, statusFilter]);

  const hasAnyData = (all?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <main
        data-testid="sponzori-index-root"
        className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16"
      >
        <header className="mb-8">
          <Link
            to={ROUTES.home}
            data-testid="sponzori-index-back-link"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("back_home")}
          </Link>
          <h1
            data-testid="sponzori-index-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("title")}
          </h1>
          <p
            data-testid="sponzori-index-hero"
            className="mt-3 text-base text-muted-foreground sm:text-lg"
          >
            {t("hero_prefix")}
            <Link
              to={ROUTES.oProjecte}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("hero_link_about")}
            </Link>
            .
          </p>
        </header>

        {hasAnyData ? (
          <section
            aria-label={t("filters_aria")}
            className="mb-6 grid gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end sm:gap-4 sm:p-5"
          >
            <div>
              <label htmlFor="filter-name" className="text-xs font-medium text-muted-foreground">
                {t("filter_name_label")}
              </label>
              <input
                id="filter-name"
                data-testid="sponzori-vsetci-filter-name"
                type="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={t("filter_name_placeholder")}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label
                htmlFor="filter-date-from"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("filter_date_from")}
              </label>
              <input
                id="filter-date-from"
                data-testid="sponzori-vsetci-filter-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground sm:w-40"
              />
            </div>
            <div>
              <label htmlFor="filter-date-to" className="text-xs font-medium text-muted-foreground">
                {t("filter_date_to")}
              </label>
              <input
                id="filter-date-to"
                data-testid="sponzori-vsetci-filter-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground sm:w-40"
              />
            </div>
            <div>
              <label htmlFor="filter-status" className="text-xs font-medium text-muted-foreground">
                {t("filter_status")}
              </label>
              <select
                id="filter-status"
                data-testid="sponzori-vsetci-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground sm:w-36"
              >
                <option value="all">{t("filter_status_all")}</option>
                <option value="accepted">{t("filter_status_accepted")}</option>
                <option value="refunded">{t("filter_status_refunded")}</option>
              </select>
            </div>
          </section>
        ) : null}

        {error ? (
          <ErrorState />
        ) : !all ? (
          <LoadingState />
        ) : all.length === 0 ? (
          <SponsorsEmpty />
        ) : filtered.length === 0 ? (
          <EmptyFilterState />
        ) : (
          <SponsorsTable sponsors={filtered} totalCount={all.length} />
        )}

        <p
          data-testid="sponzori-index-footer-note"
          className="mt-12 text-center text-xs text-muted-foreground"
        >
          {t("footer_note")}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            data-testid="sponzori-index-footer-mailto"
            className="underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </main>
    </div>
  );
}

function SponsorsTable({
  sponsors,
  totalCount,
}: {
  sponsors: PublicSponsor[];
  totalCount: number;
}) {
  const t = tFor("sponzori");
  return (
    <section data-testid="sponzori-vsetci-results" className="space-y-4">
      <p
        data-testid="sponzori-vsetci-count-status"
        className="text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {sponsors.length === totalCount
          ? t("vsetci_count_all", { shown: sponsors.length, total: totalCount })
          : t("vsetci_count_partial", { shown: sponsors.length, total: totalCount })}
      </p>
      <ul data-testid="sponzori-vsetci-card-list" className="grid gap-3 sm:grid-cols-2">
        {sponsors.map((s) => (
          <li key={s.id} className="space-y-2 rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                className={`text-base font-semibold ${
                  s.has_refund ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {s.display_link ? (
                  <a
                    href={s.display_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline underline-offset-2"
                  >
                    {s.display_name}
                  </a>
                ) : (
                  s.display_name
                )}
              </h2>
              <div className="flex items-baseline gap-2">
                {s.has_refund ? (
                  <span
                    data-testid="sponzori-vsetci-refund-badge"
                    className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-normal text-muted-foreground"
                  >
                    {t("refund_badge")}
                  </span>
                ) : null}
                <time dateTime={s.created_at} className="text-xs text-muted-foreground">
                  {formatMonthYear(s.created_at)}
                </time>
              </div>
            </div>
            {s.has_refund ? (
              <p className="text-xs italic text-muted-foreground/80">{t("vsetci_refund_note")}</p>
            ) : null}
            {s.display_message ? (
              <p className="text-sm leading-relaxed text-muted-foreground">„{s.display_message}"</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadingState() {
  const t = tFor("sponzori");
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border/40 bg-card/40"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  const t = tFor("sponzori");
  return (
    <div
      role="alert"
      data-testid="sponzori-index-error"
      className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground"
    >
      {t("fetch_error")}
    </div>
  );
}

function SponsorsEmpty() {
  const t = tFor("sponzori");
  return (
    <div
      data-testid="sponzori-index-empty"
      className="rounded-2xl border border-border/60 bg-card p-8 text-center"
    >
      <h2
        data-testid="sponzori-index-empty-heading"
        className="text-xl font-semibold text-foreground"
      >
        {t("empty_title")}
      </h2>
      <p
        data-testid="sponzori-index-empty-body"
        className="mt-2 text-sm leading-relaxed text-muted-foreground"
      >
        {t("empty_body")}
      </p>
      <div className="mt-4">
        <Link
          to={ROUTES.podpora}
          data-testid="sponzori-index-empty-cta"
          className="inline-flex items-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow"
        >
          {t("empty_cta")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function EmptyFilterState() {
  const t = tFor("sponzori");
  return (
    <div
      data-testid="sponzori-vsetci-empty"
      className="rounded-2xl border border-border/60 bg-card p-8 text-center"
    >
      <p
        data-testid="sponzori-vsetci-empty-message"
        className="text-sm leading-relaxed text-muted-foreground"
      >
        {t("vsetci_empty_filtered")}
      </p>
    </div>
  );
}
