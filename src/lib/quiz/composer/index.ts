// E8.2 — Composer state types + serialization helpers.
//
// Composer lets a company assemble a custom test from existing
// QUESTIONS (TS bundle) and either share it via DB (test_sets table)
// or — for small selections (≤10 questions) — encode the whole
// selection into a URL fragment for instant share without a DB write.
//
// The DB path is the primary; the URL path is a fallback that keeps
// the composer useful even if Supabase is unreachable.

import { QUESTIONS, type Question } from "@/lib/quiz/bank/questions";

export const COMPOSER_LIMITS = {
  minQuestions: 5,
  maxQuestions: 50,
  minThreshold: 50,
  maxThreshold: 90,
  defaultThreshold: 70,
  defaultMax: 15,
  labelMaxLen: 80,
  // Above this size we force DB save — base64-encoded URL would otherwise
  // hit the 414 URI Too Long ceiling on some CDN edges (~6 KB).
  urlShareMaxQuestions: 10,
} as const;

export interface ComposerConfig {
  questionIds: string[];
  passingThreshold: number;
  maxQuestions: number;
  creatorLabel?: string;
  sourcePackSlugs?: string[];
}

export type ComposerValidation =
  | { ok: true }
  | { ok: false; reason: ComposerValidationError; detail?: string };

export type ComposerValidationError =
  | "too_few_questions"
  | "too_many_questions"
  | "max_questions_mismatch"
  | "threshold_out_of_range"
  | "label_too_long"
  | "unknown_question_id"
  | "duplicate_question_id";

const KNOWN_QUESTION_IDS = new Set(QUESTIONS.map((q) => q.id));

export function validateComposerConfig(config: ComposerConfig): ComposerValidation {
  const { questionIds, passingThreshold, maxQuestions, creatorLabel } = config;
  if (questionIds.length < COMPOSER_LIMITS.minQuestions) {
    return { ok: false, reason: "too_few_questions" };
  }
  if (questionIds.length > COMPOSER_LIMITS.maxQuestions) {
    return { ok: false, reason: "too_many_questions" };
  }
  if (maxQuestions !== questionIds.length) {
    return { ok: false, reason: "max_questions_mismatch" };
  }
  if (
    passingThreshold < COMPOSER_LIMITS.minThreshold ||
    passingThreshold > COMPOSER_LIMITS.maxThreshold
  ) {
    return { ok: false, reason: "threshold_out_of_range" };
  }
  if (creatorLabel && creatorLabel.length > COMPOSER_LIMITS.labelMaxLen) {
    return { ok: false, reason: "label_too_long" };
  }
  const seen = new Set<string>();
  for (const id of questionIds) {
    if (seen.has(id)) return { ok: false, reason: "duplicate_question_id", detail: id };
    seen.add(id);
    if (!KNOWN_QUESTION_IDS.has(id)) {
      return { ok: false, reason: "unknown_question_id", detail: id };
    }
  }
  return { ok: true };
}

/**
 * Returns the live `Question` objects for a list of IDs in the same
 * order as the input, dropping any IDs that no longer exist in the
 * bundle. Used by both `/test/builder/$id` (DB-loaded set) and the
 * URL `?config=` fallback path.
 *
 * The `missing` count lets the caller surface a toast warning when a
 * pack reference has drifted (AC-13 from E8.2).
 */
export function resolveQuestions(ids: readonly string[]): {
  questions: Question[];
  missing: number;
} {
  const questions: Question[] = [];
  let missing = 0;
  for (const id of ids) {
    const q = KNOWN_QUESTION_IDS.has(id) ? QUESTIONS.find((qq) => qq.id === id) : null;
    if (q) questions.push(q);
    else missing += 1;
  }
  return { questions, missing };
}

/**
 * Honeypot ratio = legit questions / total. Honeypot category questions
 * are by design "looks suspicious but is OK", so a healthy composer
 * mix has 20–30 % of them. Higher = more permissive (good for retail
 * onboarding); lower = more strict (good for IT/security).
 */
export function computeHoneypotRatio(ids: readonly string[]): number {
  if (ids.length === 0) return 0;
  const { questions } = resolveQuestions(ids);
  const honeypot = questions.filter((q) => q.category === "honeypot").length;
  return honeypot / questions.length;
}

/**
 * Stable, URL-safe encoding of a composer selection. Used for the
 * `/test/builder?config=...` share path that bypasses DB writes for
 * small sets. We hand-roll base64url so the same code runs in
 * Worker (no Buffer) and the browser (no atob padding pitfalls).
 */
export function encodeConfig(config: ComposerConfig): string {
  const json = JSON.stringify({
    q: config.questionIds,
    t: config.passingThreshold,
    m: config.maxQuestions,
    l: config.creatorLabel ?? null,
    s: config.sourcePackSlugs ?? null,
  });
  const utf8Bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of utf8Bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfig(encoded: string): ComposerConfig | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (padded.length % 4)) % 4);
    const binary = atob(padded + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as {
      q?: unknown;
      t?: unknown;
      m?: unknown;
      l?: unknown;
      s?: unknown;
    };
    if (
      !Array.isArray(parsed.q) ||
      !parsed.q.every((id) => typeof id === "string") ||
      typeof parsed.t !== "number" ||
      typeof parsed.m !== "number" ||
      (parsed.l !== null && typeof parsed.l !== "string") ||
      (parsed.s !== null &&
        !(Array.isArray(parsed.s) && parsed.s.every((s) => typeof s === "string")))
    ) {
      return null;
    }
    return {
      questionIds: parsed.q as string[],
      passingThreshold: parsed.t,
      maxQuestions: parsed.m,
      creatorLabel: (parsed.l as string | null) ?? undefined,
      sourcePackSlugs: (parsed.s as string[] | null) ?? undefined,
    };
  } catch {
    return null;
  }
}

export function shouldUseDbShare(questionCount: number): boolean {
  return questionCount > COMPOSER_LIMITS.urlShareMaxQuestions;
}
