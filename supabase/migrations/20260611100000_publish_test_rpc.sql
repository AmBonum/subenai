-- E50 review fix (1) — publish_test: the single atomic publish path for
-- the test lifecycle.
--
-- WHY: the wizard (app.tests.new.tsx) labelled its create action
-- "Publikovať" but useCreateTest INSERTed status='draft', while
-- get_respondent_test_by_share_id (20260610110000) only resolves
-- status='published' — every share link handed out by the wizard was
-- dead. The editor's usePublishTest did a client-side two-step (read
-- version, then UPDATE) that never wrote a test_versions snapshot, so
-- the "published question set lives in test_versions.snapshot" contract
-- referenced by finalize_respondent_session (20260610105000) was never
-- fulfilled. Both publish paths now call this RPC.
--
-- WHAT IT DOES (single transaction):
--   1. owner-or-admin gate — house pattern of replace_test_questions
--      (20260610109000): SECURITY DEFINER + in-body ownership check,
--      pinned search_path, EXECUTE for authenticated only;
--   2. REJECTS archived tests ('test_archived'). Decision: publishing
--      from archived is NOT allowed implicitly — an archived test's
--      /t/ link was deliberately killed, so resurrecting it requires
--      the explicit unarchive step (archived → draft via the editor's
--      "Obnoviť z archívu" action) followed by a fresh publish;
--   3. version semantics: re-publishing an already-published test bumps
--      version + 1 (a new snapshot of a changed question set); first
--      publish of a draft keeps the current version (draft → published
--      is the same version becoming live). publish → unpublish →
--      publish of the SAME version refreshes that version's snapshot
--      row via ON CONFLICT instead of violating UNIQUE(test_id, version);
--   4. snapshot shape (jsonb), consumed by mapTestVersion
--      (src/lib/platform/queries.ts: reads title + question_count) and
--      by the 20260610105000 contract (questions = the immutable
--      published set, position-ordered):
--        {
--          "title":          tests.title,
--          "description":    tests.description (coalesced to ''),
--          "question_count": <int>,
--          "questions": [
--            { "id", "type", "prompt", "options", "correct", "position" },
--            ...ordered by test_questions.position ASC
--          ]
--        }
--
-- RETURNS the version number that just went live.

CREATE OR REPLACE FUNCTION public.publish_test(p_test_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test public.tests%ROWTYPE;
  v_new_version integer;
  v_questions jsonb;
  v_snapshot jsonb;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_test_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id FOR UPDATE;
  IF v_test.id IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  IF v_test.owner_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF v_test.status = 'archived' THEN
    RAISE EXCEPTION 'test_archived';
  END IF;

  v_new_version := v_test.version
    + CASE WHEN v_test.status = 'published' THEN 1 ELSE 0 END;

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
   WHERE tq.test_id = p_test_id;

  v_snapshot := jsonb_build_object(
    'title', v_test.title,
    'description', COALESCE(v_test.description, ''),
    'question_count', jsonb_array_length(v_questions),
    'questions', v_questions
  );

  UPDATE public.tests
     SET status = 'published',
         version = v_new_version,
         published_at = v_now,
         updated_at = v_now
   WHERE id = p_test_id;

  INSERT INTO public.test_versions (test_id, version, snapshot, published_at, published_by)
  VALUES (p_test_id, v_new_version, v_snapshot, v_now, auth.uid())
  ON CONFLICT (test_id, version) DO UPDATE
    SET snapshot = EXCLUDED.snapshot,
        published_at = EXCLUDED.published_at,
        published_by = EXCLUDED.published_by;

  RETURN v_new_version;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_test(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_test(uuid) TO authenticated;

COMMENT ON FUNCTION public.publish_test(uuid) IS
  'Atomically publishes a test: status=published, version bump on '
  're-publish, test_versions snapshot ({title, description, '
  'question_count, questions[]}). Owner/admin only. Archived tests are '
  'rejected (test_archived) — unarchive to draft first. Returns the '
  'live version number.';
