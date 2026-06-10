-- SEC-2026-06 (1) — public.is_aal2() helper: single source of truth for AAL2.
--
-- Problem: several admin RPCs check the literal `auth.jwt() ->> 'aal'`.
-- That check diverges from the route guard (`getAALStatus()` in
-- src/lib/auth/mfa.ts), which ALSO accepts the backup-code recovery
-- window stamped by consume_mfa_backup_code() into
-- auth.users.raw_app_meta_data.aal2_via_backup_until (see migration
-- 20260520900000_aal2_via_backup_metadata.sql). Net effect: an admin
-- recovered via backup code passes the route guard but every AAL2-gated
-- RPC raises 'not_authorized: aal2 required'.
--
-- This helper mirrors the client-side logic exactly:
--   aal2 = JWT claim aal = 'aal2'
--        OR raw_app_meta_data.aal2_via_backup_until is in the future.
--
-- SECURITY DEFINER because `authenticated` cannot read auth.users; the
-- metadata timestamp is written only by consume_mfa_backup_code() after
-- a successful backup-code match, so it cannot be forged client-side.

CREATE OR REPLACE FUNCTION public.is_aal2()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_until text;
BEGIN
  IF (auth.jwt() ->> 'aal') = 'aal2' THEN
    RETURN true;
  END IF;

  SELECT raw_app_meta_data ->> 'aal2_via_backup_until'
    INTO v_until
    FROM auth.users
    WHERE id = auth.uid();

  IF v_until IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    RETURN v_until::timestamptz > now();
  EXCEPTION WHEN OTHERS THEN
    -- Malformed timestamp metadata never grants AAL2.
    RETURN false;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.is_aal2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_aal2() TO authenticated;

COMMENT ON FUNCTION public.is_aal2() IS
  'True when the caller''s JWT carries aal=aal2 OR the backup-code '
  'recovery window (raw_app_meta_data.aal2_via_backup_until, stamped by '
  'consume_mfa_backup_code) has not expired. Use this — never the '
  'literal auth.jwt()->>''aal'' — in AAL2-gated RPCs so DB checks stay '
  'consistent with the client route guard (getAALStatus).';
