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
import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.rpc("start_respondent_session", {
    p_share_id: input.shareId,
    p_intake: input.intake,
    p_consent_given: input.consent,
    p_segment: input.segment ?? null,
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
  const { error } = await supabase.rpc("submit_respondent_answer", {
    p_session_id: input.sessionId,
    p_question_id: input.questionId,
    p_value: input.value,
    p_is_correct: input.isCorrect,
    p_time_ms: input.timeMs,
    p_session_token: input.sessionToken ?? null,
  });
  if (error) throw error;
}

export interface FinalizeSessionInput {
  sessionId: string;
  sessionToken?: string | null;
  score: number | null;
}

export async function finalizeRespondentSession(input: FinalizeSessionInput): Promise<void> {
  const { error } = await supabase.rpc("finalize_respondent_session", {
    p_session_id: input.sessionId,
    p_score: input.score,
    p_session_token: input.sessionToken ?? null,
  });
  if (error) throw error;
}
