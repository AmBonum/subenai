// AH-11.4 — Public respondent flow Supabase bindings.
//
// The /t/$shareId route runs ANONYMOUSLY — no Supabase auth session,
// no React Query / QueryClient context. These wrappers call the
// SECURITY DEFINER RPCs directly. Errors surface as thrown values the
// component handler catches.
//
// Phase 0 hardening (testing-coverage epic): start_respondent_session
// now returns both `session_id` and `session_token`. The caller stashes
// the token in component state and passes it back on submit/finalize as
// defense-in-depth against session-id-only forgery. A 7-day server-side
// grace window accepts a missing token (per D7); after cutoff the RPCs
// raise `session_token_required`.
//
// E39 — zod boundary validation on every public RPC input. Anonymous
// callers can send any payload; the schema rejects malformed input
// BEFORE it reaches Supabase. Belt-and-braces alongside SQL-side
// constraints (share_id regex, score range) and trigger enforcement.
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Question, QuestionType } from "@/lib/platform/types";
import type {
  ResolvedRespondentTest,
  SafeTestProjection,
} from "@/lib/respondent/take-test.functions";
import { TakeTestInputSchema } from "@/lib/respondent/take-test.functions";

// share_id format pinned to the same regex enforced in
// supabase/migrations/20260425173314_*.sql so the client-side and
// server-side validators never disagree.
const SHARE_ID = z.string().regex(/^[a-zA-Z0-9]{6,12}$/, "invalid_share_id");

// Intake is user-controlled survey data. Keys must look like identifiers
// (no `__proto__` shenanigans, no overlong attempted DOS). Values are
// trimmed strings under 500 chars — sufficient for any legitimate
// answer, well below jsonb size limits.
const INTAKE_KEY = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/, "invalid_intake_key");
const INTAKE_VALUE = z.string().max(500, "intake_value_too_long");
const INTAKE = z
  .record(INTAKE_KEY, INTAKE_VALUE)
  .refine((rec) => Object.keys(rec).length <= 64, "intake_too_many_fields");

// Session tokens are uuids minted server-side; the optional `null`
// covers the 7-day grace window per the migration comment above.
const SESSION_TOKEN = z.string().uuid("invalid_session_token").nullable().optional();

// Session id is also a uuid.
const SESSION_ID = z.string().uuid("invalid_session_id");

// Question ids in the test bank are short identifiers. Cap at 64 chars
// to bound abuse without overconstraining future formats.
const QUESTION_ID = z.string().min(1).max(64, "question_id_too_long");

// Answer values are the user's choice — could be a single letter (a/b/c/d)
// or a longer string for free-text style. Cap at 1000 chars.
const ANSWER_VALUE = z.string().max(1000, "answer_value_too_long");

// Score is 0–100 per the schema constraint on attempts.final_score.
const SCORE = z.number().int().min(0).max(100).nullable();

const StartSessionSchema = z.object({
  shareId: SHARE_ID,
  intake: INTAKE,
  consent: z.boolean(),
  segment: z.string().max(64).nullable().optional(),
});

const SubmitAnswerSchema = z.object({
  sessionId: SESSION_ID,
  sessionToken: SESSION_TOKEN,
  questionId: QUESTION_ID,
  value: ANSWER_VALUE,
  isCorrect: z.boolean().nullable(),
  timeMs: z
    .number()
    .int()
    .min(0)
    .max(10 * 60 * 1000, "time_ms_out_of_range"),
});

const FinalizeSessionSchema = z.object({
  sessionId: SESSION_ID,
  sessionToken: SESSION_TOKEN,
  score: SCORE,
});

/**
 * Thrown when a client-side validation rejects the payload BEFORE it
 * reaches Supabase. `code` is the first zod issue's `message` field —
 * stable identifiers the UI can map to localized error messages.
 */
export class RespondentInputError extends Error {
  readonly code: string;
  constructor(code: string, details: string) {
    super(details);
    this.name = "RespondentInputError";
    this.code = code;
  }
}

function parseOrThrow<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const code = firstIssue?.message ?? "invalid_input";
    throw new RespondentInputError(code, result.error.message);
  }
  return result.data;
}

export interface StartSessionInput {
  shareId: string;
  intake: Record<string, string>;
  consent: boolean;
  segment?: string | null;
}

export interface StartSessionResult {
  sessionId: string;
  sessionToken: string | null;
}

export async function startRespondentSession(
  input: StartSessionInput,
): Promise<StartSessionResult> {
  const validated = parseOrThrow(StartSessionSchema, input);
  const { data, error } = await supabase.rpc("start_respondent_session", {
    p_share_id: validated.shareId,
    p_intake: validated.intake,
    p_consent_given: validated.consent,
    p_segment: validated.segment ?? null,
  });
  if (error) throw error;

  // Pre-Phase-0 deployments returned a bare uuid string; new deployments
  // return { session_id, session_token }. Accept both so the client keeps
  // working across the 7-day rollout window without a hard cut-over.
  if (typeof data === "string") {
    return { sessionId: data, sessionToken: null };
  }
  const payload = (data ?? {}) as { session_id?: string; session_token?: string | null };
  if (!payload.session_id) {
    throw new Error("start_respondent_session returned no session_id");
  }
  return {
    sessionId: payload.session_id,
    sessionToken: payload.session_token ?? null,
  };
}

export interface SubmitAnswerInput {
  sessionId: string;
  sessionToken?: string | null;
  questionId: string;
  value: string;
  isCorrect: boolean | null;
  timeMs: number;
}

export async function submitRespondentAnswer(input: SubmitAnswerInput): Promise<void> {
  const validated = parseOrThrow(SubmitAnswerSchema, input);
  const { error } = await supabase.rpc("submit_respondent_answer", {
    p_session_id: validated.sessionId,
    p_question_id: validated.questionId,
    p_value: validated.value,
    p_is_correct: validated.isCorrect,
    p_time_ms: validated.timeMs,
    p_session_token: validated.sessionToken ?? null,
  });
  if (error) throw error;
}

export interface FinalizeSessionInput {
  sessionId: string;
  sessionToken?: string | null;
  score: number | null;
}

export async function finalizeRespondentSession(input: FinalizeSessionInput): Promise<void> {
  const validated = parseOrThrow(FinalizeSessionSchema, input);
  const { error } = await supabase.rpc("finalize_respondent_session", {
    p_session_id: validated.sessionId,
    p_score: validated.score,
    p_session_token: validated.sessionToken ?? null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// AH-14 — resolve a published test + its question set by share id.
//
// Anonymous read via the SECURITY DEFINER RPC
// `get_respondent_test_by_share_id` (migration 20260610110000). Anon has no
// direct SELECT on tests/questions; the RPC is the only sanctioned path and
// returns ONLY the non-sensitive projection (no owner_id / password_hash /
// segmentation). Returns null when the share id is malformed or no published
// test matches.
// ---------------------------------------------------------------------------

// The RPC `options` jsonb is an array of objects ({id,label,correct,...}) for
// choice questions, or absent for free-text. The runner renders option
// labels as plain strings; normalize either shape to string[].
function normalizeOptions(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      const label = rec.label ?? rec.text;
      if (typeof label === "string") return label;
    }
    return "";
  });
  return out.length > 0 ? out : undefined;
}

// `correct` is an index array ([1]) for single/multi, a string for free-text,
// or null. Preserve the shape the runner's scoring expects (number[] | string).
function normalizeCorrect(raw: unknown): number[] | string | undefined {
  if (Array.isArray(raw) && raw.every((n) => typeof n === "number")) {
    return raw as number[];
  }
  if (typeof raw === "string") return raw;
  return undefined;
}

interface RespondentQuestionRow {
  id: string;
  type: string;
  prompt: string;
  options: unknown;
  correct: unknown;
  position: number;
}

function mapRespondentQuestion(row: RespondentQuestionRow): Question {
  const options = normalizeOptions(row.options);
  const correct = normalizeCorrect(row.correct);
  const q: Question = {
    id: row.id,
    type: row.type as QuestionType,
    prompt: row.prompt,
    category: "",
    difficulty: "medium",
    author_id: "",
    status: "approved",
    created_at: "",
  };
  if (options) q.options = options;
  if (correct !== undefined) q.correct = correct;
  return q;
}

interface ResolvedRpcPayload {
  test: {
    id: string;
    title: string;
    description: string;
    intake_fields: unknown;
    gdpr_purpose: string;
    allow_behavioral_tracking: boolean;
    status: string;
    question_order_mode: string;
  } | null;
  questions: RespondentQuestionRow[] | null;
}

export async function resolveRespondentTest(
  shareId: string,
): Promise<ResolvedRespondentTest | null> {
  const parsed = TakeTestInputSchema.safeParse({ shareId });
  if (!parsed.success) return null;

  const { data, error } = await supabase.rpc("get_respondent_test_by_share_id", {
    p_share_id: parsed.data.shareId,
  });
  if (error) throw error;
  if (data == null) return null;

  const payload = data as unknown as ResolvedRpcPayload;
  if (!payload.test) return null;

  const test: SafeTestProjection = {
    id: payload.test.id,
    title: payload.test.title,
    description: payload.test.description ?? "",
    intake_fields: (payload.test.intake_fields ?? []) as SafeTestProjection["intake_fields"],
    gdpr_purpose: payload.test.gdpr_purpose,
    allow_behavioral_tracking: payload.test.allow_behavioral_tracking,
    status: payload.test.status,
    question_order_mode: payload.test.question_order_mode === "random" ? "random" : "fixed",
  };

  const questions = (payload.questions ?? []).map(mapRespondentQuestion);
  return { test, questions };
}
