import type { Question } from "@/lib/quiz/bank/questions";

export type AnswerFeedbackState = "correct" | "wrong" | "timeout";
export type AnswerFeedbackMode = "live" | "review";

export function deriveState(question: Question, selectedId: string | null): AnswerFeedbackState {
  if (selectedId === null) return "timeout";
  const picked = question.options.find((o) => o.id === selectedId);
  return picked?.correct ? "correct" : "wrong";
}

// `t` is a tFor("feedback") instance owned by the calling component — this
// keeps locale-subscription in the React render (helper has no hook ties).
export function getHeadline(
  t: (key: string) => string,
  mode: AnswerFeedbackMode,
  state: AnswerFeedbackState,
): string {
  return t(`${mode}_${state}`);
}
