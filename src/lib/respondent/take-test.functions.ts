// AH-8.1 — public (anonymous) respondent flow server-fn skeleton.
//
// SECURITY CHECKLIST (mirrors the story's review section):
//   - supabaseAdmin must be imported ONLY from this `*.functions.ts` file
//     (covered by AH-1's ESLint no-restricted-imports rule).
//   - Safe-column projection: AH-11 swaps the mock resolver for a Supabase
//     query that selects EXACTLY the SAFE_TEST_COLUMNS allowlist below —
//     never owner_id, password_hash, segmentation, or any column not on it.
//   - Route does NOT call requireSupabaseAuth; incognito completes the flow
//     with NO auth cookie set or read.
//   - Rate-limit: 10 submissions / 5 min / IP via CF Pages Function
//     `functions/_middleware.ts`. AH-11 wires this — DO NOT edit functions/
//     in AH-8.1.
import { z } from "zod";

import { getTestByShareId } from "@/lib/respondent/mock-store";
import type { IntakeField } from "@/lib/platform/types";

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

export const TakeTestInputSchema = z.object({
  shareId: z
    .string()
    .min(8, "shareId must be at least 8 chars")
    .max(64, "shareId must be at most 64 chars"),
});

export type TakeTestInput = z.infer<typeof TakeTestInputSchema>;

/**
 * Resolve a public test by share id. Mock-only — AH-11 swaps the body to:
 *   const { data, error } = await supabaseAdmin
 *     .from("tests")
 *     .select(SAFE_TEST_COLUMNS.join(","))
 *     .eq("share_id", parsed.shareId)
 *     .eq("status", "published")
 *     .maybeSingle();
 * The returned object SHAPE must remain a strict subset of SafeTestProjection.
 */
export function takeTestFn(input: TakeTestInput): SafeTestProjection | null {
  const parsed = TakeTestInputSchema.parse(input);
  const test = getTestByShareId(parsed.shareId);
  if (!test) return null;
  // Explicit safe-column projection in this branch — never spread the whole
  // mock test object. Matches what supabaseAdmin will return in AH-11.
  return {
    id: test.id,
    title: test.title,
    description: test.description,
    intake_fields: test.intake_fields,
    gdpr_purpose: test.gdpr_purpose,
    allow_behavioral_tracking: test.allow_behavioral_tracking,
    status: test.status,
    question_order_mode: test.question_order_mode,
  };
}
