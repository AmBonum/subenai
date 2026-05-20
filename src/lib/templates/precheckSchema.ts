// E44.7 — shared schema for the AI precheck verdict. Imported by both:
//   - functions/api/templates/precheck.ts  (CF Function — runs Claude Haiku)
//   - src/lib/platform/queries.ts          (client — types the response)
//   - tests/lib/templates/precheck.*.ts    (Vitest)
//
// Single source of truth so the model contract stays in sync with the UI.

import { z } from "zod";

export const PrecheckAgeRating = z.enum(["all", "13+", "16+", "18+"]);
export type PrecheckAgeRating = z.infer<typeof PrecheckAgeRating>;

export const PrecheckCategory = z.enum([
  "harassment",
  "hate",
  "sexual",
  "violence",
  "self_harm",
  "illegal",
  "doxxing",
  "prompt_injection",
]);
export type PrecheckCategory = z.infer<typeof PrecheckCategory>;

export const PrecheckResult = z.object({
  safety: z.object({
    score: z.number().min(0).max(1),
    categories: z.array(PrecheckCategory).default([]),
  }),
  profanity: z.object({
    score: z.number().min(0).max(1),
    terms: z.array(z.string().max(64)).default([]),
  }),
  age_rating: PrecheckAgeRating,
  copyright_red_flags: z.array(z.string().max(64)).default([]),
  summary: z.string().min(1).max(400),
});
export type PrecheckResult = z.infer<typeof PrecheckResult>;

// Deterministic gate applied AFTER schema parse. Anything that fails the
// gate goes into the admin queue regardless; this just labels the
// submission as "looks-auto-approvable" vs "held-for-review" for the user
// verdict + admin queue surface.
export const SAFETY_THRESHOLD = 0.3;
export const PROFANITY_THRESHOLD = 0.5;
const ALLOWED_AGE = new Set<PrecheckAgeRating>(["all", "13+", "16+"]);

export function derivePrecheckPassed(r: PrecheckResult): boolean {
  if (r.safety.score >= SAFETY_THRESHOLD) return false;
  if (r.profanity.score >= PROFANITY_THRESHOLD) return false;
  if (r.copyright_red_flags.length > 0) return false;
  if (!ALLOWED_AGE.has(r.age_rating)) return false;
  if (r.safety.categories.includes("prompt_injection")) return false;
  return true;
}

// Persisted on `template_submissions.precheck` (jsonb). The `raw_response`
// field is dropped before persist — it lives in CF server logs only, never
// in DB and never returned to the client.
export interface PrecheckEnvelope {
  precheck_passed: boolean;
  result: PrecheckResult;
  raw_response: string;
  model_id: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  attempt: 1 | 2;
}

export type PersistedPrecheck = Omit<PrecheckEnvelope, "raw_response">;

export function stripRaw(env: PrecheckEnvelope): PersistedPrecheck {
  const { raw_response: _raw, ...rest } = env;
  return rest;
}

// Verdict shape returned to the browser. Intentionally lossy — the full
// envelope is admin-only via the admin queue (Phase C).
export interface PrecheckVerdict {
  precheck_passed: boolean;
  age_rating: PrecheckAgeRating;
  summary: string;
  held_for_admin_review: boolean;
}

export function toVerdict(env: PrecheckEnvelope): PrecheckVerdict {
  return {
    precheck_passed: env.precheck_passed,
    age_rating: env.result.age_rating,
    summary: env.result.summary,
    held_for_admin_review: !env.precheck_passed,
  };
}
