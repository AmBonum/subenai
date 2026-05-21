-- ============================================================================
-- E37 Phase G3a hotfix — filter draft question IDs out of
-- get_platform_pack_question_ids()
-- ============================================================================
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase G3 follow-up
-- from the post-merge CR sweep).
--
-- Why: the original Phase G3 body (20260521300000) selected
-- test_questions.question_id without joining on public.questions, so a
-- draft-status question linked to a published pack would still appear
-- in the returned ID array. Composer would then pre-populate IDs that
-- the subsequent question-load (which is correctly published-only)
-- cannot resolve, leaving phantom slots in the pool.
--
-- Fix: JOIN public.questions q ON q.id = tq.question_id and add
-- `q.status = 'published'` to the inner WHERE. This mirrors the
-- visibility rule already enforced by the sister RPC
-- get_pack_with_questions (Phase B').
--
-- Idempotent via CREATE OR REPLACE; REVOKE / GRANT are re-declared so
-- this migration is self-contained and re-applying it is a no-op.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_pack_question_ids()
RETURNS TABLE (
  slug text,
  question_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    t.slug,
    ARRAY(
      SELECT tq.question_id
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
       WHERE tq.test_id = t.id
         AND q.status = 'published'
       ORDER BY tq.position ASC
    ) AS question_ids
    FROM public.tests t
    JOIN public.platform_pack_metadata m ON m.test_id = t.id
   WHERE t.status = 'published'
   ORDER BY t.published_at DESC NULLS LAST, t.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_platform_pack_question_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_pack_question_ids()
  TO anon, authenticated;
