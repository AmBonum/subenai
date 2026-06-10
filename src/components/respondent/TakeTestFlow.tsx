import { useMemo, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntakeStep } from "@/components/respondent/IntakeStep";
import { QuestionStep } from "@/components/respondent/QuestionStep";
import { getQuestion } from "@/lib/respondent/mock-store";
import {
  startRespondentSession,
  submitRespondentAnswer,
  finalizeRespondentSession,
} from "@/lib/respondent/queries";
import { resolveQuestionOrder } from "@/lib/quiz/shuffle";
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
  // The /t/$shareId route resolves the test via share id; we need it again
  // here to start the Supabase session under the same anonymous identity.
  shareId: string;
  onClose: () => void;
}

export function TakeTestFlow({ test, questionIds, shareId, onClose }: TakeTestFlowProps) {
  const tRoot = tFor("root");
  const tThanks = tFor("thank_you");
  const tErr = tFor("errors");
  const [stage, setStage] = useState<Stage>("intake");
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<
    { question_id: string; value: string; is_correct: boolean | null; time_ms: number }[]
  >([]);
  const [questionStart, setQuestionStart] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // E45 Phase 1 — resolve display order. When the test's
  // question_order_mode is 'random' AND we have a session.id (intake done),
  // shuffle deterministically so a reload mid-take rehydrates the same
  // sequence. Pre-intake (sessionId === null) we keep the DB order so the
  // server-rendered shell doesn't briefly show a leaked random order.
  const orderedQuestionIds = useMemo(
    () => resolveQuestionOrder(questionIds, test.question_order_mode, sessionId),
    [questionIds, test.question_order_mode, sessionId],
  );
  const questions = orderedQuestionIds.map((qid) => getQuestion(qid)).filter(Boolean) as Question[];

  const onIntakeSubmit = async (vals: Record<string, string>, c: boolean) => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { sessionId: id, sessionToken: token } = await startRespondentSession({
        shareId,
        intake: vals,
        consent: c,
      });
      setIntake(vals);
      setSessionId(id);
      setSessionToken(token);
      setQuestionStart(Date.now());
      setStage("questions");
    } catch {
      setSubmitError(tErr("submit_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onAnswer = async (value: string) => {
    if (submitting || !sessionId) return;
    const q = questions[qIdx];
    const time_ms = Date.now() - questionStart;
    const expected = Array.isArray(q.correct)
      ? (q.options?.[q.correct[0]] ?? null)
      : typeof q.correct === "string"
        ? q.correct
        : null;
    const isCorrect = expected ? value === expected : null;
    // Back-navigation can re-answer an already-answered question: replace
    // the record by question_id instead of appending so the array stays
    // deduped and the score denominator stays = question count. An
    // unchanged re-answer skips the server submit entirely.
    const existing = answers.find((a) => a.question_id === q.id);
    const unchanged = existing !== undefined && existing.value === value;
    const next = unchanged
      ? answers
      : [
          ...answers.filter((a) => a.question_id !== q.id),
          { question_id: q.id, value, is_correct: isCorrect, time_ms },
        ];
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (!unchanged) {
        await submitRespondentAnswer({
          sessionId,
          sessionToken,
          questionId: q.id,
          value,
          isCorrect,
          timeMs: time_ms,
        });
        setAnswers(next);
      }
      if (qIdx + 1 < questions.length) {
        setQIdx(qIdx + 1);
        setQuestionStart(Date.now());
      } else {
        const correct = next.filter((a) => a.is_correct).length;
        const score = next.length ? Math.round((correct / next.length) * 100) : 0;
        await finalizeRespondentSession({ sessionId, sessionToken, score });
        setStage("done");
      }
    } catch {
      setSubmitError(tErr("submit_failed"));
    } finally {
      setSubmitting(false);
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
            {submitError && (
              <p
                className="text-sm text-destructive"
                data-testid="respondent-flow-submit-error"
                role="alert"
              >
                {submitError}
              </p>
            )}
          </div>
        )}

        {stage === "questions" && questions[qIdx] && (
          <>
            <QuestionStep
              key={questions[qIdx].id}
              index={qIdx}
              total={questions.length}
              question={questions[qIdx]}
              initialValue={answers.find((a) => a.question_id === questions[qIdx].id)?.value ?? ""}
              isLast={qIdx + 1 === questions.length}
              onPrev={qIdx > 0 ? () => setQIdx(qIdx - 1) : undefined}
              onAnswer={onAnswer}
            />
            {submitError && (
              <p
                className="mt-4 text-sm text-destructive"
                data-testid="respondent-flow-submit-error"
                role="alert"
              >
                {submitError}
              </p>
            )}
          </>
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
