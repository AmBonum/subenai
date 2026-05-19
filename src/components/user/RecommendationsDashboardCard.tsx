import { Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCourseRecommendations,
  type CourseRecommendation,
} from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

function reasonShort(
  rec: CourseRecommendation,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  if (rec.reason_key === "low_score_branch") {
    const score = rec.score_at_rec != null ? Math.round(Number(rec.score_at_rec)) : 0;
    if (rec.branch_slug) {
      return t("reason_low_score", { branch: rec.branch_slug, score });
    }
    return t("reason_low_score_no_branch", { score });
  }
  if (rec.reason_key === "new_content") return t("reason_new_content");
  return t("reason_peer_popular");
}

export function RecommendationsDashboardCard() {
  const t = tFor("recommendations");
  const { data } = useCourseRecommendations();
  const recs = (data ?? []).slice(0, 2);

  if (recs.length === 0) return null;

  return (
    <Card data-testid="app-dashboard-recommendations-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span data-testid="app-dashboard-recommendations-card-title">{t("card_title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2" data-testid="app-dashboard-recommendations-card-list">
          {recs.map((rec) => (
            <li
              key={rec.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 p-3"
              data-testid={`app-dashboard-recommendations-card-item-${rec.id}`}
            >
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium"
                  data-testid={`app-dashboard-recommendations-card-item-title-${rec.id}`}
                >
                  {rec.training?.title ?? rec.training_id}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid={`app-dashboard-recommendations-card-item-reason-${rec.id}`}
                >
                  {reasonShort(rec, t)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            asChild
            data-testid="app-dashboard-recommendations-card-cta"
          >
            <Link to="/app/recommendations">
              {t("view_all_cta")}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
