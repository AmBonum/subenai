import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

/**
 * `audience` is the product-facing name for the underlying
 * `respondent_groups` row — a named cohort of recipients an educator
 * targets when sharing a test.
 */
export type AudienceRow = Database["public"]["Tables"]["respondent_groups"]["Row"];

export function seedAudience(overrides: Partial<AudienceRow> = {}): AudienceRow {
  const n = nextId("audience");
  return {
    id: `aud_e2e_${pad(n)}`,
    name: `E2E Audience ${n}`,
    description: null,
    owner_id: "prof_e2e_001",
    member_emails: [],
    tags: [],
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
