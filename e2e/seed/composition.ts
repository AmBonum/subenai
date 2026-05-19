import { seedQuestion, type QuestionRow } from "./questions";
import { seedTest, type TestRow } from "./tests";

export interface SeedTestWithQuestionsOptions {
  testOverrides?: Partial<TestRow>;
  questionOverrides?: Partial<QuestionRow>;
}

/**
 * Seed a parent `tests` row plus `count` question rows. Returns both so
 * a caller can feed `tables: { tests: [test], questions, test_questions }`
 * into `mockSupabase`. The link rows are intentionally NOT generated —
 * specs that exercise `test_questions` build them inline so they can
 * pick the `position` order explicitly.
 */
export function seedTestWithQuestions(
  count: number,
  opts: SeedTestWithQuestionsOptions = {},
): { test: TestRow; questions: QuestionRow[] } {
  const test = seedTest(opts.testOverrides);
  const questions = Array.from({ length: count }, () => seedQuestion(opts.questionOverrides));
  return { test, questions };
}
