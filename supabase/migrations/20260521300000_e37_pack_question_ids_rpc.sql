-- ============================================================================
-- E37 Phase G3 — get_platform_pack_question_ids() RPC
-- ============================================================================
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase G3 — composer
-- migration to DB read path).
--
-- Why a third dedicated RPC (alongside get_platform_packs +
-- get_pack_with_questions): the composer at /test/builder needs the
-- (slug, question_id[]) pairs to expand a selected pack into the
-- pre-loaded question pool, but does NOT need the full question
-- rows (it already loads them from the bank or via getQuestionById).
--
-- The existing alternatives don't fit:
--   - get_platform_packs() carries question_count, not the IDs
--   - get_pack_with_questions(slug) returns FULL question rows for one
--     pack — 14 RPCs in parallel to load all 15 packs would ship ~210
--     question rows worth of bytes the composer immediately discards.
--   - Reading public.test_questions directly is blocked by RLS — the
--     existing policy `test_questions_via_test_read` requires
--     `authenticated AND (owner OR admin)`. Composer is anon.
--
-- This RPC is the smallest read surface that satisfies the composer's
-- need: one round-trip, one row per pack, just the IDs. Identical
-- visibility rules as the catalog RPC (published + has a
-- platform_pack_metadata row).
--
-- Idempotent via CREATE OR REPLACE. Re-applying this migration is a
-- safe no-op.
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
       WHERE tq.test_id = t.id
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

-- ============================================================================
-- Verification (run as anon JWT or via PostgREST without auth header):
--   SELECT slug, array_length(question_ids, 1) AS n
--     FROM public.get_platform_pack_question_ids()
--    ORDER BY slug;
--   -- Expected: 15 rows; each `n` matches the seed counts
--   --   (vseobecny=14, seniori=13, studenti=13, ziaci-do-16=14,
--   --    eshop=14, gastro-horeca=14, autoservis=13, it-vyvoj=15,
--   --    verejne-sluzby=14, heslo-2fa=7, ai-deepfake=4,
--   --    socialne-siete=6, rodicia=4, skoly=3, zdravotnictvo=6).
-- ============================================================================
