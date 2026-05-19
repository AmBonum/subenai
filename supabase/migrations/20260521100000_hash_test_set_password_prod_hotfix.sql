-- ============================================================================
-- HOTFIX 2026-05-20 — `/api/test-sets` returned 500 `hash_failed` on prod
-- ============================================================================
-- Surfaced by the /schools how-it-works contract test (commit 1650241).
-- Production /api/test-sets POST consistently failed with
--   { error: "hash_failed" }
-- which the CF Function returns when supabase.rpc("hash_test_set_password")
-- errors OR returns a non-string. Local dev hits a separate Supabase project
-- where the original 20260501000000_edu_mode.sql migration applied cleanly,
-- so local works.
--
-- This migration is the **idempotent re-application** of the bits that
-- 20260501000000_edu_mode.sql ships:
--   1. CREATE EXTENSION pgcrypto (re-runnable; no-op if installed)
--   2. CREATE OR REPLACE FUNCTION hash_test_set_password (re-creates body)
--   3. Re-grants — REVOKE-then-GRANT pattern so we definitively land the
--      service_role EXECUTE permission no matter how prod drifted.
--
-- Safe to run multiple times. Idempotent.
--
-- Application path:
--   Supabase Dashboard → SQL Editor → paste this file → Run.
--   OR `supabase db push` if the CLI is wired and prod auth is set up.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.hash_test_set_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF password IS NULL OR length(password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

-- REVOKE-then-GRANT so the final state is deterministic regardless of how
-- prod drifted (e.g. a prior REVOKE FROM PUBLIC accidentally swept
-- service_role with it on some Postgres permission cascades).
REVOKE ALL ON FUNCTION public.hash_test_set_password(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hash_test_set_password(TEXT) TO service_role;

-- Smoke test (runs at migration time — fails the migration if pgcrypto +
-- search_path are still broken; surfaces the real error in the migration
-- log instead of silently leaving the function unusable). The test uses a
-- known-good 12-char password so the length guard doesn't trip.
DO $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := public.hash_test_set_password('hotfix-probe');
  IF v_hash IS NULL OR length(v_hash) < 50 OR v_hash NOT LIKE '$2%' THEN
    RAISE EXCEPTION 'hash_test_set_password smoke test failed: got %', v_hash;
  END IF;
END$$;
