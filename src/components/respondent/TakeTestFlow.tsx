import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntakeStep } from "@/components/respondent/IntakeStep";
import { QuestionStep } from "@/components/respondent/QuestionStep";
import { getQuestion, createSession, completeSession } from "@/lib/respondent/mock-store";
import type { Question } from "@/lib/platform/types";
import type { SafeTestProjection } from "@/lib/respondent/take-test.functions";
import { tFor } from "@/i18n/respondent-flow";

type Stage = "intake" | "questions" | "done";

interface TakeTestFlowProps {
  test: SafeTestProjection;
  // Question ids are loaded server-side via the same safe projection — for
  // the mock we pull them from the platform store. AH-11 returns them in
  // the safe projection alongside the test.
  questionIds: string[];
  onClose: () => void;
}

export function TakeTestFlow({ test, questionIds, onClose }: TakeTestFlowProps) {
  const tRoot = tFor("root");
  const tThanks = tFor("thank_you");
  const [stage, setStage] = useState<Stage>("intake");
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [, setConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<
    { question_id: string; value: string; is_correct: boolean | null; time_ms: number }[]
  >([]);
  const [questionStart, setQuestionStart] = useState<number>(0);

  const questions = questionIds.map((qid) => getQuestion(qid)).filter(Boolean) as Question[];

  const onIntakeSubmit = (vals: Record<string, string>, c: boolean) => {
    setIntake(vals);
    setConsent(c);
    const s = createSession(test.id, vals, c);
    setSessionId(s.id);
    setQuestionStart(Date.now());
    setStage("questions");
  };

  const onAnswer = (value: string) => {
    const q = questions[qIdx];
    const time_ms = Date.now() - questionStart;
    const expected = Array.isArray(q.correct)
      ? (q.options?.[q.correct[0]] ?? null)
      : typeof q.correct === "string"
        ? q.correct
        : null;
    const isCorrect = expected ? value === expected : null;
    const next = [...answers, { question_id: q.id, value, is_correct: isCorrect, time_ms }];
    setAnswers(next);
    if (qIdx + 1 < questions.length) {
      setQIdx(qIdx + 1);
      setQuestionStart(Date.now());
    } else if (sessionId) {
      completeSession(sessionId, next);
      setStage("done");
    }
  };

  return (
    <div
      className="min-h-screen bg-[image:var(--gradient-subtle)]"
      data-testid="respondent-flow-root"
    >
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            {tRoot("brand")}
          </span>
          <Badge variant="outline">{test.gdpr_purpose}</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {stage === "intake" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-6">
                <h1 className="text-2xl font-semibold">{test.title}</h1>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </CardContent>
            </Card>
            <IntakeStep intakeFields={test.intake_fields} onSubmit={onIntakeSubmit} />
          </div>
        )}

        {stage === "questions" && questions[qIdx] && (
          <QuestionStep
            index={qIdx}
            total={questions.length}
            question={questions[qIdx]}
            initialValue={answers[qIdx]?.value ?? ""}
            isLast={qIdx + 1 === questions.length}
            onPrev={qIdx > 0 ? () => setQIdx(qIdx - 1) : undefined}
            onAnswer={onAnswer}
          />
        )}

        {stage === "done" && (
          <Card>
            <CardContent
              className="space-y-4 p-8 text-center"
              data-testid="respondent-flow-thank-you"
            >
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="text-2xl font-semibold">{tThanks("title")}</h2>
              <p className="text-sm text-muted-foreground">{tThanks("subtitle")}</p>
              <Button variant="outline" onClick={onClose}>
                {tThanks("close_button")}
              </Button>
              <span className="hidden" data-testid="respondent-flow-intake-summary">
                {Object.values(intake).join(",")}
              </span>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
