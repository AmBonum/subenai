-- ============================================================================
-- AH-11.3 — Privileged server function: log_audit_event
-- ============================================================================
-- The audit_log table (AH-1.5) has SELECT-only RLS for admins and an
-- immutability trigger (forbid_audit_log_updates) blocking UPDATE / DELETE.
-- There is no INSERT policy on the table — direct anon-client inserts are
-- rejected by RLS. This SECURITY DEFINER function is the single sanctioned
-- INSERT path. The function verifies that the caller is an authenticated
-- admin (via has_role) and writes the row on their behalf.
--
-- Argument shape matches the actual audit_log columns: action (text),
-- target_type (text), target_id (text — NOT uuid, so we accept text and
-- pass through), pii_access (boolean default true since the function is
-- explicitly the PII-access logging surface), details (jsonb).
--
-- The function is granted to `authenticated` only; the role-check inside
-- ensures only admins can actually use it. anon callers are revoked.

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_pii_access boolean DEFAULT true,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT COALESCE(display_name, email, v_uid::text)
    INTO v_name
    FROM public.profiles
    WHERE id = v_uid;

  INSERT INTO public.audit_log (
    actor_id, actor_name, action, target_type, target_id, pii_access, details, at
  )
  VALUES (
    v_uid, v_name, p_action, p_target_type, p_target_id, p_pii_access, p_details, now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, text, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, boolean, jsonb) TO authenticated;
