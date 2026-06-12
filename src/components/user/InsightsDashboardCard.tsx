import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, type LucideIcon } from "lucide-react";
import { BarChart3, GraduationCap, RefreshCw, Calendar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useLatestDigest,
  useCourseRecommendations,
  useDueRetestReminders,
  usePeerCard,
} from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

type InsightsTab = "digest" | "recommendations" | "retest" | "peer";

interface RowDef {
  tab: InsightsTab;
  icon: LucideIcon;
  summary: string;
}

// M4 — single compact "Pre teba" rail replacing the four separate
// retention dashboard cards (digest / recommendations / retest / peer).
// One row per loop that has data; the card hides entirely when none do.
export function InsightsDashboardCard() {
  const t = tFor("insights");
  const digestQ = useLatestDigest();
  const recsQ = useCourseRecommendations();
  const retestQ = useDueRetestReminders();
  const peerQ = usePeerCard();

  const rows: RowDef[] = [];

  const digest = digestQ.data;
  if (digest) {
    rows.push({
      tab: "digest",
      icon: Calendar,
      summary: t("rail.digest", { count: digest.stats.sessions_count ?? 0 }),
    });
  }

  const recs = recsQ.data ?? [];
  if (recs.length > 0) {
    rows.push({
      tab: "recommendations",
      icon: GraduationCap,
      summary: t("rail.recommendations", { count: recs.length }),
    });
  }

  const due = retestQ.data ?? [];
  if (due.length > 0) {
    rows.push({
      tab: "retest",
      icon: RefreshCw,
      summary: t("rail.retest", { count: due.length }),
    });
  }

  const peer = peerQ.data;
  if (peer?.has_data && peer.user_percentile != null) {
    rows.push({
      tab: "peer",
      icon: BarChart3,
      summary: t("rail.peer", { p: peer.user_percentile }),
    });
  }

  if (rows.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="app-dashboard-insights-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          <span data-testid="app-dashboard-insights-card-title">{t("rail.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2" data-testid="app-dashboard-insights-card-list">
          {rows.map(({ tab, icon: Icon, summary }) => (
            <li key={tab}>
              <Link
                to="/app/insights"
                search={{ tab }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/60 p-3 text-sm transition hover:border-primary/40"
                data-testid={`app-dashboard-insights-card-link-${tab}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span
                    className="truncate"
                    data-testid={`app-dashboard-insights-card-summary-${tab}`}
                  >
                    {summary}
                  </span>
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
