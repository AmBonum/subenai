import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { AuthorPasswordGate } from "@/components/composer/edu/dashboard/AuthorPasswordGate";
import { AggregateStats } from "@/components/composer/edu/dashboard/AggregateStats";
import { RespondentsTable } from "@/components/composer/edu/dashboard/RespondentsTable";
import { rowsToCsv, type ResultsDataPayload } from "@/lib/edu/types";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/quiz";

type Phase = "loading" | "needs_auth" | "ready" | "error" | "not_found";

export const Route = createFileRoute("/test/zostava/$id/vysledky")({
  head: () => {
    const t = tFor("results_page");
    return {
      meta: [{ title: t("meta_title") }, { name: "robots", content: "noindex, nofollow" }],
    };
  },
  component: VysledkyPage,
});

function VysledkyPage() {
  const { id } = useParams({ from: "/test/zostava/$id/vysledky" });
  return <VysledkyView id={id} />;
}

interface Props {
  id: string;
}

export function VysledkyView({ id }: Props) {
  const t = tFor("results_page");
  const tCommon = tFor("common");
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ResultsDataPayload | null>(null);

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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = (data.creator_label ?? "edu-test").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    link.download = `${slug || "edu-test"}-${id.slice(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-md px-4 pb-12 pt-12 sm:pt-16">
          <header>
            <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
              ← {tCommon("back_home")}
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {t("heading_gate")}
            </h1>
          </header>
          <div className="mt-8">
            <AuthorPasswordGate setId={id} onAuthenticated={() => void fetchData()} />
          </div>
          <Footer />
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 sm:pt-16">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
              ← {tCommon("back_home")}
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {data.creator_label?.trim() || t("heading_default")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("meta_line", {
                count: data.question_count,
                threshold: data.passing_threshold,
                respondents: data.stats.count,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadCsv} disabled={data.rows.length === 0}>
              {t("download_csv")}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              {t("logout")}
            </Button>
          </div>
        </header>

        <div className="mt-8 space-y-8">
          <AggregateStats stats={data.stats} />
          <RespondentsTable
            rows={data.rows}
            passingThreshold={data.passing_threshold}
            onDelete={handleDelete}
          />
        </div>

        <Footer />
      </main>
    </div>
  );
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
