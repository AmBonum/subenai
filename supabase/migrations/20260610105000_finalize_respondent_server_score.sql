-- SEC-2026-06 (7) — finalize_respondent_session: recompute the score
-- server-side; stop trusting the client-supplied p_score.
--
-- The anonymous /t/$shareId runner could finalize with ANY 0–100 score
-- regardless of the answers actually stored. The score now derives from
-- the session's own session_answers rows:
--   score = round(100 * count(is_correct = true) / count(*))
-- (matching the client's Math.round((correct / total) * 100) exactly).
-- p_score is KEPT in the signature for backward compatibility with the
-- deployed frontend but its value is ignored.
--
-- Why submit_respondent_answer still accepts p_is_correct: per-answer
-- correctness is NOT reliably derivable in SQL. Sessions are pinned to
-- tests.version, whose published question set lives in
-- test_versions.snapshot — a client-defined jsonb blob. The live
-- questions.correct column can drift after publication (admin edits),
-- and the client's evaluation (TakeTestFlow: correct may be an index
-- array into options, or a literal string) is type-dependent.
-- Recomputing against the live table would mis-grade respondents who
-- answered an older published version. Recomputing the AGGREGATE here
-- still removes the worst lever: a forged finalize can no longer claim
-- a score inconsistent with the per-answer rows submitted during the
-- session (each of which is upsert-guarded by the session token).
--
-- Signature, token enforcement and grants are unchanged from
-- 20260520800000_session_token_dod.sql.

CREATE OR REPLACE FUNCTION public.finalize_respondent_session(
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
  v_correct    integer;
  v_total      integer;
  v_score      numeric;
BEGIN
  -- p_score is intentionally ignored (kept for signature compatibility
  -- with deployed clients). The authoritative score is computed below.

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

  SELECT count(*) FILTER (WHERE is_correct IS TRUE), count(*)
    INTO v_correct, v_total
    FROM public.session_answers
    WHERE session_id = p_session_id;

  IF v_total > 0 THEN
    v_score := round(100.0 * v_correct / v_total);
  ELSE
    v_score := NULL;
  END IF;

  UPDATE public.sessions
    SET status = 'completed',
        finished_at = now(),
        score = v_score
    WHERE id = p_session_id;
END;
$$;

COMMENT ON FUNCTION public.finalize_respondent_session(uuid, numeric, uuid) IS
  'Anonymous respondent finalize. SEC-2026-06: score is recomputed from '
  'session_answers (is_correct=true / total); the p_score argument is '
  'accepted for backward compatibility but ignored.';
