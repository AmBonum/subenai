import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntakeStep } from "@/components/respondent/IntakeStep";
import { QuestionStep } from "@/components/respondent/QuestionStep";
import {
  startRespondentSession,
  submitRespondentAnswer,
  finalizeRespondentSession,
} from "@/lib/respondent/queries";
import {
  loadRespondentSession,
  saveRespondentSession,
  clearRespondentSession,
} from "@/lib/respondent/session-storage";
import { resolveQuestionOrder } from "@/lib/quiz/shuffle";
import type { Question } from "@/lib/platform/types";
import type { SafeTestProjection } from "@/lib/respondent/take-test.functions";
import { tFor } from "@/i18n/respondent-flow";

type Stage = "intake" | "questions" | "done";

interface TakeTestFlowProps {
  test: SafeTestProjection;
  // Resolved server-side via get_respondent_test_by_share_id (AH-14). The
  // route fetches { test, questions } in one RPC and passes the ordered
  // question set straight through.
  questions: Question[];
  // The /t/$shareId route resolves the test via share id; we need it again
  // here to start the Supabase session under the same anonymous identity.
  shareId: string;
  onClose: () => void;
}

export function TakeTestFlow({
  test,
  questions: resolvedQuestions,
  shareId,
  onClose,
}: TakeTestFlowProps) {
  const tRoot = tFor("root");
  const tThanks = tFor("thank_you");
  const tErr = tFor("errors");
  // Mid-take reload resumes the saved in-progress session for this
  // shareId (sessionStorage — dies with the tab, see session-storage.ts).
  // Lazy initializer: read exactly once per mount.
  const [restored] = useState(() => loadRespondentSession(shareId));
  const [stage, setStage] = useState<Stage>(restored ? "questions" : "intake");
  const [intake, setIntake] = useState<Record<string, string>>(restored?.intake ?? {});
  const [sessionId, setSessionId] = useState<string | null>(restored?.sessionId ?? null);
  const [sessionToken, setSessionToken] = useState<string | null>(restored?.sessionToken ?? null);
  const [qIdx, setQIdx] = useState(() =>
    restored ? Math.max(0, Math.min(restored.qIdx, restored.questionOrder.length - 1)) : 0,
  );
  const [answers, setAnswers] = useState<
    { question_id: string; value: string; is_correct: boolean | null; time_ms: number }[]
  >(restored?.answers ?? []);
  const [questionStart, setQuestionStart] = useState<number>(() => (restored ? Date.now() : 0));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // E45 Phase 1 — resolve display order. When the test's
  // question_order_mode is 'random' AND we have a session.id (intake done),
  // shuffle deterministically by session id. Pre-intake (sessionId === null)
  // we keep the DB order so the server-rendered shell doesn't briefly show
  // a leaked random order. On resume the order saved in sessionStorage wins
  // (it survives author-side reordering mid-take); questions the author
  // added after the session started are appended, removed ones drop out via
  // the byId lookup.
  const questions = useMemo(() => {
    const byId = new Map(resolvedQuestions.map((q) => [q.id, q]));
    const derived = resolveQuestionOrder(
      resolvedQuestions.map((q) => q.id),
      test.question_order_mode,
      sessionId,
    );
    const order = restored
      ? [...restored.questionOrder, ...derived.filter((id) => !restored.questionOrder.includes(id))]
      : derived;
    return order.map((qid) => byId.get(qid)).filter(Boolean) as Question[];
  }, [resolvedQuestions, test.question_order_mode, sessionId, restored]);

  const persistProgress = (
    idx: number,
    ans: { question_id: string; value: string; is_correct: boolean | null; time_ms: number }[],
  ) => {
    if (!sessionId) return;
    saveRespondentSession(shareId, {
      sessionId,
      sessionToken,
      intake,
      answers: ans,
      qIdx: idx,
      questionOrder: questions.map((q) => q.id),
    });
  };

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
      // Snapshot the freshly-started session so a reload resumes it
      // (sessionId state isn't committed yet — use the local values).
      saveRespondentSession(shareId, {
        sessionId: id,
        sessionToken: token,
        intake: vals,
        answers: [],
        qIdx: 0,
        questionOrder: resolveQuestionOrder(
          resolvedQuestions.map((q) => q.id),
          test.question_order_mode,
          id,
        ),
      });
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
        persistProgress(qIdx + 1, next);
      } else {
        const correct = next.filter((a) => a.is_correct).length;
        const score = next.length ? Math.round((correct / next.length) * 100) : 0;
        await finalizeRespondentSession({ sessionId, sessionToken, score });
        clearRespondentSession(shareId);
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
                <h1 className="text-2xl font-semibold" data-testid="respondent-flow-test-title">
                  {test.title}
                </h1>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="respondent-flow-test-description"
                >
                  {test.description}
                </p>
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
              onPrev={
                qIdx > 0
                  ? () => {
                      setQIdx(qIdx - 1);
                      persistProgress(qIdx - 1, answers);
                    }
                  : undefined
              }
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
              <h2 className="text-2xl font-semibold" data-testid="respondent-flow-thank-you-title">
                {tThanks("title")}
              </h2>
              <p
                className="text-sm text-muted-foreground"
                data-testid="respondent-flow-thank-you-subtitle"
              >
                {tThanks("subtitle")}
              </p>
              {/* Respondents never see a score here by design (results
                  belong to the test author) — so the exit offers the
                  public quick test as a next step instead of a bare
                  close-to-homepage dead end. */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <Button asChild data-testid="respondent-flow-thank-you-quick-test-cta">
                  <Link to="/test">{tThanks("quick_test_cta")}</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  data-testid="respondent-flow-thank-you-close-button"
                >
                  {tThanks("close_button")}
                </Button>
              </div>
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
