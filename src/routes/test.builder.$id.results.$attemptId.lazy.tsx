import { useCallback, useEffect, useMemo, useState } from "react";
import { createLazyFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RespondentDetailContent } from "@/components/composer/edu/dashboard/RespondentDetailContent";
import { type ResultsDataPayload, type RespondentRow } from "@/lib/edu/types";
import { tFor } from "@/i18n/quiz";

type Phase = "loading" | "ready" | "not_found" | "needs_auth" | "error";

export const Route = createLazyFileRoute("/test/builder/$id/results/$attemptId")({
  component: RespondentDetailPage,
});

function RespondentDetailPage() {
  const { id, attemptId } = useParams({ from: "/test/builder/$id/results/$attemptId" });
  return <RespondentDetailView setId={id} attemptId={attemptId} />;
}

interface Props {
  setId: string;
  attemptId: string;
}

export function RespondentDetailView({ setId, attemptId }: Props) {
  const t = tFor("respondent_detail");
  const tList = tFor("results_page");
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ResultsDataPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/results-data", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ set_id: setId }),
        });
        if (cancelled) return;
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
        if (!cancelled) setPhase("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [setId]);

  // Sibling navigation. Order matches the table's default sort
  // (created_at desc) so ←/→ feels like "next on the list".
  const sortedRows = useMemo<RespondentRow[]>(() => {
    if (!data) return [];
    return [...data.rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [data]);

  const currentIndex = useMemo(
    () => sortedRows.findIndex((r) => r.id === attemptId),
    [sortedRows, attemptId],
  );
  const current = currentIndex >= 0 ? sortedRows[currentIndex] : null;
  const prev = currentIndex > 0 ? sortedRows[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < sortedRows.length - 1 ? sortedRows[currentIndex + 1] : null;

  const goTo = useCallback(
    (row: RespondentRow | null): void => {
      if (!row) return;
      void navigate({
        to: "/test/builder/$id/results/$attemptId",
        params: { id: setId, attemptId: row.id },
      });
    },
    [navigate, setId],
  );

  // Keyboard nav: ← prev, → next. Skipped if a focused element is an
  // input/textarea so typing doesn't hijack arrow keys.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        goTo(prev);
      } else if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        goTo(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, goTo]);

  if (phase === "loading") {
    return <CenteredMessage>{tList("verifying")}</CenteredMessage>;
  }
  if (phase === "needs_auth") {
    // Author hasn't unlocked the set in this browser yet. Bounce them to
    // the parent /results page where the password gate lives.
    return (
      <CenteredMessage tone="warn">
        <h1 className="text-2xl font-bold text-foreground">{tList("heading_gate")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("redirect_to_gate_body")}</p>
        <div className="mt-4">
          <Button asChild>
            <Link
              to="/test/builder/$id/results"
              params={{ id: setId }}
              data-testid="respondent-detail-needs-auth-cta"
            >
              {t("redirect_to_gate_cta")}
            </Link>
          </Button>
        </div>
      </CenteredMessage>
    );
  }
  if (phase === "not_found" || (data && currentIndex < 0)) {
    return (
      <CenteredMessage tone="warn">
        <h1
          data-testid="respondent-detail-not-found-heading"
          className="text-2xl font-bold text-foreground"
        >
          {t("not_found_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("not_found_body")}</p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link
              to="/test/builder/$id/results"
              params={{ id: setId }}
              data-testid="respondent-detail-not-found-back"
            >
              {t("back_to_list")}
            </Link>
          </Button>
        </div>
      </CenteredMessage>
    );
  }
  if (phase === "error" || !data || !current) {
    return (
      <CenteredMessage tone="warn">
        <h1 className="text-2xl font-bold text-foreground">{tList("error_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tList("error_body")}</p>
      </CenteredMessage>
    );
  }

  const timeSec = Math.round(current.total_time_ms / 1000);
  const dateLabel = new Date(current.created_at).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div data-testid="respondent-detail-page" className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 sm:pt-16">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/test/builder/$id/results"
              params={{ id: setId }}
              data-testid="respondent-detail-back-link"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
              {t("back_to_list")}
            </Link>
            <nav
              aria-label={t("sibling_nav_aria")}
              className="inline-flex items-center gap-1"
              data-testid="respondent-detail-sibling-nav"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo(prev)}
                disabled={!prev}
                data-testid="respondent-detail-prev"
                aria-label={t("prev_aria")}
              >
                <ChevronLeft className="size-4" aria-hidden />
                {t("prev_label")}
              </Button>
              <span
                data-testid="respondent-detail-position"
                className="px-2 text-xs tabular-nums text-muted-foreground"
              >
                {t("position", {
                  current: currentIndex + 1,
                  total: sortedRows.length,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo(next)}
                disabled={!next}
                data-testid="respondent-detail-next"
                aria-label={t("next_aria")}
              >
                {t("next_label")}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </nav>
          </div>

          <div>
            <h1
              data-testid="respondent-detail-heading"
              className="text-3xl font-black tracking-tight text-foreground sm:text-4xl"
            >
              {t("heading", { name: current.respondent_name })}
            </h1>
            <p
              data-testid="respondent-detail-subtitle"
              className="mt-2 text-sm text-muted-foreground"
            >
              {t("subtitle", {
                email: current.respondent_email,
                score: current.final_score,
                timeSec,
              })}
              {" · "}
              {dateLabel}
            </p>
          </div>
        </header>

        <div className="mt-10">
          <RespondentDetailContent row={current} />
        </div>
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
