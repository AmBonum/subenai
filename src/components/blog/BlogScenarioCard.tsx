import { useState } from "react";

import { tFor } from "@/i18n/blog";
import { VisualBlock } from "@/components/quiz/flow/VisualBlock";
import { QUESTIONS } from "@/lib/quiz/bank/questions";
import { cn } from "@/lib/utils";

// Inline interactive scenario embedded in blog articles. Pulls a single
// question from the existing quiz bank and renders it with the same
// visual screenshot + multi-choice options used in the public /test.
// State is local; the choice is not persisted to attempts, the share-id
// score, or any analytics surface. The end-CTA links to the full /test.
//
// Per locked decision #6 in tasks/PLAN-2026-05-19-blog-content-engine.md:
// lightweight, not stateful beyond reveal, no shared state with the
// main quiz, never blocks the article reader.
export function BlogScenarioCard({ questionId }: { questionId: string }) {
  const t = tFor("scenario_card");
  const [picked, setPicked] = useState<string | null>(null);
  const question = QUESTIONS.find((q) => q.id === questionId);

  if (!question) {
    return null;
  }

  const pickedOption = picked ? (question.options.find((o) => o.id === picked) ?? null) : null;
  const isRevealed = picked !== null;

  return (
    <aside
      className="my-12 rounded-xl border border-border bg-card p-6"
      data-testid={`blog-scenario-card-${question.id}`}
    >
      <p
        className="text-xs uppercase tracking-wide text-muted-foreground"
        data-testid={`blog-scenario-card-eyebrow-${question.id}`}
      >
        {t("title")}
      </p>
      <h3
        className="mt-2 text-xl font-semibold"
        data-testid={`blog-scenario-card-prompt-${question.id}`}
      >
        {question.prompt}
      </h3>

      {question.visual && (
        <div className="mt-4" data-testid={`blog-scenario-card-visual-${question.id}`}>
          <VisualBlock visual={question.visual} />
        </div>
      )}

      <ul className="mt-6 space-y-2" data-testid={`blog-scenario-card-options-${question.id}`}>
        {question.options.map((option) => {
          const isThis = picked === option.id;
          const revealCorrect = isRevealed && option.correct;
          const revealWrong = isRevealed && isThis && !option.correct;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => !isRevealed && setPicked(option.id)}
                disabled={isRevealed}
                className={cn(
                  "block w-full rounded-md border px-4 py-3 text-left text-sm transition",
                  !isRevealed && "border-border hover:border-foreground",
                  revealCorrect && "border-green-600 bg-green-50 text-green-900",
                  revealWrong && "border-red-600 bg-red-50 text-red-900",
                  isRevealed && !isThis && !option.correct && "border-border opacity-60",
                )}
                data-testid={`blog-scenario-card-option-${question.id}-${option.id}`}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>

      {isRevealed && pickedOption && (
        <div
          className="mt-6 border-t border-border pt-6"
          data-testid={`blog-scenario-card-explanation-${question.id}`}
        >
          <p className="font-medium">
            {pickedOption.correct ? t("answer_correct") : t("answer_wrong")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
          <a
            href="/test"
            className="mt-4 inline-block text-sm font-medium underline underline-offset-2"
            data-testid={`blog-scenario-card-cta-${question.id}`}
          >
            {t("show_more")}
          </a>
        </div>
      )}
    </aside>
  );
}
