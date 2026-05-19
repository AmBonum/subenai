import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

export function seedQuestion(overrides: Partial<QuestionRow> = {}): QuestionRow {
  const n = nextId("question");
  return {
    id: `q_e2e_${pad(n)}`,
    type: "single",
    prompt: `E2E question ${n}`,
    options: null,
    matrix_rows: null,
    matrix_cols: null,
    correct: null,
    category_id: null,
    branch_slug: null,
    difficulty: null,
    author_id: null,
    status: "draft",
    answer_set_id: null,
    visual: null,
    created_at: "2026-05-19T00:00:00.000Z",
    prompt_en: null,
    prompt_cs: null,
    options_en: null,
    options_cs: null,
    visual_en: null,
    visual_cs: null,
    ...overrides,
  };
}
