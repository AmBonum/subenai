// AH-14 — public (anonymous) respondent flow type contract.
//
// The actual resolution now runs through the SECURITY DEFINER RPC
// `get_respondent_test_by_share_id` (see
// supabase/migrations/20260610110000_*.sql), called from
// `@/lib/respondent/queries`. This module is the shared type contract:
//   - SafeTestProjection — the non-sensitive test shape the runner renders.
//   - SAFE_TEST_COLUMNS  — the allowlist the RPC projects (asserted in tests).
//   - TakeTestInputSchema — zod boundary on the share id.
//
// SECURITY INVARIANTS (mirrored in the RPC, asserted by tests):
//   - The projection NEVER carries owner_id, password_hash, segmentation,
//     team_id, source_template_id, notif_config — only the columns below.
//   - Only status = 'published' tests resolve; drafts/archived are NULL.
import { z } from "zod";

import type { IntakeField, Question } from "@/lib/platform/types";

export const SAFE_TEST_COLUMNS = [
  "id",
  "title",
  "description",
  "intake_fields",
  "gdpr_purpose",
  "allow_behavioral_tracking",
  "status",
  // E45 Phase 1 — non-sensitive: controls only the UI order respondents
  // see. NOT password_hash, NOT owner_id, NOT source_template_id.
  "question_order_mode",
] as const;

export type SafeTestProjection = {
  id: string;
  title: string;
  description: string;
  intake_fields: IntakeField[];
  gdpr_purpose: string;
  allow_behavioral_tracking: boolean;
  status: string;
  question_order_mode: "fixed" | "random";
};

// The runner consumes the platform Question shape. The RPC returns a subset
// of questions columns (id, type, prompt, options, correct) plus position;
// `mapRespondentQuestion` in queries.ts fills the non-rendered fields.
export type ResolvedRespondentTest = {
  test: SafeTestProjection;
  questions: Question[];
};

export const TakeTestInputSchema = z.object({
  shareId: z.string().regex(/^[a-zA-Z0-9]{6,12}$/, "shareId must be 6-12 alphanumeric chars"),
});

export type TakeTestInput = z.infer<typeof TakeTestInputSchema>;
