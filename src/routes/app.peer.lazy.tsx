import { createLazyFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { usePeerCard, type PeerCardData } from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

export const Route = createLazyFileRoute("/app/peer")({
  component: PeerPage,
});

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function PeerPage() {
  const t = tFor("peer");
  const peerQ = usePeerCard();
  const data: PeerCardData = peerQ.data ?? { has_data: false };

  return (
    <div className="space-y-6" data-testid="app-peer-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("heading")}
        accentWords={1}
        icon={BarChart3}
        subtitle={t("subheading")}
        testId="app-peer-page-header"
      />

      {!data.has_data && data.reason === "insufficient_cohort" && (
        <Card data-testid="app-peer-empty-cohort">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground" data-testid="app-peer-empty-cohort-body">
              {t("empty_insufficient")}
            </p>
          </CardContent>
        </Card>
      )}

      {!data.has_data && data.reason === "no_user_data" && (
        <Card data-testid="app-peer-empty-user">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground" data-testid="app-peer-empty-user-body">
              {t("empty_no_user")}
            </p>
          </CardContent>
        </Card>
      )}

      {data.has_data && <PeerDetail data={data} t={t} />}

      <p className="text-xs text-muted-foreground" data-testid="app-peer-privacy-note">
        {t("privacy_note")}
      </p>
    </div>
  );
}

interface DetailProps {
  data: PeerCardData;
  t: TFn;
}

function PeerDetail({ data, t }: DetailProps) {
  const percentile = data.user_percentile ?? 0;
  const userScore = Number(data.user_score ?? 0);
  const cohortAvg = Number(data.cohort_avg ?? 0);
  const userAttempts = data.user_attempts ?? 0;
  const cohortSize = data.cohort_size ?? 0;
  const ranks = data.branch_ranks ?? [];

  const maxScore = Math.max(userScore, cohortAvg, 1);

  return (
    <>
      <Card data-testid="app-peer-percentile-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            <span data-testid="app-peer-percentile-headline">
              {t("percentile_headline", { p: percentile })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="app-peer-percentile-body">
            {t("percentile_body", { p: percentile })}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="app-peer-scores-card">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2" data-testid="app-peer-score-row-user">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{t("your_score")}</span>
              <span data-testid="app-peer-score-user-value">
                {userScore}% {t("attempts_suffix", { n: userAttempts })}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (userScore / maxScore) * 100)}%` }}
                data-testid="app-peer-score-user-bar"
              />
            </div>
          </div>
          <div className="space-y-2" data-testid="app-peer-score-row-cohort">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{t("cohort_score")}</span>
              <span data-testid="app-peer-score-cohort-value">
                {cohortAvg}% {t("attempts_suffix", { n: cohortSize })}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-muted-foreground/40"
                style={{ width: `${Math.min(100, (cohortAvg / maxScore) * 100)}%` }}
                data-testid="app-peer-score-cohort-bar"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {ranks.length > 0 && (
        <Card data-testid="app-peer-branches-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base" data-testid="app-peer-branches-heading">
              {t("branch_ranks_heading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" data-testid="app-peer-branches-list">
              {ranks.map((r) => (
                <li
                  key={r.branch_slug}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3 text-sm"
                  data-testid={`app-peer-branch-row-${r.branch_slug}`}
                >
                  <span
                    className="font-medium"
                    data-testid={`app-peer-branch-slug-${r.branch_slug}`}
                  >
                    {r.branch_slug}
                  </span>
                  <span
                    className="text-muted-foreground"
                    data-testid={`app-peer-branch-scores-${r.branch_slug}`}
                  >
                    {r.user_score}% / {r.cohort_score ?? "—"}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
