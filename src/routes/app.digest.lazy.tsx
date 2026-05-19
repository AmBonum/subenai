import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Calendar, Activity, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import {
  useDigestList,
  useMarkDigestOpened,
  type UserDigest,
} from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

export const Route = createLazyFileRoute("/app/digest")({
  component: DigestPage,
});

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function DigestPage() {
  const t = tFor("digest");
  const listQ = useDigestList();
  const markOpened = useMarkDigestOpened();
  const digests = useMemo(() => listQ.data ?? [], [listQ.data]);
  const latest = digests[0];

  // Auto-mark the latest digest as opened on first render (D3 hybrid:
  // viewing the page = acknowledgement). Avoid re-firing if already opened.
  useEffect(() => {
    if (!latest || latest.opened_at) return;
    markOpened.mutate(latest.id);
    // We intentionally depend only on `latest?.id` to avoid re-firing on
    // each query refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id]);

  return (
    <div className="space-y-6" data-testid="app-digest-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("heading")}
        accentWords={1}
        icon={Sparkles}
        subtitle={t("subheading")}
        testId="app-digest-page-header"
      />

      {digests.length === 0 ? (
        <Card data-testid="app-digest-empty-state">
          <CardContent className="space-y-3 p-8 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold" data-testid="app-digest-empty-title">
              {t("empty_title")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("empty_body")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="app-digest-list">
          {digests.map((d, idx) => (
            <DigestCard key={d.id} digest={d} highlight={idx === 0} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface DigestCardProps {
  digest: UserDigest;
  highlight: boolean;
  t: TFn;
}

function DigestCard({ digest, highlight, t }: DigestCardProps) {
  const sessions = digest.stats.sessions_count ?? 0;
  const completion = digest.stats.completion_rate ?? 0;
  const topId = digest.stats.top_test_id;
  const topTitle = digest.stats.top_test_title;
  const weakest = digest.stats.weakest_question_text;
  const weakestScore = digest.stats.weakest_question_score;

  return (
    <Card
      className={highlight ? "border-primary/30 bg-primary/5" : ""}
      data-testid={`app-digest-card-${digest.id}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base" data-testid={`app-digest-card-period-${digest.id}`}>
          {t("period_label", {
            start: formatDate(digest.period_start),
            end: formatDate(digest.period_end),
          })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-success" />
            <span data-testid={`app-digest-card-sessions-${digest.id}`}>
              {t("stat_sessions", { count: sessions })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span data-testid={`app-digest-card-completion-${digest.id}`}>
              {t("stat_completion_rate", { pct: completion })}
            </span>
          </div>
        </div>

        {topId && topTitle && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 p-3"
            data-testid={`app-digest-card-top-test-${digest.id}`}
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("stat_top_test")}
              </p>
              <p className="truncate text-sm font-medium">{topTitle}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              data-testid={`app-digest-card-top-test-cta-${digest.id}`}
            >
              <Link to="/app/tests/$testId" params={{ testId: topId }}>
                {t("view_test_cta")}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}

        {weakest && (
          <div
            className="rounded-lg border border-border/40 p-3"
            data-testid={`app-digest-card-weakest-${digest.id}`}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("stat_weakest_question")}
            </p>
            <p className="text-sm">{weakest}</p>
            {typeof weakestScore === "number" && (
              <p className="text-xs text-muted-foreground">{weakestScore}%</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
