import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type TestRow = Database["public"]["Tables"]["tests"]["Row"];

export function seedTest(overrides: Partial<TestRow> = {}): TestRow {
  const n = nextId("test");
  const id = `tst_e2e_${pad(n)}`;
  return {
    id,
    slug: `e2e-test-${n}`,
    share_id: `share_${pad(n, 6)}`,
    owner_id: "prof_e2e_001",
    team_id: null,
    title: `E2E Test ${n}`,
    description: null,
    status: "draft",
    version: 1,
    password_hash: null,
    segmentation: [],
    gdpr_purpose: "research",
    intake_fields: {},
    branches: [],
    notif_config: {},
    anonymize_after_days: null,
    allow_behavioral_tracking: false,
    expires_at: null,
    published_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
