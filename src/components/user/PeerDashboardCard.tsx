import { Link } from "@tanstack/react-router";
import { BarChart3, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePeerCard } from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

export function PeerDashboardCard() {
  const t = tFor("peer");
  const { data } = usePeerCard();

  if (!data?.has_data || data.user_percentile == null) return null;

  const p = data.user_percentile;

  return (
    <Card data-testid="app-dashboard-peer-card">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" data-testid="app-dashboard-peer-card-headline">
              {t("percentile_headline", { p })}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="app-dashboard-peer-card-body">
              {t("percentile_body", { p })}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" asChild data-testid="app-dashboard-peer-card-cta">
          <Link to="/app/peer">
            {t("dashboard_card_label")}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
