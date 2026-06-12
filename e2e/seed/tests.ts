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
    // E45 Phase 1 + 2 columns. `password_hash` stays `null` above; consumers
    // who want a password-locked test override `password_hash` (a real bcrypt
    // string starting with $2a$/$2b$/$2y$) AND bump `password_hash_version` to 1.
    question_order_mode: "fixed",
    source_template_id: null,
    password_hash_version: 0,
    audience_group_id: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
