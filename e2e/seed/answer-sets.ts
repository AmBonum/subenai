import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type AnswerSetRow = Database["public"]["Tables"]["answer_sets"]["Row"];

export function seedAnswerSet(overrides: Partial<AnswerSetRow> = {}): AnswerSetRow {
  const n = nextId("answer_set");
  return {
    id: `as_e2e_${pad(n)}`,
    name: `E2E Answer Set ${n}`,
    description: null,
    branch_slugs: [],
    author_id: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
