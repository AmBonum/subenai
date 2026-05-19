import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

/**
 * `seedSession` maps to the `sessions` table (the respondent session row
 * created on test start; `sessions.test_id` references the parent test).
 */
export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

export function seedSession(overrides: Partial<SessionRow> = {}): SessionRow {
  const n = nextId("session");
  return {
    id: `sess_e2e_${pad(n)}`,
    test_id: "tst_e2e_001",
    version: 1,
    respondent_id: null,
    intake_data: {},
    consent_given: true,
    started_at: "2026-05-19T00:00:00.000Z",
    finished_at: null,
    score: null,
    status: "in_progress",
    segment: null,
    ip_hash: null,
    ...overrides,
  };
}
