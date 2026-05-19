import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { useAnswers, useAnswerSets } from "@/lib/admin/answer-sets-mock-store";
import { tFor } from "@/i18n/questions";

export const Route = createFileRoute("/app/sets/$setId")({
  head: () => ({
    meta: [{ title: "Detail sady · SubenAI" }, { name: "robots", content: "noindex" }],
  }),
  component: UserSetDetailPage,
});

function UserSetDetailPage() {
  const { setId } = Route.useParams();
  const t = tFor("user_set_detail");
  const sets = useAnswerSets();
  const answers = useAnswers();

  const set = useMemo(() => sets.find((s) => s.id === setId), [sets, setId]);

  const correct = useMemo(
    () => answers.filter((a) => a.set_id === setId && a.is_correct),
    [answers, setId],
  );
  const incorrect = useMemo(
    () => answers.filter((a) => a.set_id === setId && !a.is_correct),
    [answers, setId],
  );

  if (!set) {
    return (
      <div className="space-y-4" data-testid="set-detail-root">
        <Button asChild variant="ghost" size="sm" data-testid="set-detail-back-button">
          <Link to="/app/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_button")}
          </Link>
        </Button>
        <Card data-testid="set-detail-not-found">
          <CardContent className="p-8 text-center">
            <p
              className="text-base font-semibold text-foreground"
              data-testid="set-detail-not-found-title"
            >
              {t("not_found_title")}
            </p>
            <p
              className="mt-2 text-sm text-muted-foreground"
              data-testid="set-detail-not-found-description"
            >
              {t("not_found_description", { setId })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="set-detail-root">
      <Button asChild variant="ghost" size="sm" data-testid="set-detail-back-button">
        <Link to="/app/library">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_button")}
        </Link>
      </Button>

      <PageHeader
        eyebrow="Obsah"
        title={set.name}
        accentWords={1}
        subtitle={set.description}
        testId="set-detail-title"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="set-detail-correct-column">
          <CardHeader>
            <CardTitle className="text-base">{t("correct_column")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {correct.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty_correct")}</p>
            ) : (
              <ul className="space-y-2">
                {correct.map((a, idx) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-border/40 bg-card/50 p-3 text-sm"
                    data-testid={`set-detail-correct-row-${idx}`}
                  >
                    <p className="font-medium text-foreground">{a.text}</p>
                    {a.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground">{a.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card data-testid="set-detail-incorrect-column">
          <CardHeader>
            <CardTitle className="text-base">{t("incorrect_column")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incorrect.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty_incorrect")}</p>
            ) : (
              <ul className="space-y-2">
                {incorrect.map((a, idx) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-border/40 bg-card/50 p-3 text-sm"
                    data-testid={`set-detail-incorrect-row-${idx}`}
                  >
                    <p className="font-medium text-foreground">{a.text}</p>
                    {a.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground">{a.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
