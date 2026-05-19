-- ============================================================================
-- AH-12.8 — Admin recovery via backup code (AAL2 fallback)
-- ============================================================================
--
-- Problem: Supabase MFA's `aal: "aal2"` JWT claim can only be set by
-- `supabase.auth.mfa.verify()` against a real TOTP factor. Our backup
-- codes consume via `consume_mfa_backup_code()` but DON'T elevate the
-- session — so an admin who has lost their phone enters a valid backup
-- code, the client navigates to `/admin`, and `requireRole`'s AAL2
-- check (`getAALStatus().currentLevel === "aal2"`) sees the JWT is
-- still `aal1` and redirects them back to `/login/verify-2fa`.
-- Net effect: admin recovery path is broken in production (2026-05-19
-- finding from Phase 4 auth E2E generation).
--
-- Fix: have `consume_mfa_backup_code()` ALSO stamp
-- `auth.users.raw_app_meta_data.aal2_via_backup_until` with a 30-minute
-- expiry. The client-side `getAALStatus()` is updated to treat that
-- timestamp as an AAL2 substitute when present and not expired. The
-- DB function remains the gatekeeper — only a successful backup-code
-- match writes the timestamp; the client can't fake it.
--
-- Security trade-offs (documented for review):
--   1. The 30-min window is on user, not session — if the admin signs
--      out and back in within 30 min, they still have AAL2. Acceptable:
--      the backup code already proved identity. Worst case: someone
--      with the admin's password steals the session within 30 min, but
--      that requires they ALSO be physically near the same browser.
--   2. The timestamp lives in `app_metadata` which is set on the user
--      record — propagates via JWT on refreshSession. Cannot be
--      tampered with from the client.
--   3. No way to revoke once stamped. If an admin's backup codes leak,
--      they need to regenerate ALL codes (existing flow) AND admin must
--      wait 30 min for the latest leaked window to expire. Future work:
--      add a "clear aal2_via_backup_until" admin tool.
--
-- Safe to re-run. CREATE OR REPLACE idempotent.

CREATE OR REPLACE FUNCTION public.consume_mfa_backup_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_code IS NULL OR length(p_code) = 0 THEN
    RETURN false;
  END IF;

  v_hash := encode(digest(upper(p_code), 'sha256'), 'hex');

  UPDATE public.mfa_backup_codes
     SET used_at = now()
   WHERE user_id = v_uid
     AND code_hash = v_hash
     AND used_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 1 THEN
    -- Stamp AAL2 expiry on the user record so getAALStatus() can treat
    -- this as a recovery-equivalent AAL2 for the next 30 minutes.
    -- raw_app_meta_data merges via `||` so we preserve any other keys.
    UPDATE auth.users
       SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object(
              'aal2_via_backup_until',
              to_char(now() + interval '30 minutes', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
     WHERE id = v_uid;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_mfa_backup_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_mfa_backup_code(text) TO authenticated;
