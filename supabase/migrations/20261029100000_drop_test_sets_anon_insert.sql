-- ============================================================================
-- SEC-2026-10 — drop the anon INSERT policy on public.test_sets
-- ============================================================================
-- Audit finding (P1): `test_sets_anon_insert` was `FOR INSERT TO anon WITH
-- CHECK (true)`. Anyone holding the public anon key could INSERT rows via
-- PostgREST directly, bypassing the only sanctioned write path —
-- functions/api/test-sets.ts — which validates question_ids against the
-- live bundle (AC-6) and rate-limits per IP (AC-7) before inserting with
-- the service-role key.
--
-- The browser never inserts into test_sets: src/routes/test.builder.* only
-- SELECT by id. The service role bypasses RLS, so dropping the policy does
-- not affect the Function. Read access (test_sets_anon_select +
-- test_sets_authenticated_public_select) is unchanged.
--
-- Idempotent.

DROP POLICY IF EXISTS test_sets_anon_insert ON public.test_sets;
