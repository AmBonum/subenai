import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePeerCard, useShareHandle, type PeerCardData } from "@/lib/platform/retention-queries";
import { PeerShareView } from "@/components/user/PeerShareView";
import { tFor } from "@/i18n/app-shell";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function PeerSection() {
  const t = tFor("peer");
  const peerQ = usePeerCard();
  const data: PeerCardData = peerQ.data ?? { has_data: false };

  return (
    <div className="space-y-6" data-testid="app-peer-root">
      <p className="text-sm text-muted-foreground" data-testid="app-peer-subheading">
        {t("subheading")}
      </p>

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
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" data-testid="app-peer-percentile-body">
            {t("percentile_body", { p: percentile })}
          </p>
          <PeerShareButton data={data} t={t} />
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

function PeerShareButton({ data, t }: DetailProps) {
  const shareViewRef = useRef<HTMLDivElement>(null);
  const handleQ = useShareHandle();
  const [busy, setBusy] = useState(false);

  const onDownload = async () => {
    if (!shareViewRef.current || busy) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shareViewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        width: 1200,
        height: 630,
      });
      const link = document.createElement("a");
      link.download = `subenai-porovnanie-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(t("share.downloaded"));
    } catch {
      toast.error(t("share.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={onDownload}
        disabled={busy}
        data-testid="app-peer-share-download"
      >
        <Download className="mr-2 h-4 w-4" />
        {busy ? t("share.generating") : t("share.download")}
      </Button>
      <div
        ref={shareViewRef}
        aria-hidden
        style={{
          position: "absolute",
          left: -9999,
          top: -9999,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <PeerShareView data={data} handle={handleQ.data ?? null} />
      </div>
    </>
  );
}
