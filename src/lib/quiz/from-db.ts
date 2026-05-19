// Maps the `get_quick_test_questions` RPC row shape to the `Question`
// shape that QuestionCard / TestFlow consume. The DB does not yet
// carry an `explanation` column (AH-11.5b.1 seeded prompts + options
// + visual + correct only), so the mapper substitutes an empty
// string. The full bank — including explanations — stays in
// `src/lib/quiz/bank/questions.ts` for composer, test-packs, and
// `/tests/$slug` until a later epic migrates those onto the DB.

import type { Category, Difficulty, Option, Question, Visual } from "@/lib/quiz/bank/questions";
import type { QuickTestQuestionRow } from "@/lib/platform/queries";

const CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  "phishing",
  "url",
  "fake_vs_real",
  "scenario",
  "honeypot",
]);

const DIFFICULTIES: ReadonlySet<Difficulty> = new Set<Difficulty>(["easy", "medium", "hard"]);

function toCategory(slug: string): Category {
  return CATEGORIES.has(slug as Category) ? (slug as Category) : "scenario";
}

function toDifficulty(d: string): Difficulty {
  return DIFFICULTIES.has(d as Difficulty) ? (d as Difficulty) : "medium";
}

// `options` from the seed already carries `correct: boolean` + `severity`
// per option. `correct: [idx]` is redundant when the option's `correct`
// flag is honest, but we honor it as the source of truth and re-apply
// it onto the option array — defensive against future seed drift.
function applyCorrect(options: Option[], correctIdx: number[]): Option[] {
  if (!correctIdx.length) return options;
  const set = new Set(correctIdx);
  return options.map((o, i) => ({ ...o, correct: set.has(i) || o.correct }));
}

export function mapDbRowToQuestion(row: QuickTestQuestionRow): Question {
  const options = applyCorrect(row.options, row.correct);
  const category = toCategory(row.branch_slug);
  const question: Question = {
    id: row.id,
    category,
    difficulty: toDifficulty(row.difficulty),
    prompt: row.prompt,
    options,
    explanation: "",
  };
  if (row.visual) {
    question.visual = row.visual;
  } else {
    // Text-only scam scenarios — VisualBlock renders nothing when
    // `visual` is undefined, so omit rather than fabricating one.
    // (~88 of 238 seeded rows have NULL visual.)
  }
  return question;
}

export function mapDbRowsToQuestions(rows: QuickTestQuestionRow[]): Question[] {
  return rows.map(mapDbRowToQuestion);
}

// Re-export the Visual type for callers that need to declare jsonb
// payloads from the DB.
export type { Visual };
