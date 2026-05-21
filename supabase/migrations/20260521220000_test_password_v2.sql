-- E45 Phase 2 — Test password gate (set / verify / clear).
--
-- Mirrors the proven edu-mode pattern (20260501000000_edu_mode.sql L126–172)
-- on the `tests` table instead of `test_sets`. Three RPCs:
--
--   * hash_test_password(test_id, password)  — owner-or-admin only;
--     SECURITY DEFINER + body-level ownership re-check (T14 defense).
--     Writes one audit_log row per call (T6 atomicity invariant).
--     Returns the new password_hash_version so the CF function can
--     mint a cookie with the correct `pv` claim without a second
--     round-trip.
--
--   * clear_test_password(test_id) — same surface, sets hash to NULL,
--     still bumps password_hash_version (so old cookies invalidate).
--
--   * verify_test_password(share_id, password) — anon-callable but
--     the front door is the CF function rate-limit, not the RPC.
--     Returns TABLE(verified boolean, current_pv int).
--
-- Schema delta is a single new column. `tests.password_hash` already
-- exists (since AH-1.4) — we don't ALTER that.
--
-- Cross-refs:
--   * tasks/E45-appendix-A.md § 2.5 (pv mechanism), § 4 (RPC scope), § 5 (audit).
--   * supabase/migrations/20260517000000_admin_hub_schema.sql L448–479 (audit_log + immutability trigger).

-- 1. password_hash_version — bumped on every set / change / clear so
--    old respondent_pwd_jwt cookies (which carry `pv`) invalidate.
--    Default 0 is the sentinel for "no password ever set"; first set
--    bumps to 1. Existing rows with non-NULL password_hash from
--    pre-E45 days get version 1 too (see backfill below).
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS password_hash_version INT NOT NULL DEFAULT 0;

-- Backfill: any existing test that already had a password gets version 1
-- so its first cookie mint after E45 deploy has a non-sentinel value.
UPDATE public.tests
  SET password_hash_version = 1
  WHERE password_hash IS NOT NULL
    AND password_hash_version = 0;

-- 2. hash_test_password — set or change. Returns new pv.
DROP FUNCTION IF EXISTS public.hash_test_password(UUID, TEXT);

CREATE FUNCTION public.hash_test_password(test_id UUID, password TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _owner UUID;
  _old_hash TEXT;
  _new_hash TEXT;
  _new_pv INT;
  _op TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF test_id IS NULL OR password IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;
  IF length(password) < 8 THEN
    RAISE EXCEPTION 'password_too_short';
  END IF;
  -- T8: cap password length so a megabyte-password can't bomb logs.
  IF length(password) > 256 THEN
    RAISE EXCEPTION 'password_too_long';
  END IF;

  SELECT owner_id, password_hash INTO _owner, _old_hash
    FROM public.tests
    WHERE id = test_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  -- T14 belt-and-braces: re-check ownership inside the RPC body, not
  -- only via REVOKE. service_role bypass + RLS is the first lock; this
  -- is the second.
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  _new_hash := crypt(password, gen_salt('bf', 10));
  -- T4 defense: pgcrypto could theoretically be re-defaulted to a non-bcrypt
  -- prefix. Guard explicitly.
  IF substr(_new_hash, 1, 4) NOT IN ('$2a$', '$2b$', '$2y$') THEN
    RAISE EXCEPTION 'unexpected_hash_prefix';
  END IF;

  UPDATE public.tests
    SET password_hash = _new_hash,
        password_hash_version = password_hash_version + 1,
        updated_at = now()
    WHERE id = test_id
    RETURNING password_hash_version INTO _new_pv;

  _op := CASE WHEN _old_hash IS NULL THEN 'set' ELSE 'change' END;

  -- Atomicity (T6): the same TX writes the audit row. A failure here
  -- rolls back the password change → no orphan password without audit.
  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
    VALUES (
      auth.uid(),
      'template_password_set',
      'test',
      test_id::text,
      false,
      jsonb_build_object('op', _op, 'pv', _new_pv)
    );

  RETURN _new_pv;
END;
$$;

REVOKE ALL ON FUNCTION public.hash_test_password(UUID, TEXT) FROM PUBLIC, anon, authenticated;
-- service_role retains the default EXECUTE; the CF function uses the user-JWT
-- with service_role to populate auth.uid() correctly.

COMMENT ON FUNCTION public.hash_test_password(UUID, TEXT) IS
  'E45 Phase 2 — sets or changes the test password (bcrypt, pgcrypto). Owner-or-admin only; rechecked in body. Bumps password_hash_version. Writes audit_log row in the same TX.';

-- 3. clear_test_password — sets hash to NULL, bumps pv, audits.
DROP FUNCTION IF EXISTS public.clear_test_password(UUID);

CREATE FUNCTION public.clear_test_password(test_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _owner UUID;
  _new_pv INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF test_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  SELECT owner_id INTO _owner
    FROM public.tests
    WHERE id = test_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  UPDATE public.tests
    SET password_hash = NULL,
        password_hash_version = password_hash_version + 1,
        updated_at = now()
    WHERE id = test_id
    RETURNING password_hash_version INTO _new_pv;

  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
    VALUES (
      auth.uid(),
      'template_password_set',
      'test',
      test_id::text,
      false,
      jsonb_build_object('op', 'clear', 'pv', _new_pv)
    );

  RETURN _new_pv;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_test_password(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.clear_test_password(UUID) IS
  'E45 Phase 2 — clears the test password. Owner-or-admin only. Bumps password_hash_version. Writes audit_log row.';

-- 4. verify_test_password — anon-callable; CF function gates with rate limits.
--    Returns TABLE(verified, current_pv) so the caller can mint a cookie
--    with the right pv without a second round-trip (Appendix A § 2.5).
DROP FUNCTION IF EXISTS public.verify_test_password(TEXT, TEXT);

CREATE FUNCTION public.verify_test_password(p_share_id TEXT, p_password TEXT)
RETURNS TABLE (verified BOOLEAN, current_pv INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash TEXT;
  _pv INT;
BEGIN
  IF p_share_id IS NULL OR p_password IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;
  -- T8: cap length so a megabyte-password can't bomb logs / CPU.
  IF length(p_password) > 256 THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  SELECT password_hash, password_hash_version
    INTO _hash, _pv
    FROM public.tests
    WHERE share_id = p_share_id;

  -- Same return shape for "no row" vs "no password" vs "wrong password" —
  -- absent-share oracle closed by §3 jitter at the CF layer (T7).
  IF _hash IS NULL THEN
    RETURN QUERY SELECT false, COALESCE(_pv, 0);
    RETURN;
  END IF;

  RETURN QUERY SELECT crypt(p_password, _hash) = _hash, _pv;
END;
$$;

-- Anon + authenticated may call — the CF function gates with rate limits
-- BEFORE this RPC is reached. Mirrors verify_test_set_password's stance.
GRANT EXECUTE ON FUNCTION public.verify_test_password(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.verify_test_password(TEXT, TEXT) IS
  'E45 Phase 2 — anon-callable bcrypt verify. Returns (verified, current_pv). Front door is the rate-limited CF function /api/tests/verify-password.';

-- 5. tests_password_status — owner-only helper so the UI can ask
--    "does this test have a password?" without ever reading the hash.
--    Boolean projection; safe to expose to PostgREST under owner RLS.
--    Implemented as a column-level READ via the existing
--    tests_owner_select / tests_owner_read policies — no new RPC needed.
--    The queries layer will SELECT (password_hash IS NOT NULL) AS has_password.

COMMENT ON COLUMN public.tests.password_hash_version IS
  'E45 Phase 2 — incremented on every set/change/clear. Embedded in respondent_pwd_jwt as `pv` claim; mismatch with current value invalidates old cookies (R5: in-flight password rotation).';
