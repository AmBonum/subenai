#!/usr/bin/env node
// AH-9.5 dormant migration script.
//
// Reads the static question bank from src/lib/quiz/bank/questions.ts and
// emits idempotent INSERT statements for the future `questions` and
// `answer_options` tables (defined in AH-1.3 / AH-1.6) plus one
// `quick_test_config` row and ordered `quick_test_questions` link rows.
//
// This script does NOT run during the AH-9 batch. AH-11 invokes it once
// the Supabase schema lands. It is dormant by design — calling it without
// a wired pg client only prints the planned SQL.
//
// Usage (dry-run, default):
//   tsx scripts/migrate-iq-questions-to-db.ts
//
// Usage (real run, AH-11 only):
//   DRY_RUN=0 DATABASE_URL=postgres://... tsx scripts/migrate-iq-questions-to-db.ts
//
// Idempotency: every INSERT uses ON CONFLICT (id) DO NOTHING. Re-running
// the script does not duplicate rows.

import { QUESTIONS, type Question } from "../src/lib/quiz/bank/questions";

const DRY_RUN = process.env.DRY_RUN !== "0";

const QUICK_TEST_CONFIG_ID = "qt_default";

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function questionsInsert(question: Question, order: number): string {
  const branza = "Všeobecný test";
  return [
    "INSERT INTO public.questions (id, branza, difficulty, prompt, order_index)",
    `VALUES (${quoteSqlString(question.id)}, ${quoteSqlString(branza)}, ${quoteSqlString(question.difficulty)}, ${quoteSqlString(question.prompt)}, ${order})`,
    "ON CONFLICT (id) DO NOTHING;",
  ].join(" ");
}

function answerOptionInsert(
  questionId: string,
  optionId: string,
  label: string,
  correct: boolean,
): string {
  return [
    "INSERT INTO public.answer_options (id, question_id, label, is_correct)",
    `VALUES (${quoteSqlString(optionId)}, ${quoteSqlString(questionId)}, ${quoteSqlString(label)}, ${correct})`,
    "ON CONFLICT (id) DO NOTHING;",
  ].join(" ");
}

function quickTestConfigInsert(): string {
  return [
    "INSERT INTO public.quick_test_config (id, visible, title, description, branza, time_seconds, pass_percentage, difficulty)",
    `VALUES (${quoteSqlString(QUICK_TEST_CONFIG_ID)}, true, ${quoteSqlString("Rýchly test bezpečnosti")}, ${quoteSqlString("Otestuj sa za 2 minúty.")}, ${quoteSqlString("Všeobecný test")}, 120, 60, ${quoteSqlString("Ľahká")})`,
    "ON CONFLICT (id) DO NOTHING;",
  ].join(" ");
}

function quickTestQuestionLinkInsert(questionId: string, orderIndex: number): string {
  return [
    "INSERT INTO public.quick_test_questions (quick_test_config_id, question_id, order_index)",
    `VALUES (${quoteSqlString(QUICK_TEST_CONFIG_ID)}, ${quoteSqlString(questionId)}, ${orderIndex})`,
    "ON CONFLICT (quick_test_config_id, question_id) DO NOTHING;",
  ].join(" ");
}

function planStatements(): string[] {
  const out: string[] = [];
  out.push(quickTestConfigInsert());
  QUESTIONS.forEach((q, idx) => {
    out.push(questionsInsert(q, idx));
    q.options.forEach((opt) => {
      out.push(answerOptionInsert(q.id, opt.id, opt.label, opt.correct));
    });
    out.push(quickTestQuestionLinkInsert(q.id, idx));
  });
  return out;
}

async function main(): Promise<void> {
  const statements = planStatements();
  if (DRY_RUN) {
    process.stdout.write(`-- DRY RUN: ${statements.length} statements planned\n`);
    for (const sql of statements) {
      process.stdout.write(`${sql}\n`);
    }
    process.stdout.write("-- End dry run. Set DRY_RUN=0 with DATABASE_URL to execute (AH-11).\n");
    return;
  }
  // Live execution path is wired in AH-11. Until then, fail loudly so the
  // script cannot accidentally run in CI without an explicit migration.
  throw new Error(
    "Live execution not implemented in this epic. AH-11 wires a pg client; until then run with DRY_RUN=1.",
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
