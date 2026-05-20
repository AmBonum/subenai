import { useCallback, useEffect, useState } from "react";
import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthorPasswordGate } from "@/components/composer/edu/dashboard/AuthorPasswordGate";
import { AggregateStats } from "@/components/composer/edu/dashboard/AggregateStats";
import { ResultsCharts } from "@/components/composer/edu/dashboard/ResultsCharts";
import { RespondentsTable } from "@/components/composer/edu/dashboard/RespondentsTable";
import { rowsToCsv, type RespondentFilters, type ResultsDataPayload } from "@/lib/edu/types";
import { buildPdfData, buildPdfFilename, slugifyForFilename } from "@/lib/edu/pdf-data";
import { ROUTES } from "@/config/routes";
import { SITE_ORIGIN } from "@/config/site";
import { copyToClipboard } from "@/lib/browser/clipboard";
import { tFor } from "@/i18n/quiz";

type Phase = "loading" | "needs_auth" | "ready" | "error" | "not_found";

export const Route = createLazyFileRoute("/test/builder/$id/results")({
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = useParams({ from: "/test/builder/$id/results" });
  const search = useSearch({ from: "/test/builder/$id/results" });
  const navigate = useNavigate({ from: "/test/builder/$id/results" });
  const handleFiltersChange = useCallback(
    (next: RespondentFilters): void => {
      // `validateSearch` strips `undefined` keys so the URL stays clean
      // (`/results` not `/results?pass=&scoreMin=`). Replace, don't push,
      // so the back button still returns to the previous *page* rather
      // than walking back through every filter change.
      void navigate({ search: next, replace: true });
    },
    [navigate],
  );
  return <ResultsView id={id} filters={search} onFiltersChange={handleFiltersChange} />;
}

interface Props {
  id: string;
  filters?: RespondentFilters;
  onFiltersChange?: (next: RespondentFilters) => void;
}

export function ResultsView({ id, filters, onFiltersChange }: Props) {
  const t = tFor("results_page");
  const tCommon = tFor("common");
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ResultsDataPayload | null>(null);
  // E34 Phase 3 (D5) — dashboard-level re-share affordance. RespondentsTable
  // already shows the share URL when rows.length === 0 (PR #52); this
  // adds a persistent 1-click copy button in the dashboard header so an
  // author can re-share to additional team members WITHOUT having to
  // clear the table first. Transient 3s toast confirms the copy.
  const [reshareToast, setReshareToast] = useState<string | null>(null);
  useEffect(() => {
    if (!reshareToast) return;
    const handle = window.setTimeout(() => setReshareToast(null), 3000);
    return () => window.clearTimeout(handle);
  }, [reshareToast]);
  async function handleCopyShareLink(): Promise<void> {
    const ok = await copyToClipboard(`${SITE_ORIGIN}/test/builder/${id}`);
    if (ok) setReshareToast(t("copy_share_link_toast"));
  }

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/results-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ set_id: id }),
      });
      if (response.status === 401 || response.status === 403) {
        setPhase("needs_auth");
        return;
      }
      if (response.status === 404) {
        setPhase("not_found");
        return;
      }
      if (!response.ok) {
        setPhase("error");
        return;
      }
      const payload = (await response.json()) as ResultsDataPayload;
      setData(payload);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(
    async (attemptId: string): Promise<boolean> => {
      const response = await fetch("/api/delete-edu-respondent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ set_id: id, attempt_id: attemptId }),
      });
      if (!response.ok) return false;
      await fetchData();
      return true;
    },
    [id, fetchData],
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/verify-author-password", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ set_id: id }),
    });
    setData(null);
    setPhase("needs_auth");
  }, [id]);

  function downloadCsv() {
    if (!data) return;
    const csv = rowsToCsv(data.rows, data.passing_threshold);
    // Excel-friendly UTF-8 BOM so Slovak diacritics aren't mojibake on
    // double-click.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `${slugifyForFilename(data.creator_label)}-${id.slice(0, 8)}.csv`);
  }

  // E38 Phase E — dynamic import so @react-pdf/renderer (~250 KB)
  // ships as its own chunk that only downloads after the author clicks.
  // Authors who never export pay zero PDF cost on initial load.
  async function downloadPdf() {
    if (!data) return;
    const [{ pdf }, { ResultsPdf }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/edu/pdf-document"),
    ]);
    const pdfData = buildPdfData({
      rows: data.rows,
      stats: data.stats,
      filters: filters ?? {},
      passingThreshold: data.passing_threshold,
      creatorLabel: data.creator_label,
      generatedAt: new Date(),
    });
    const blob = await pdf(<ResultsPdf data={pdfData} />).toBlob();
    triggerDownload(blob, buildPdfFilename(data.creator_label, id));
  }

  function downloadJson() {
    if (!data) return;
    // Pretty-printed for human-readable archives; consumers that need
    // compactness can re-stringify. Privacy header sits in a sibling
    // `_meta` key (JSON has no comment syntax) so a parser still sees
    // valid JSON while readers see the same disclosure as the CSV file.
    const exportPayload = {
      _meta: {
        source: "subenai.sk",
        generated_at: new Date().toISOString(),
        privacy_notice:
          "OBSAHUJE OSOBNÉ ÚDAJE (meno, email respondentov). Spracuj v súlade s GDPR — viď subenai.sk/privacy",
        set_id: data.set_id,
        creator_label: data.creator_label,
        passing_threshold: data.passing_threshold,
        question_count: data.question_count,
      },
      stats: data.stats,
      rows: data.rows,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    triggerDownload(blob, `${slugifyForFilename(data.creator_label)}-${id.slice(0, 8)}.json`);
  }

  if (phase === "loading") {
    return <CenteredMessage>{t("verifying")}</CenteredMessage>;
  }
  if (phase === "not_found") {
    return (
      <CenteredMessage tone="warn">
        <h1 className="text-2xl font-bold text-foreground">{t("not_found_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("not_found_body")}</p>
      </CenteredMessage>
    );
  }
  if (phase === "error") {
    return (
      <CenteredMessage tone="warn">
        <h1 className="text-2xl font-bold text-foreground">{t("error_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("error_body")}</p>
      </CenteredMessage>
    );
  }
  if (phase === "needs_auth") {
    return (
      <div data-testid="vysledky-auth-gate" className="min-h-screen bg-background">
        <main className="mx-auto max-w-md px-4 pb-12 pt-12 sm:pt-16">
          <header>
            <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
              ← {tCommon("back_home")}
            </Link>
            <h1
              data-testid="vysledky-gate-heading"
              className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl"
            >
              {t("heading_gate")}
            </h1>
          </header>
          <div className="mt-8">
            <AuthorPasswordGate setId={id} onAuthenticated={() => void fetchData()} />
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div data-testid="vysledky-dashboard" className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 sm:pt-16">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
              ← {tCommon("back_home")}
            </Link>
            <h1
              data-testid="vysledky-dashboard-heading"
              className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl"
            >
              {/* E34 Phase 2 (C4) — when creator_label is present, frame the
                  page as the team's outcome ("Onboarding Q1 — výsledky tímu")
                  rather than the generic "Výsledky edu testu". Falls back to
                  the generic when label is null. */}
              {data.creator_label?.trim()
                ? t("heading_with_label", { label: data.creator_label.trim() })
                : t("heading_default")}
            </h1>
            <p data-testid="vysledky-meta-line" className="mt-2 text-sm text-muted-foreground">
              {t("meta_line", {
                count: data.question_count,
                threshold: data.passing_threshold,
                respondents: data.stats.count,
              })}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="vysledky-copy-share-link-button"
                variant="outline"
                onClick={() => void handleCopyShareLink()}
                aria-label={t("copy_share_link_aria")}
              >
                <Copy className="size-4" aria-hidden />
                {t("copy_share_link")}
              </Button>
              <Button
                data-testid="vysledky-download-csv-button"
                variant="outline"
                onClick={downloadCsv}
                disabled={data.rows.length === 0}
              >
                {t("download_csv")}
              </Button>
              <Button
                data-testid="vysledky-download-json-button"
                variant="outline"
                onClick={downloadJson}
                disabled={data.rows.length === 0}
              >
                {t("download_json")}
              </Button>
              <Button
                data-testid="vysledky-download-pdf-button"
                variant="outline"
                onClick={() => void downloadPdf()}
                disabled={data.rows.length === 0}
              >
                {t("download_pdf")}
              </Button>
              <Button data-testid="vysledky-logout-button" variant="outline" onClick={handleLogout}>
                {t("logout")}
              </Button>
            </div>
            <p
              data-testid="vysledky-reshare-hint"
              className="text-xs text-muted-foreground sm:text-right"
            >
              {t("reshare_hint")}
            </p>
            {reshareToast ? (
              <p
                data-testid="vysledky-copy-share-link-toast"
                role="status"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:text-right"
              >
                {reshareToast}
              </p>
            ) : null}
          </div>
        </header>

        <div className="mt-8 space-y-8">
          <AggregateStats stats={data.stats} />
          <ResultsCharts stats={data.stats} rows={data.rows} />
          <RespondentsTable
            rows={data.rows}
            passingThreshold={data.passing_threshold}
            onDelete={handleDelete}
            setId={id}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      </main>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CenteredMessage({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
        <div
          className={
            tone === "warn"
              ? "rounded-2xl border border-amber-500/40 bg-card/60 p-6"
              : "text-sm text-muted-foreground"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
