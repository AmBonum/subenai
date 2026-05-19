import { Link } from "@tanstack/react-router";
import { RefreshCw, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDueRetestReminders } from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function RetestDashboardCard() {
  const t = tFor("retest");
  const { data } = useDueRetestReminders();
  const due = (data ?? []).slice(0, 2);

  if (due.length === 0) return null;

  return (
    <Card data-testid="app-dashboard-retest-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4 text-primary" />
          <span data-testid="app-dashboard-retest-card-title">{t("card_title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2" data-testid="app-dashboard-retest-card-list">
          {due.map((r) => {
            const title = r.test?.title ?? r.test_id;
            const days = daysSince(r.last_session_at);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 p-3"
                data-testid={`app-dashboard-retest-card-item-${r.id}`}
              >
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium"
                    data-testid={`app-dashboard-retest-card-item-headline-${r.id}`}
                  >
                    {t("card_item_headline", { title, days })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" asChild data-testid="app-dashboard-retest-card-cta">
            <Link to="/app/retest">
              {t("view_all_cta")}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
