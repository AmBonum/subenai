import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLatestDigest } from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

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

export function DigestDashboardCard() {
  const t = tFor("digest");
  const { data: digest } = useLatestDigest();

  // Silent on the dashboard when no digest exists yet (per D3 hybrid —
  // /app/digest is the only surface that shows an empty state).
  if (!digest) return null;

  const sessions = digest.stats.sessions_count ?? 0;
  const topTitle = digest.stats.top_test_title;

  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="app-dashboard-digest-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          <span data-testid="app-dashboard-digest-card-title">{t("heading")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p
            className="text-sm text-muted-foreground"
            data-testid="app-dashboard-digest-card-period"
          >
            {t("period_label", {
              start: formatDate(digest.period_start),
              end: formatDate(digest.period_end),
            })}
          </p>
          <p className="text-sm font-medium" data-testid="app-dashboard-digest-card-summary">
            {t("stat_sessions", { count: sessions })}
            {topTitle ? ` · ${topTitle}` : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" asChild data-testid="app-dashboard-digest-card-cta">
          <Link to="/app/digest">
            {t("view_test_cta")}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
