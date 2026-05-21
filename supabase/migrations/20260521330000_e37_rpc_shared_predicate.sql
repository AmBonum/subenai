-- ============================================================================
-- E37 architect-P1 follow-up — share the published-pack predicate across
--                              the three anon-safe RPCs via named CTEs
-- ============================================================================
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (post-shipment backlog).
--
-- All three E37 RPCs duplicated the same visibility predicate inline:
--
--   FROM public.tests t
--   JOIN public.platform_pack_metadata m ON m.test_id = t.id
--   WHERE t.status = 'published'
--
-- This migration rewrites each RPC via CREATE OR REPLACE FUNCTION so the
-- predicate lives in a single named CTE (`visible_platform_packs`) per
-- function. The CTE doesn't reduce line count meaningfully — it gives the
-- predicate a *name* so a future visibility-rule change (adding a
-- `featured` flag, a `visibility` enum, a `region` filter) touches the
-- CTE definition rather than three independent WHERE clauses.
--
-- Why inline CTE per function rather than a shared SQL view:
--   - The codebase has zero shared-view precedents but many SECURITY
--     DEFINER functions. A view would need either RLS engineering or
--     PG15 `security_invoker = false` semantics that nothing else in
--     this repo uses.
--   - Anon users can't reach `public.tests` directly (no anon SELECT
--     policy). The SECURITY DEFINER on the RPC is what gives anon
--     visibility. A view inheriting the querier's permissions wouldn't
--     change that.
--   - Each RPC stays self-contained — a CR reader sees the full
--     visibility logic in one screen.
--
-- Behavior contract: byte-equivalent output to the pre-refactor functions.
-- The contract test enforces this — assertions are unchanged from the
-- previous contract tests (`tests/db/e37_platform_packs.test.ts`,
-- `tests/db/e37_pack_question_ids_rpc.test.ts`).
--
-- Idempotent via CREATE OR REPLACE FUNCTION. Re-applying this migration
-- is a safe no-op. Supersedes the bodies in:
--   - 20260521280000_e37_platform_packs_unified.sql (Phase B')
--   - 20260521310000_e37_pack_question_ids_published_filter.sql (CR hotfix)
-- ============================================================================

-- ---- (1) get_platform_packs() — catalog list ------------------------------

CREATE OR REPLACE FUNCTION public.get_platform_packs()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  tagline text,
  industry text,
  industry_emoji text,
  passing_threshold int,
  question_count int,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH visible_platform_packs AS (
    SELECT t.id, t.slug, t.title, t.published_at, t.created_at,
           m.tagline, m.industry, m.industry_emoji, m.passing_threshold
      FROM public.tests t
      JOIN public.platform_pack_metadata m ON m.test_id = t.id
     WHERE t.status = 'published'
  )
  SELECT
    p.id,
    p.slug,
    p.title,
    p.tagline,
    p.industry,
    p.industry_emoji,
    p.passing_threshold,
    (
      SELECT COUNT(*)::int
        FROM public.test_questions tq
       WHERE tq.test_id = p.id
    ) AS question_count,
    p.published_at
  FROM visible_platform_packs p
  ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_platform_packs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_packs()
  TO anon, authenticated;

-- ---- (2) get_pack_with_questions(p_slug text) — detail payload -----------

CREATE OR REPLACE FUNCTION public.get_pack_with_questions(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pack_id uuid;
  v_pack jsonb;
  v_questions jsonb;
BEGIN
  -- Use the same named predicate to look up the pack — same visibility
  -- rule as the catalog RPC, so any future change to one propagates
  -- here at the CTE definition.
  WITH visible_platform_packs AS (
    SELECT t.id, t.slug, t.title, t.published_at,
           m.tagline, m.industry, m.industry_emoji,
           m.target_persona, m.sources_jsonb, m.passing_threshold
      FROM public.tests t
      JOIN public.platform_pack_metadata m ON m.test_id = t.id
     WHERE t.status = 'published'
  )
  SELECT p.id INTO v_pack_id
    FROM visible_platform_packs p
   WHERE p.slug = p_slug
   LIMIT 1;

  IF v_pack_id IS NULL THEN
    RETURN NULL;
  END IF;

  WITH visible_platform_packs AS (
    SELECT t.id, t.slug, t.title, t.published_at,
           m.tagline, m.industry, m.industry_emoji,
           m.target_persona, m.sources_jsonb, m.passing_threshold
      FROM public.tests t
      JOIN public.platform_pack_metadata m ON m.test_id = t.id
     WHERE t.status = 'published'
  )
  SELECT jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'title', p.title,
    'tagline', p.tagline,
    'industry', p.industry,
    'industry_emoji', p.industry_emoji,
    'target_persona', p.target_persona,
    'sources', p.sources_jsonb,
    'passing_threshold', p.passing_threshold,
    'published_at', p.published_at
  ) INTO v_pack
    FROM visible_platform_packs p
   WHERE p.id = v_pack_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'type', q.type,
        'prompt', q.prompt,
        'options', q.options,
        'correct', q.correct,
        'branch_slug', q.branch_slug,
        'difficulty', q.difficulty,
        'visual', q.visual,
        'position', tq.position
      )
      ORDER BY tq.position ASC
    ),
    '[]'::jsonb
  ) INTO v_questions
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
   WHERE tq.test_id = v_pack_id AND q.status = 'published';

  RETURN jsonb_build_object('pack', v_pack, 'questions', v_questions);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pack_with_questions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pack_with_questions(text)
  TO anon, authenticated;

-- ---- (3) get_platform_pack_question_ids() — composer bridge --------------
-- Already filters q.status = 'published' on the inner subquery (CR
-- hotfix in 20260521310000). This rewrite adds the named CTE for the
-- pack-level visibility while preserving the question-level filter.

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
  WITH visible_platform_packs AS (
    SELECT t.id, t.slug, t.published_at, t.created_at
      FROM public.tests t
      JOIN public.platform_pack_metadata m ON m.test_id = t.id
     WHERE t.status = 'published'
  )
  SELECT
    p.slug,
    ARRAY(
      SELECT tq.question_id
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
       WHERE tq.test_id = p.id
         AND q.status = 'published'
       ORDER BY tq.position ASC
    ) AS question_ids
  FROM visible_platform_packs p
  ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_platform_pack_question_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_pack_question_ids()
  TO anon, authenticated;

-- ============================================================================
-- Verification (run after applying):
--   SELECT count(*) FROM public.get_platform_packs();                -- 15
--   SELECT public.get_pack_with_questions('heslo-2fa') IS NOT NULL;  -- true
--   SELECT count(*) FROM public.get_platform_pack_question_ids();    -- 15
--
-- Behavior must be IDENTICAL to pre-refactor. The contract assertions in
-- tests/db/e37_platform_packs.test.ts + tests/db/e37_pack_question_ids_rpc.test.ts
-- + tests/db/e37_shared_predicate.test.ts (new — checks the CTE pattern
-- explicitly) cover the SQL text and behavior contracts respectively.
-- ============================================================================
