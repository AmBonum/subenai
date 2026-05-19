import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type RespondentRow = Database["public"]["Tables"]["respondents"]["Row"];

export function seedRespondent(overrides: Partial<RespondentRow> = {}): RespondentRow {
  const n = nextId("respondent");
  return {
    id: `resp_e2e_${pad(n)}`,
    email: `respondent-${n}@e2e.test`,
    display_name: `E2E Respondent ${n}`,
    anonymized_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
