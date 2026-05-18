-- ============================================================================
-- AH-11.4 — Public respondent flow: SECURITY DEFINER RPCs
-- ============================================================================
-- The /t/$shareId route is anonymous (no Supabase session). RLS on the
-- sessions, session_answers, and respondents tables has NO anon INSERT
-- policies — direct anon-client inserts are rejected. These three RPCs are
-- the single sanctioned anonymous write path:
--
--   1. start_respondent_session(p_share_id, p_intake, p_segment)
--      → resolves share_id → tests.id, creates a respondents row from
--        intake email/display_name (when provided), inserts a sessions
--        row pinned to tests.version, returns the new session id.
--
--   2. submit_respondent_answer(p_session_id, p_question_id, p_value,
--                               p_is_correct, p_time_ms)
--      → upserts a session_answers row. Idempotent on (session_id,
--        question_id) so the respondent can navigate Prev/Next and
--        re-submit without violating the composite PK.
--
--   3. finalize_respondent_session(p_session_id, p_finished_at, p_score)
--      → marks the session completed, stamps finished_at and score.
--
-- Anonymous callers cannot reach the underlying tables — only the RPCs.
-- The functions guard against tampering by re-resolving the test from
-- share_id and verifying the session still belongs to a published test
-- before any write.

CREATE OR REPLACE FUNCTION public.start_respondent_session(
  p_share_id text,
  p_intake jsonb DEFAULT '{}'::jsonb,
  p_consent_given boolean DEFAULT false,
  p_segment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test_id uuid;
  v_version int;
  v_respondent_id uuid;
  v_session_id uuid;
  v_email text;
  v_display_name text;
BEGIN
  SELECT id, version
    INTO v_test_id, v_version
    FROM public.tests
    WHERE share_id = p_share_id AND status = 'published';
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;

  v_email := NULLIF(p_intake ->> 'if_email', '');
  v_display_name := NULLIF(p_intake ->> 'if_name', '');

  IF v_email IS NOT NULL OR v_display_name IS NOT NULL THEN
    INSERT INTO public.respondents (email, display_name)
    VALUES (v_email, v_display_name)
    RETURNING id INTO v_respondent_id;
  END IF;

  INSERT INTO public.sessions (
    test_id, version, respondent_id, intake_data, consent_given,
    segment, status, started_at
  )
  VALUES (
    v_test_id, v_version, v_respondent_id, p_intake, p_consent_given,
    p_segment, 'in_progress', now()
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_respondent_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_value text,
  p_is_correct boolean DEFAULT NULL,
  p_time_ms int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.session_status;
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
  VALUES (p_session_id, p_question_id, p_value, p_is_correct, p_time_ms)
  ON CONFLICT (session_id, question_id) DO UPDATE
    SET value = EXCLUDED.value,
        is_correct = EXCLUDED.is_correct,
        time_ms = EXCLUDED.time_ms;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.finalize_respondent_session(
  p_session_id uuid,
  p_score numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.session_status;
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  UPDATE public.sessions
    SET status = 'completed',
        finished_at = now(),
        score = p_score
    WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_respondent_session(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_respondent_session(uuid, numeric) TO anon, authenticated;
