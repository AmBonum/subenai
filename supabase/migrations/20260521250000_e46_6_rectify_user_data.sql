-- E46.6 — Admin GDPR Art. 16 rectification RPC.
--
-- Closes the last E46 gap: until now, fixing a misspelled display_name
-- for a user meant the admin had to open Supabase SQL editor, write
-- an UPDATE, and hand-write an audit_log entry. The runbook
-- (tasks/E46-runbook.md section 2) documented this as the interim
-- procedure.
--
-- This migration ships a single SECURITY DEFINER RPC, `rectify_user_data`,
-- that the dossier UI calls. Scope is intentionally narrow: ONLY
-- `profiles.display_name` is whitelisted. Other (table, column) pairs
-- raise — the architecture is set up to extend the whitelist when the
-- corresponding UI driver lands, but the migration alone can't make
-- a column rectifiable.
--
-- Why whitelist vs allow-anything:
--   - SECURITY DEFINER + free-form SQL = arbitrary writes by any admin.
--     A whitelist makes the function's blast radius explicit and
--     auditable: any new editable column is a code review event.
--   - Per E46 D-2 (PLAN), `auth.users.email` is intentionally NOT
--     editable from this surface — changing it breaks magic-link
--     recovery. The whitelist enforces this at the DB layer in case
--     the UI ever regresses.

CREATE OR REPLACE FUNCTION public.rectify_user_data(
  p_user_id   uuid,
  p_table     text,
  p_column    text,
  p_new_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_old_value text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501', HINT = 'rectify_user_data requires authentication';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501', HINT = 'admin role required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
  END IF;
  IF p_new_value IS NULL THEN
    -- A NULL rectification would be an erasure dressed as a fix.
    -- Force operators through the proper Art. 17 path.
    RAISE EXCEPTION 'p_new_value cannot be NULL — use erase_user_data() for clearing fields'
      USING ERRCODE = '22023';
  END IF;
  IF length(p_new_value) > 200 THEN
    -- Defence in depth: profiles.display_name has no explicit length
    -- constraint but normal display names are <80 chars. Cap to 200
    -- so a malformed input doesn't write 10MB of garbage.
    RAISE EXCEPTION 'p_new_value too long (max 200 chars)' USING ERRCODE = '22001';
  END IF;

  -- Whitelist of (table, column) pairs we know how to rectify.
  -- Each new entry must add (a) the capture-old-value SELECT, (b) the
  -- UPDATE statement, (c) a corresponding UI driver in the dossier.
  IF p_table = 'profiles' AND p_column = 'display_name' THEN
    SELECT display_name INTO v_old_value FROM public.profiles WHERE id = p_user_id;
    UPDATE public.profiles
       SET display_name = p_new_value
     WHERE id = p_user_id;

    -- If the UPDATE matched 0 rows we silently no-op the audit
    -- (no PII change happened). Raise instead so the operator sees it.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'profile not found for user_id %', p_user_id
        USING ERRCODE = '02000';
    END IF;
  ELSE
    RAISE EXCEPTION
      'rectification not supported for %.%', p_table, p_column
      USING ERRCODE = '42501',
            HINT = 'E46.6 ships profiles.display_name only. Add to the whitelist + wire a dossier UI driver to support more.';
  END IF;

  -- Audit log entry — captures the OLD and NEW values for forensic
  -- accountability per GDPR Art. 5(2). The details field uses %L
  -- (literal-quote) on both values so embedded apostrophes etc.
  -- can't break the JSON or the log search.
  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
  VALUES (
    v_caller,
    'dsr_rectification_applied',
    'profile',
    p_user_id::text,
    true,
    format(
      'GDPR Art. 16 rectification: %s.%s changed. Old value: %L. New value: %L.',
      p_table, p_column, v_old_value, p_new_value
    )
  );

  RETURN jsonb_build_object(
    'table', p_table,
    'column', p_column,
    'old_value', v_old_value,
    'new_value', p_new_value,
    'applied_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rectify_user_data(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rectify_user_data(uuid, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rectify_user_data(uuid, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.rectify_user_data(uuid, text, text, text) IS
  'E46.6 — Admin GDPR Art. 16 rectification. Whitelisted (table, column) '
  'pairs only — currently profiles.display_name. Captures OLD value into '
  'audit_log.details for accountability. NULL new_value rejected (use '
  'erase_user_data() instead). Admin role required.';
