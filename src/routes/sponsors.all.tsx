import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { formatMonthYear } from "@/lib/sponsors";
import { type PublicSponsor } from "./sponsors";
import { SITE_ORIGIN, CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";
const tSponzori = tFor("sponzori");
const PAGE_URL = `${SITE_ORIGIN}/sponsors/all`;
const FETCH_LIMIT = 500;

export const Route = createFileRoute("/sponsors/all")({
  head: () => ({
    meta: [
      { title: tSponzori("head_title_all") },
      { name: "description", content: tSponzori("head_description_all") },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: AllSponsorsPage,
});

function AllSponsorsPage() {
  return <AllSponsorsView fetchSponsors={fetchAllSponsors} />;
}

interface AllSponsorsViewProps {
  fetchSponsors: () => Promise<PublicSponsor[]>;
}

type StatusFilter = "all" | "accepted" | "refunded";

export function AllSponsorsView({ fetchSponsors }: AllSponsorsViewProps) {
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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-8">
          <Link
            to={ROUTES.sponzori}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("vsetci_back")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("vsetci_title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">{t("vsetci_hero")}</p>
        </header>

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
            <label htmlFor="filter-date-from" className="text-xs font-medium text-muted-foreground">
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

        {error ? (
          <ErrorState />
        ) : !all ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyFilterState hasAnyData={all.length > 0} />
        ) : (
          <SponsorsTable sponsors={filtered} totalCount={all.length} />
        )}

        <p className="mt-12 text-center text-xs text-muted-foreground">
          {t("vsetci_footer_note")}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <Footer />
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
    <section className="space-y-4">
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {sponsors.length === totalCount
          ? t("vsetci_count_all", { shown: sponsors.length, total: totalCount })
          : t("vsetci_count_partial", { shown: sponsors.length, total: totalCount })}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
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
      className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground"
    >
      {t("fetch_error")}
    </div>
  );
}

function EmptyFilterState({ hasAnyData }: { hasAnyData: boolean }) {
  const t = tFor("sponzori");
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {hasAnyData ? t("vsetci_empty_filtered") : t("vsetci_empty_none")}
      </p>
    </div>
  );
}

async function fetchAllSponsors(): Promise<PublicSponsor[]> {
  const { data, error } = await supabase
    .from("public_sponsors")
    .select("id, display_name, display_link, display_message, created_at, has_refund")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) throw new Error(`public_sponsors fetch failed: ${error.message}`);
  return (data ?? []) as PublicSponsor[];
}
