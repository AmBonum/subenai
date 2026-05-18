import type { Question } from "@/lib/quiz/bank/questions";
import { tFor } from "@/i18n/quiz";

export type AnswerFeedbackState = "correct" | "wrong" | "timeout";
export type AnswerFeedbackMode = "live" | "review";

export function deriveState(question: Question, selectedId: string | null): AnswerFeedbackState {
  if (selectedId === null) return "timeout";
  const picked = question.options.find((o) => o.id === selectedId);
  return picked?.correct ? "correct" : "wrong";
}

export function getHeadline(mode: AnswerFeedbackMode, state: AnswerFeedbackState): string {
  return tFor("feedback")(`${mode}_${state}`);
}
