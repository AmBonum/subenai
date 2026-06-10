import { useEffect, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Lock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { AppPageExplainer } from "@/components/user/AppPageExplainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { tFor } from "@/i18n/quiz";

export const Route = createLazyFileRoute("/app/edu-tests/")({
  component: EduTestsList,
});

interface ClaimedSet {
  id: string;
  creator_label: string | null;
  passing_threshold: number;
  question_count: number;
  collects_responses: boolean;
  created_at: string;
  attempts_count: number;
  last_attempt_at: string | null;
}

type Phase = "loading" | "ready" | "error" | "unauthenticated";

// Exported for unit tests. The route wrapper (createLazyFileRoute)
// references it as the route component; tests render it directly.
export function EduTestsList() {
  const t = tFor("edu_tests_list");
  const { isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sets, setSets] = useState<ClaimedSet[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPhase("unauthenticated");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("list_my_test_sets");
        if (cancelled) return;
        if (error) {
          setPhase("error");
          return;
        }
        setSets((data ?? []) as ClaimedSet[]);
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (phase === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("heading")} subtitle={t("description")} />
        <p data-testid="edu-tests-loading" className="text-sm text-muted-foreground">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (phase === "unauthenticated") {
    // Belt-and-braces — useAuth on /app should redirect, but if a tester
    // hits this view directly we render a deterministic empty state
    // rather than blowing up with an RLS-denied list_my_test_sets call.
    return (
      <div className="space-y-6">
        <PageHeader title={t("heading")} />
        <Card>
          <CardContent className="py-10 text-center">
            <Lock className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p
              data-testid="edu-tests-unauthenticated"
              className="mt-3 text-sm text-muted-foreground"
            >
              {t("unauthenticated")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("heading")} />
        <Card>
          <CardContent className="py-10 text-center">
            <p data-testid="edu-tests-error" className="text-sm text-muted-foreground">
              {t("error")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("heading")} subtitle={t("description")} />
        <Card>
          <CardContent className="py-10 text-center">
            <p data-testid="edu-tests-empty" className="text-sm text-muted-foreground">
              {t("empty_body")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("empty_hint")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("heading")} subtitle={t("description")} />
      <AppPageExplainer pageKey="edu_tests" />
      <ul data-testid="edu-tests-list" className="space-y-3">
        {sets.map((s) => (
          <li key={s.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3
                    data-testid={`edu-tests-item-${s.id}`}
                    className="text-base font-semibold text-foreground"
                  >
                    {s.creator_label?.trim() || t("untitled_label")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("meta_line", {
                      questions: s.question_count,
                      threshold: s.passing_threshold,
                      attempts: s.attempts_count,
                    })}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/test/builder/$id/results"
                    params={{ id: s.id }}
                    data-testid={`edu-tests-open-${s.id}`}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    {t("open")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
