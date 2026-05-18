// AH-11.4 — Public respondent flow Supabase bindings.
//
// The /t/$shareId route runs ANONYMOUSLY — no Supabase auth session,
// no React Query / QueryClient context. These wrappers call the
// SECURITY DEFINER RPCs directly. Errors surface as thrown values the
// component handler catches.
import { supabase } from "@/integrations/supabase/client";

export interface StartSessionInput {
  shareId: string;
  intake: Record<string, string>;
  consent: boolean;
  segment?: string | null;
}

export async function startRespondentSession(input: StartSessionInput): Promise<string> {
  const { data, error } = await supabase.rpc("start_respondent_session", {
    p_share_id: input.shareId,
    p_intake: input.intake,
    p_consent_given: input.consent,
    p_segment: input.segment ?? null,
  });
  if (error) throw error;
  return data as string;
}

export interface SubmitAnswerInput {
  sessionId: string;
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
  });
  if (error) throw error;
}

export interface FinalizeSessionInput {
  sessionId: string;
  score: number | null;
}

export async function finalizeRespondentSession(input: FinalizeSessionInput): Promise<void> {
  const { error } = await supabase.rpc("finalize_respondent_session", {
    p_session_id: input.sessionId,
    p_score: input.score,
  });
  if (error) throw error;
}
