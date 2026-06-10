-- SEC-2026-06 (10) — MFA backup codes: 64-bit entropy + bcrypt hashing.
--
-- Previous scheme (20260518000000_mfa_backup_codes.sql): codes were
-- XXXX-XXXX from 2 x gen_random_bytes(2) — 32 bits — stored as unsalted
-- SHA-256. 32 bits is offline-bruteforceable in minutes if the hash
-- table ever leaks, and the unsalted fast hash makes that attack cheap.
--
-- New scheme:
--   - 2 groups of 8 hex chars (2 x gen_random_bytes(4)) = 64 bits.
--   - Stored with extensions.crypt + gen_salt('bf') (salted bcrypt).
--
-- UI compatibility (verified 2026-06-10): the verify input
-- (src/routes/login_.verify-2fa.tsx) is a free-text field — no
-- maxLength, no pattern, value uppercased on change; the one-shot
-- display (src/components/auth/BackupCodesManager.tsx) renders codes in
-- a font-mono grid with copy/download. A 17-char code fits both.
--
-- Backward compatibility: codes generated before this migration remain
-- valid until used or rotated — consume_mfa_backup_code() dispatches on
-- the stored hash shape (bcrypt hashes start '$2', legacy SHA-256 is 64
-- hex chars) via CASE, which guarantees evaluation order. The
-- aal2_via_backup_until stamping from 20260520900000 is preserved
-- verbatim.

CREATE OR REPLACE FUNCTION public.generate_mfa_backup_codes()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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
    -- XXXXXXXX-XXXXXXXX from 2 x 4 random bytes (64 bits of entropy).
    v_code := upper(
      encode(gen_random_bytes(4), 'hex') ||
      '-' ||
      encode(gen_random_bytes(4), 'hex')
    );
    INSERT INTO public.mfa_backup_codes (user_id, code_hash)
    VALUES (v_uid, crypt(v_code, gen_salt('bf')));
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN v_codes;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_mfa_backup_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_code IS NULL OR length(p_code) = 0 THEN
    RETURN false;
  END IF;

  -- Hash-shape dispatch: bcrypt rows ('$2...') verify via crypt with
  -- the stored value as salt; legacy unsalted SHA-256 rows (64 hex)
  -- verify by digest equality. CASE (unlike OR) guarantees crypt is
  -- never fed a non-bcrypt string.
  UPDATE public.mfa_backup_codes
     SET used_at = now()
   WHERE user_id = v_uid
     AND used_at IS NULL
     AND code_hash = CASE
           WHEN code_hash LIKE '$2%'
             THEN crypt(upper(p_code), code_hash)
           ELSE encode(digest(upper(p_code), 'sha256'), 'hex')
         END;

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

COMMENT ON FUNCTION public.generate_mfa_backup_codes() IS
  'AH-12.1 / SEC-2026-06 — rotates 8 single-use backup codes for the '
  'caller. Codes are XXXXXXXX-XXXXXXXX (64-bit), stored bcrypt-hashed '
  '(crypt/gen_salt bf). Plaintext returned exactly once.';

COMMENT ON FUNCTION public.consume_mfa_backup_code(text) IS
  'AH-12.1 / AH-12.8 / SEC-2026-06 — marks a matching unused backup '
  'code used and stamps aal2_via_backup_until (+30 min) into '
  'raw_app_meta_data. Verifies both bcrypt (new) and legacy unsalted '
  'SHA-256 hashes so pre-rotation codes keep working.';
