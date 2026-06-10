-- AH-14 — Public respondent flow: resolve a published test + its question
-- set by share_id for the anonymous /t/$shareId runner.
--
-- WHY A SECURITY DEFINER RPC:
--   The /t/$shareId route runs ANONYMOUSLY. Anon has no SELECT policy on
--   public.tests, public.test_questions, or public.questions — direct
--   anon reads are RLS-denied. This RPC is the single sanctioned anon read
--   path, mirroring get_pack_with_questions (20260521330000) and
--   get_quick_test_questions (20260519100000).
--
-- WHAT IT RETURNS (jsonb { test, questions }):
--   test     — a STRICT projection of non-sensitive tests columns:
--              id, title, description, intake_fields, gdpr_purpose,
--              allow_behavioral_tracking, status, question_order_mode.
--              Deliberately WITHHELD: owner_id, team_id, password_hash,
--              segmentation, source_template_id, notif_config, slug,
--              share_id, version timestamps — none are needed to render the
--              runner and several are sensitive (owner identity, password
--              material, internal segmentation).
--   questions — ordered array (by test_questions.position ASC) of the
--               published question set. Each row carries id, type, prompt,
--               options, correct, position.
--
-- WHY `correct` IS RETURNED (and why that is acceptable):
--   Scoring is CLIENT-EVALUATED. submit_respondent_answer takes
--   p_is_correct from the client; finalize_respondent_session
--   (20260610105000) recomputes the AGGREGATE score server-side from the
--   stored session_answers rows but per-answer correctness is NOT
--   re-derivable in SQL (the comment in that migration explains why: the
--   client evaluation is type-dependent — correct may be an index array
--   into options OR a literal string — and live questions.correct can drift
--   after publication). The respondent runner therefore needs `correct` to
--   evaluate each answer client-side, exactly as the existing public
--   get_quick_test_questions RPC already exposes it to anon. The answer key
--   is thus already public for the quick test; the same accepted trade-off
--   applies here. A forged finalize still cannot claim a score
--   inconsistent with the per-answer rows (each upsert-guarded by the
--   session token).
--
-- VISIBILITY GUARD:
--   Only status = 'published' tests resolve; drafts/archived return NULL,
--   so unpublished tests are unreachable by share_id. Questions are
--   filtered to status IN ('approved','published') — user-curated test
--   questions land as 'approved' (see useLibraryQuestions), platform-pack
--   questions as 'published'; draft/deprecated/flagged questions are
--   excluded.

CREATE OR REPLACE FUNCTION public.get_respondent_test_by_share_id(p_share_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test_id uuid;
  v_test jsonb;
  v_questions jsonb;
BEGIN
  -- share_id format guard mirrors the respondent gate regex
  -- (^[a-zA-Z0-9]{6,12}$) enforced client-side and in
  -- start_respondent_session. Reject malformed input before any read.
  IF p_share_id IS NULL OR p_share_id !~ '^[a-zA-Z0-9]{6,12}$' THEN
    RETURN NULL;
  END IF;

  SELECT t.id INTO v_test_id
    FROM public.tests t
   WHERE t.share_id = p_share_id AND t.status = 'published'
   LIMIT 1;

  IF v_test_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'description', COALESCE(t.description, ''),
    'intake_fields', t.intake_fields,
    'gdpr_purpose', t.gdpr_purpose,
    'allow_behavioral_tracking', t.allow_behavioral_tracking,
    'status', t.status,
    'question_order_mode', t.question_order_mode
  ) INTO v_test
    FROM public.tests t
   WHERE t.id = v_test_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'type', q.type,
        'prompt', q.prompt,
        'options', q.options,
        'correct', q.correct,
        'position', tq.position
      )
      ORDER BY tq.position ASC
    ),
    '[]'::jsonb
  ) INTO v_questions
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
   WHERE tq.test_id = v_test_id
     AND q.status IN ('approved', 'published');

  RETURN jsonb_build_object('test', v_test, 'questions', v_questions);
END;
$$;

REVOKE ALL ON FUNCTION public.get_respondent_test_by_share_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_respondent_test_by_share_id(text)
  TO anon, authenticated;

COMMENT ON FUNCTION public.get_respondent_test_by_share_id(text) IS
  'AH-14 anonymous respondent resolver. Returns jsonb { test, questions } '
  'for a published test by share_id, or NULL. test is a non-sensitive '
  'projection (no owner_id/password_hash/segmentation); questions carry '
  'correct for client-side scoring (same accepted exposure as '
  'get_quick_test_questions).';
