import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { GraduationCap, ArrowRight, X, Send, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCourseRecommendations,
  useDismissRecommendation,
  useClickRecommendation,
  useMarkRecommendationSent,
  type CourseRecommendation,
} from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function formatRelative(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function reasonLabel(rec: CourseRecommendation, t: TFn): string {
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

export function RecommendationsSection() {
  const t = tFor("recommendations");
  const listQ = useCourseRecommendations();
  const recs = useMemo(() => listQ.data ?? [], [listQ.data]);

  return (
    <div className="space-y-6" data-testid="app-recommendations-root">
      <p className="text-sm text-muted-foreground" data-testid="app-recommendations-subheading">
        {t("subheading")}
      </p>

      {recs.length === 0 ? (
        <Card data-testid="app-recommendations-empty-state">
          <CardContent className="space-y-3 p-8 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold" data-testid="app-recommendations-empty-title">
              {t("empty_title")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("empty_body")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="app-recommendations-list">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  rec: CourseRecommendation;
  t: TFn;
}

function RecommendationCard({ rec, t }: CardProps) {
  const dismiss = useDismissRecommendation();
  const click = useClickRecommendation();
  const markSent = useMarkRecommendationSent();

  const training = rec.training;
  const slug = training?.slug ?? null;
  const minutes = training?.estimated_minutes ?? null;

  const onClickCourse = () => {
    click.mutate(rec.id);
  };

  return (
    <Card data-testid={`app-recommendations-card-${rec.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base" data-testid={`app-recommendations-card-title-${rec.id}`}>
            {training?.title ?? rec.training_id}
          </CardTitle>
          <button
            type="button"
            onClick={() => dismiss.mutate(rec.id)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("dismiss_cta")}
            data-testid={`app-recommendations-card-dismiss-${rec.id}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning"
            data-testid={`app-recommendations-card-reason-${rec.id}`}
          >
            {reasonLabel(rec, t)}
          </span>
          {minutes != null && (
            <span
              className="text-muted-foreground"
              data-testid={`app-recommendations-card-minutes-${rec.id}`}
            >
              {t("minutes_label", { minutes })}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {slug ? (
            <Button
              size="sm"
              variant="outline"
              asChild
              data-testid={`app-recommendations-card-view-${rec.id}`}
            >
              <Link to="/courses/$slug" params={{ slug }} onClick={onClickCourse}>
                {t("view_course_cta")}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : null}

          {rec.sent_at ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-success"
              data-testid={`app-recommendations-card-sent-${rec.id}`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {t("marked_sent", { time: formatRelative(rec.sent_at) })}
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markSent.mutate(rec.id)}
              data-testid={`app-recommendations-card-mark-sent-${rec.id}`}
            >
              <Send className="mr-1 h-3 w-3" />
              {t("mark_sent_cta")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
