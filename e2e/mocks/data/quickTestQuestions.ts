/**
 * Deterministic 10-question fixture for the `/test` quick-test flow.
 *
 * Shape mirrors `QuickTestQuestionRow` from `src/lib/platform/queries.ts`.
 * Option `b` is the correct answer on every question so specs can drive
 * the full flow by always clicking option-b without conditional logic.
 */

export interface QuickTestQuestionRowFixture {
  id: string;
  type: string;
  prompt: string;
  options: Array<{ id: string; label: string; correct: boolean; severity: string | null }>;
  correct: number[];
  branch_slug: string;
  difficulty: string;
  visual: null;
  order_index: number;
}

function makeQuestion(n: number): QuickTestQuestionRowFixture {
  return {
    id: `fixture-q-${n}`,
    type: "single",
    prompt: `Test question ${n}: which option is correct?`,
    options: [
      { id: "a", label: "Wrong answer A", correct: false, severity: "critical" },
      { id: "b", label: "Correct answer B", correct: true, severity: null },
      { id: "c", label: "Wrong answer C", correct: false, severity: "medium" },
    ],
    correct: [1],
    branch_slug: "phishing",
    difficulty: "easy",
    visual: null,
    order_index: n,
  };
}

export const FIXTURE_QUICK_TEST_QUESTIONS: QuickTestQuestionRowFixture[] = Array.from(
  { length: 10 },
  (_, i) => makeQuestion(i + 1),
);
