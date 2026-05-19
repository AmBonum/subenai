-- Phase 0 testing-coverage epic — defense-in-depth for respondent RPCs.
--
-- Original respondent RPCs (start/submit/finalize) trusted the session
-- UUID as the sole capability token. An attacker who learned a
-- session_id (network log, leaked URL, etc.) could corrupt answers or
-- finalize the session with arbitrary score.
--
-- Mitigation: start_respondent_session now mints a separate session_token
-- (random uuid) and returns it alongside the session id. submit/finalize
-- accept an OPTIONAL p_session_token; the hash is checked against
-- respondent_session_tokens. 7-day backwards-compat window per D7 of
-- PLAN-2026-05-19-testing-coverage.md: while we are within the window
-- (`now() < cutoff_at`) a missing token is accepted; after cutoff a
-- missing or mismatched token raises 'session_token_required' /
-- 'invalid_session_token'.
--
-- Additionally, finalize_respondent_session now bounds p_score to
-- [0, 100] (the public scoring scale) to stop an anonymous caller from
-- submitting an out-of-range score like 999.
--
-- pgcrypto (used for sha256 digest) is already enabled by
-- 20260501000000_edu_mode.sql and 20260518000000_mfa_backup_codes.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.respondent_session_tokens (
  session_id  uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  cutoff_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS respondent_session_tokens_cutoff_idx
  ON public.respondent_session_tokens (cutoff_at);

-- Table is touched only by SECURITY DEFINER RPCs; no anon/auth RLS
-- policies. service_role retains direct access for ops queries.
ALTER TABLE public.respondent_session_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.respondent_session_tokens TO service_role;

-- ----------------------------------------------------------------------------
-- start_respondent_session: now returns jsonb { session_id, session_token }.
-- Drop the old uuid-returning signature first since return type cannot be
-- changed by CREATE OR REPLACE.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.start_respondent_session(text, jsonb, boolean, text);

CREATE FUNCTION public.start_respondent_session(
  p_share_id text,
  p_intake jsonb DEFAULT '{}'::jsonb,
  p_consent_given boolean DEFAULT false,
  p_segment text DEFAULT NULL
)
RETURNS jsonb
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
  v_session_token uuid;
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

  v_session_token := gen_random_uuid();
  INSERT INTO public.respondent_session_tokens (session_id, token_hash)
  VALUES (
    v_session_id,
    encode(digest(v_session_token::text, 'sha256'), 'hex')
  );

  RETURN jsonb_build_object(
    'session_id',    v_session_id,
    'session_token', v_session_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- submit_respondent_answer: optional p_session_token, enforced after cutoff.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_respondent_answer(uuid, uuid, text, boolean, int);

CREATE FUNCTION public.submit_respondent_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_value text,
  p_is_correct boolean DEFAULT NULL,
  p_time_ms int DEFAULT NULL,
  p_session_token uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status     public.session_status;
  v_token_hash text;
  v_cutoff_at  timestamptz;
  v_now        timestamptz := now();
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  SELECT token_hash, cutoff_at
    INTO v_token_hash, v_cutoff_at
    FROM public.respondent_session_tokens
    WHERE session_id = p_session_id;

  IF p_session_token IS NULL THEN
    IF v_token_hash IS NOT NULL AND v_now >= v_cutoff_at THEN
      RAISE EXCEPTION 'session_token_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_token_hash IS NULL
       OR v_token_hash <> encode(digest(p_session_token::text, 'sha256'), 'hex') THEN
      RAISE EXCEPTION 'invalid_session_token' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
  VALUES (p_session_id, p_question_id, p_value, p_is_correct, p_time_ms)
  ON CONFLICT (session_id, question_id) DO UPDATE
    SET value = EXCLUDED.value,
        is_correct = EXCLUDED.is_correct,
        time_ms = EXCLUDED.time_ms;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int, uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- finalize_respondent_session: optional p_session_token + bounded p_score.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finalize_respondent_session(uuid, numeric);

CREATE FUNCTION public.finalize_respondent_session(
  p_session_id uuid,
  p_score numeric DEFAULT NULL,
  p_session_token uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status     public.session_status;
  v_token_hash text;
  v_cutoff_at  timestamptz;
  v_now        timestamptz := now();
BEGIN
  IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
    RAISE EXCEPTION 'invalid_score'
      USING ERRCODE = '22023',
            MESSAGE = 'p_score must be between 0 and 100';
  END IF;

  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  SELECT token_hash, cutoff_at
    INTO v_token_hash, v_cutoff_at
    FROM public.respondent_session_tokens
    WHERE session_id = p_session_id;

  IF p_session_token IS NULL THEN
    IF v_token_hash IS NOT NULL AND v_now >= v_cutoff_at THEN
      RAISE EXCEPTION 'session_token_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_token_hash IS NULL
       OR v_token_hash <> encode(digest(p_session_token::text, 'sha256'), 'hex') THEN
      RAISE EXCEPTION 'invalid_session_token' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.sessions
    SET status = 'completed',
        finished_at = now(),
        score = p_score
    WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_respondent_session(uuid, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_respondent_session(uuid, numeric, uuid) TO anon, authenticated;
