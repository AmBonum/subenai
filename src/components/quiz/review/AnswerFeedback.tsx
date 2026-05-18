import type { Question } from "@/lib/quiz/bank/questions";
import {
  deriveState,
  getHeadline,
  type AnswerFeedbackMode,
} from "@/components/quiz/review/AnswerFeedback.helpers";

interface Props {
  question: Question;
  selectedId: string | null;
  /**
   * `live` — drsnejší motivačný copy bezprostredne po odpovedi v teste.
   * `review` — neutrálne faktické popisky pri prezeraní výsledkov neskôr.
   */
  mode: AnswerFeedbackMode;
}

/**
 * Single source of truth pre vizuál vyhodnotenia jednej otázky.
 * Stateless — všetko derivuje z props. Používa sa v `QuestionCard`
 * (mode="live") aj v post-test review (`mode="review"`).
 */
export function AnswerFeedback({ question, selectedId, mode }: Props) {
  const state = deriveState(question, selectedId);

  const headlineClass =
    state === "timeout"
      ? "text-warning"
      : state === "correct"
        ? "text-success"
        : "text-destructive";

  return (
    <div className="mt-5 animate-fade-in-up rounded-xl border border-border/60 bg-card/60 p-4">
      <div className={`mb-1 text-sm font-bold ${headlineClass}`}>{getHeadline(mode, state)}</div>
      <div className="text-sm text-muted-foreground">{question.explanation}</div>
    </div>
  );
}
