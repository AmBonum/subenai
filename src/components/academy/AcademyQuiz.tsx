import { useState } from "react";

import { getQuestionById } from "@/lib/quiz/bank/questions";
import { VisualBlock } from "@/components/quiz/flow/VisualBlock";
import { AnswerFeedback } from "@/components/quiz/review/AnswerFeedback";
import { cn } from "@/lib/utils";

// E55.2 — the w3schools "try-it" moment embedded in an academy lesson via the
// [[quiz:<id>]] shortcode. Reuses the whole quiz engine: the same Visual
// mockups, the same Question bank, and AnswerFeedback for the immediate
// correct/incorrect verdict + explanation. State is local; this is practice,
// not a scored test, so nothing is persisted.

export interface AcademyQuizProps {
  questionId: string;
}

export function AcademyQuiz({ questionId }: AcademyQuizProps) {
  const question = getQuestionById(questionId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!question) {
    return (
      <p
        data-testid="academy-quiz-missing"
        className="my-6 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground"
      >
        Interaktívna otázka „{questionId}" sa nenašla.
      </p>
    );
  }

  const answered = selectedId !== null;

  const optionTone = (optionId: string, correct: boolean) => {
    if (!answered) return "border-border/60 hover:border-primary/60 hover:bg-card";
    if (correct) return "border-success/60 bg-success/10 text-foreground";
    if (optionId === selectedId) return "border-destructive/60 bg-destructive/10 text-foreground";
    return "border-border/40 text-muted-foreground";
  };

  return (
    <div
      data-testid="academy-quiz"
      data-question-id={question.id}
      className="my-8 rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
        Vyskúšaj si to
      </p>
      {question.visual ? <VisualBlock visual={question.visual} /> : null}
      <p className="mb-4 mt-4 font-semibold text-foreground">{question.prompt}</p>

      <div className="grid gap-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid="academy-quiz-option"
            disabled={answered}
            aria-pressed={option.id === selectedId}
            onClick={() => setSelectedId(option.id)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default",
              optionTone(option.id, option.correct),
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {answered ? (
        <div className="mt-4 space-y-3" data-testid="academy-quiz-feedback">
          <AnswerFeedback question={question} selectedId={selectedId} mode="live" />
          <button
            type="button"
            data-testid="academy-quiz-reset"
            onClick={() => setSelectedId(null)}
            className="text-sm font-medium text-primary hover:opacity-80"
          >
            Skúsiť znova
          </button>
        </div>
      ) : null}
    </div>
  );
}
