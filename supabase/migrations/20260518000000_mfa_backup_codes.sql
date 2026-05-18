-- ============================================================================
-- AH-12.1 — MFA backup codes table + SECURITY DEFINER helpers
-- ============================================================================
--
-- Supabase Auth ships TOTP MFA out of the box (factors stored in auth.mfa_*).
-- It does NOT ship backup/recovery codes. We add an opinionated layer:
--   - 8 single-use codes per user, hashed (SHA-256 hex) before persistence.
--   - Plaintext shown to the user exactly once at enroll / regen time.
--   - Used codes are marked, never deleted, so the count of remaining codes
--     is auditable and a "no codes left" warning can fire on the admin shell.
--
-- The SECURITY DEFINER functions are the only INSERT/regen path:
--   * generate_mfa_backup_codes() — invoked from the enrollment UI after the
--     TOTP factor is verified. Replaces any prior unused codes for the caller
--     (rotating regen). Returns the plaintext array — the only moment those
--     plaintext values exist on the wire.
--   * consume_mfa_backup_code(p_code) — invoked from /login/verify-2fa when
--     the user clicks "use backup code". Hashes the input and atomically
--     marks the row used_at = now() if a matching unused row exists.
--     The actual AAL2 upgrade still flows through supabase.auth.mfa.* on the
--     client; this function only validates the recovery secret.
--
-- Safe to re-run. Idempotent via IF NOT EXISTS / CREATE OR REPLACE.

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON public.mfa_backup_codes (user_id);

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Only the owner can read their own rows (used for "remaining codes" count).
-- code_hash is never exposed to the client UI in cleartext — the SELECT path
-- only counts rows where used_at IS NULL.
DROP POLICY IF EXISTS mfa_backup_codes_select_own ON public.mfa_backup_codes;
CREATE POLICY mfa_backup_codes_select_own ON public.mfa_backup_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT is denied for direct clients — only the SECURITY DEFINER function
-- below can write. No INSERT policy = effective deny.

-- UPDATE limited to flipping used_at on the user's own row. The SECURITY
-- DEFINER consume function bypasses RLS anyway; this policy is defence in
-- depth in case some client wants to mark-used locally (we do not).
DROP POLICY IF EXISTS mfa_backup_codes_update_own ON public.mfa_backup_codes;
CREATE POLICY mfa_backup_codes_update_own ON public.mfa_backup_codes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. generate_mfa_backup_codes() — regenerate 8 single-use codes
--    Returns plaintext codes. Rotates: drops the caller's existing rows first.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_mfa_backup_codes()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_codes text[] := ARRAY[]::text[];
  v_code text;
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Rotate: drop any existing rows (used or unused) so the user has exactly
  -- 8 fresh codes after this call.
  DELETE FROM public.mfa_backup_codes WHERE user_id = v_uid;

  FOR i IN 1..8 LOOP
    -- 8 hex chars XXXX-XXXX from 4 random bytes (32 bits of entropy).
    v_code := upper(
      substr(encode(gen_random_bytes(2), 'hex'), 1, 4) ||
      '-' ||
      substr(encode(gen_random_bytes(2), 'hex'), 1, 4)
    );
    INSERT INTO public.mfa_backup_codes (user_id, code_hash)
    VALUES (v_uid, encode(digest(v_code, 'sha256'), 'hex'));
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN v_codes;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_mfa_backup_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_mfa_backup_codes() TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. consume_mfa_backup_code(p_code) — mark a code used if it exists & is fresh
--    Returns true on successful consumption, false otherwise.
-- ----------------------------------------------------------------------------

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
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_mfa_backup_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_mfa_backup_code(text) TO authenticated;
