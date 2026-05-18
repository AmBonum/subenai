-- AH-15.7 — Trilingual scam-scenario question schema + RPC update
--
-- Adds 6 nullable per-locale columns to public.questions:
--   prompt_en, prompt_cs   (text)
--   options_en, options_cs (jsonb)
--   visual_en,  visual_cs  (jsonb)
-- The existing prompt/options/visual columns remain the Slovak
-- source-of-truth (AH-15.6 ships sk-only seeded rows). AH-15.8 will
-- populate the en/cs columns; until then the RPC falls back to sk via
-- COALESCE so partial localization works gracefully.
--
-- get_quick_test_questions(p_limit) is replaced by
-- get_quick_test_questions(p_limit, p_locale) with the same
-- signature for p_limit (default 10) plus p_locale default 'sk'.
-- For p_locale = 'en' the projection is COALESCE(prompt_en, prompt)
-- (and the same for options + visual). Unknown locales fall back to
-- sk by definition (CASE ELSE branch).

-- ---- (1) Per-locale columns ----
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS prompt_en  text,
  ADD COLUMN IF NOT EXISTS prompt_cs  text,
  ADD COLUMN IF NOT EXISTS options_en jsonb,
  ADD COLUMN IF NOT EXISTS options_cs jsonb,
  ADD COLUMN IF NOT EXISTS visual_en  jsonb,
  ADD COLUMN IF NOT EXISTS visual_cs  jsonb;

COMMENT ON COLUMN public.questions.prompt_en IS
  'English prompt. Nullable; AH-15.8 populates. RPC falls back to sk columns if null.';
COMMENT ON COLUMN public.questions.prompt_cs IS
  'Czech prompt. Nullable; AH-15.8 populates. RPC falls back to sk columns if null.';
COMMENT ON COLUMN public.questions.options_en IS
  'English options jsonb. Nullable; AH-15.8 populates. RPC falls back to sk columns if null.';
COMMENT ON COLUMN public.questions.options_cs IS
  'Czech options jsonb. Nullable; AH-15.8 populates. RPC falls back to sk columns if null.';
COMMENT ON COLUMN public.questions.visual_en IS
  'English visual jsonb. Nullable; AH-15.8 populates. RPC falls back to sk columns if null.';
COMMENT ON COLUMN public.questions.visual_cs IS
  'Czech visual jsonb. Nullable; AH-15.8 populates. RPC falls back to sk columns if null.';

-- ---- (2) Replace get_quick_test_questions with locale-aware version ----
-- Postgres cannot change a function's argument list with CREATE OR
-- REPLACE; drop the old single-arg signature first.
DROP FUNCTION IF EXISTS public.get_quick_test_questions(int);

CREATE OR REPLACE FUNCTION public.get_quick_test_questions(
  p_limit  int  DEFAULT 10,
  p_locale text DEFAULT 'sk'
)
RETURNS TABLE (
  id uuid,
  type public.question_type,
  prompt text,
  options jsonb,
  correct jsonb,
  branch_slug text,
  difficulty text,
  visual jsonb,
  order_index int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    q.id,
    q.type,
    CASE
      WHEN p_locale = 'en' THEN COALESCE(q.prompt_en, q.prompt)
      WHEN p_locale = 'cs' THEN COALESCE(q.prompt_cs, q.prompt)
      ELSE q.prompt
    END AS prompt,
    CASE
      WHEN p_locale = 'en' THEN COALESCE(q.options_en, q.options)
      WHEN p_locale = 'cs' THEN COALESCE(q.options_cs, q.options)
      ELSE q.options
    END AS options,
    q.correct,
    q.branch_slug,
    q.difficulty,
    CASE
      WHEN p_locale = 'en' THEN COALESCE(q.visual_en, q.visual)
      WHEN p_locale = 'cs' THEN COALESCE(q.visual_cs, q.visual)
      ELSE q.visual
    END AS visual,
    qtq.order_index
  FROM public.quick_test_questions qtq
  JOIN public.questions q ON q.id = qtq.question_id
  WHERE qtq.quick_test_config_id = 1
    AND q.status = 'published'
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

REVOKE ALL ON FUNCTION public.get_quick_test_questions(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quick_test_questions(int, text)
  TO anon, authenticated;
