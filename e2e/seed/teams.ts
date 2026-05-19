import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];

export function seedTeam(overrides: Partial<TeamRow> = {}): TeamRow {
  const n = nextId("team");
  return {
    id: `team_e2e_${pad(n)}`,
    name: `E2E Team ${n}`,
    owner_id: "prof_e2e_001",
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
