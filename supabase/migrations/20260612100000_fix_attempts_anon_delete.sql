-- ============================================================================
-- SECURITY FIX — anonymous mass-delete of public.attempts
-- ============================================================================
--
-- 20260426110000_self_service_delete_and_retention.sql created:
--
--   CREATE POLICY attempts_anon_delete ON public.attempts
--     FOR DELETE TO anon USING (share_id IS NOT NULL);
--
-- Intent was "the holder of the secret share_id may delete their own row".
-- But share_id is NOT NULL on every row, so the predicate authorizes the
-- deletion of ALL rows: any holder of the public anon key could issue
--   DELETE /rest/v1/attempts?id=neq.<impossible-uuid>
-- and wipe the whole table (scores, leaderboard percentiles, edu-mode
-- respondent attempts). The forbid_attempt_score_changes trigger guards
-- UPDATE only; nothing guarded DELETE.
--
-- Fix: drop the policy, revoke direct DELETE entirely, and route the
-- self-service erasure (GDPR Art. 17 promise from the privacy policy)
-- through a SECURITY DEFINER RPC that treats the share_id as a capability
-- token and deletes exactly the matching row.
-- ============================================================================

DROP POLICY IF EXISTS attempts_anon_delete ON public.attempts;

-- Supabase's default grants give anon/authenticated DELETE at the table
-- level (RLS was the only gate). Remove it so no future policy mistake
-- can reopen direct deletes; all erasure goes through the RPC below or
-- SECURITY DEFINER server-side flows (which run as the function owner).
REVOKE DELETE ON public.attempts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_attempt_by_share_id(p_share_id text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Format guard mirrors the attempts_share_id_format CHECK constraint
  -- (20260425173314): reject malformed input before touching the table.
  IF p_share_id IS NULL OR p_share_id !~ '^[a-zA-Z0-9]{6,12}$' THEN
    RETURN false;
  END IF;

  DELETE FROM public.attempts WHERE share_id = p_share_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_attempt_by_share_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_attempt_by_share_id(text) TO anon, authenticated;

COMMENT ON FUNCTION public.delete_attempt_by_share_id(text) IS
  'Self-service GDPR erasure for quiz attempts. The share_id is a secret '
  'capability returned only to the user who completed the test; deletes '
  'exactly the row matching it. Replaces the broken attempts_anon_delete '
  'RLS policy whose predicate (share_id IS NOT NULL) matched every row.';
