import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getQuestionTimeLimit, type Question } from "@/lib/quiz/bank/questions";
import { VisualBlock } from "@/components/quiz/flow/VisualBlock";
import { AnswerFeedback } from "@/components/quiz/review/AnswerFeedback";
import { tFor } from "@/i18n/quiz";

interface Props {
  question: Question;
  index: number;
  total: number;
  onAnswer: (optionId: string | null, responseMs: number) => void;
}

export function QuestionCard({ question, index, total, onAnswer }: Props) {
  const t = tFor("take");
  const timeLimit = useMemo(() => getQuestionTimeLimit(question), [question]);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef<number>(Date.now());

  // Reset on question change
  useEffect(() => {
    startedAt.current = Date.now();
    setSecondsLeft(timeLimit);
    setSelected(null);
    setRevealed(false);
    // Mobile UX: carrying focus from the just-clicked option button onto
    // the same DOM-position button of the next question makes "B" look
    // pre-selected; carrying scroll position from a long question onto
    // the next one hides the prompt below the fold. Reset both.
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [question.id, timeLimit]);

  const handleSubmit = useCallback(
    (optionId: string | null) => {
      if (revealed) return;
      const responseMs = Date.now() - startedAt.current;
      setSelected(optionId);
      setRevealed(true);
      // Brief feedback then advance
      window.setTimeout(() => {
        onAnswer(optionId, responseMs);
      }, 1300);
    },
    [revealed, onAnswer],
  );

  // Countdown
  useEffect(() => {
    if (revealed) return;
    if (secondsLeft <= 0) {
      handleSubmit(null);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, revealed, handleSubmit]);

  const progressPct = ((index + 1) / total) * 100;
  const timerWarn = secondsLeft <= 3 && !revealed;

  return (
    <div
      data-testid="quiz-flow-question-card"
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12"
    >
      {/* Progress + timer */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span data-testid="quiz-flow-progress">
              {t("question_progress", { n: index + 1, total })}
            </span>
            <span className="text-primary">{question.category}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-accent-gradient transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div
          data-testid="quiz-flow-timer"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-mono text-lg font-bold tabular-nums ${
            timerWarn
              ? "border-destructive text-destructive animate-pulse-ring"
              : "border-border text-foreground"
          }`}
          aria-label={t("timer_aria", { seconds: secondsLeft })}
        >
          {secondsLeft}
        </div>
      </div>

      {/* Prompt */}
      <h2
        data-testid="quiz-flow-prompt"
        className="text-balance text-2xl font-bold leading-tight sm:text-3xl"
      >
        {question.prompt}
      </h2>

      {/* Visual context */}
      {question.visual && (
        <div className="mt-5">
          <VisualBlock visual={question.visual} />
        </div>
      )}

      {/* Options */}
      <div className="mt-6 grid gap-3">
        {question.options.map((opt) => {
          const isSelected = selected === opt.id;
          const showAsCorrect = revealed && opt.correct;
          const showAsWrong = revealed && isSelected && !opt.correct;
          return (
            <button
              key={opt.id}
              data-testid={`quiz-flow-option-${opt.id}`}
              onClick={() => handleSubmit(opt.id)}
              disabled={revealed}
              className={`group flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-base font-medium transition-all
                ${
                  showAsCorrect
                    ? "border-success bg-success/15 text-foreground"
                    : showAsWrong
                      ? "border-destructive bg-destructive/15 text-foreground"
                      : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/60 hover:bg-card/80"
                }
                ${revealed ? "cursor-default" : "cursor-pointer"}
              `}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/60 text-xs font-bold uppercase text-muted-foreground group-hover:border-primary/60">
                {opt.id}
              </span>
              <span className="flex-1">{opt.label}</span>
              {showAsCorrect && <span aria-hidden>✅</span>}
              {showAsWrong && <span aria-hidden>❌</span>}
            </button>
          );
        })}
      </div>

      {revealed && <AnswerFeedback question={question} selectedId={selected} mode="live" />}
    </div>
  );
}
