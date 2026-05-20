-- E45.1 — question_order_mode + source_template_id on public.tests
--
-- Phase 1 of the test detail editor epic (PLAN-2026-05-21-E45). Adds two
-- forward-compatible columns to `public.tests`:
--
--   * question_order_mode  — enum 'fixed' | 'random'. Controls the order in
--     which a respondent sees the question list at /t/$share_id. Default
--     'fixed' = pre-E45 behaviour (sequence stored in test_questions.position).
--     'random' = client-side deterministic shuffle seeded by session.id
--     (see src/lib/quiz/shuffle.ts — Fisher-Yates over FNV-1a + Mulberry32).
--     Server-side scoring is unaffected: session_answers are indexed by
--     question_id, not position, so a respondent who reloads mid-take
--     resumes with the same order their session was issued.
--
--   * source_template_id   — nullable FK to public.templates(id). Set when
--     a test is forked from a template via the /app/templates "Použiť"
--     action; preserves the lineage for the "Z šablóny" breadcrumb on
--     /app/tests/$testId. ON DELETE SET NULL keeps the test alive if the
--     template is later archived/removed; the breadcrumb just stops
--     resolving.
--
-- No data migration needed: existing rows get the column defaults
-- ('fixed' / NULL). No RLS or policy changes — the existing tests_*
-- policies inherit the new columns automatically. No new RPC.

-- 1. Enum type for question_order_mode.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_question_order_mode') THEN
    CREATE TYPE public.test_question_order_mode AS ENUM ('fixed', 'random');
  END IF;
END$$;

-- 2. Add the columns (idempotent — re-running the migration is a no-op).
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS question_order_mode public.test_question_order_mode
    NOT NULL DEFAULT 'fixed';

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS source_template_id UUID
    REFERENCES public.templates(id) ON DELETE SET NULL;

-- 3. Index for "tests forked from template X" lookups (admin/analytics).
--    Partial index — null source_template_id is the common case and we
--    never query for it.
CREATE INDEX IF NOT EXISTS tests_source_template_id_idx
  ON public.tests (source_template_id)
  WHERE source_template_id IS NOT NULL;

COMMENT ON COLUMN public.tests.question_order_mode IS
  'E45 Phase 1 — controls question display order at /t/$share_id. ''fixed'' uses test_questions.position; ''random'' = client-side Fisher-Yates seeded by session.id. Server scoring unaffected.';

COMMENT ON COLUMN public.tests.source_template_id IS
  'E45 Phase 1 — nullable FK to templates.id. Set when test is forked from a template via /app/templates "Použiť". Powers the "Z šablóny" breadcrumb. ON DELETE SET NULL keeps test alive if template is removed.';
