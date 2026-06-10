-- SEC-2026-06 (2+3) — Admin GDPR RPCs: enforce AAL2 in-database + audit
-- logging for every dossier action.
--
-- The E46 header comment (20260521230000_admin_user_data_rpcs.sql)
-- claimed AAL2 enforcement belongs to the app layer only. That left the
-- four GDPR RPCs callable by any aal1 admin session via PostgREST,
-- bypassing the /admin route guard entirely. This migration re-creates
-- erase_user_data, export_user_data_admin, rectify_user_data and
-- cancel_pending_erasure with:
--
--   1. `IF NOT public.is_aal2() THEN RAISE ...` right after the admin
--      role check (20260610100000_is_aal2_helper.sql — also honours the
--      backup-code recovery window, so recovered admins are not locked
--      out the way a literal auth.jwt()->>'aal' check would).
--   2. public.log_audit_event(...) calls (same pattern as the E48
--      ticket RPCs) AFTER authorization passes and the action succeeds:
--      erase (both anonymize and hard-delete-enqueue paths), export
--      (pii_access = true), rectify, cancel.
--
-- rectify_user_data's previous direct `INSERT INTO public.audit_log`
-- is replaced by log_audit_event with structured jsonb details (old /
-- new value) — same data, sanctioned insert path.
--
-- Bodies are otherwise identical to the latest definitions in
-- 20260521230000_admin_user_data_rpcs.sql and
-- 20260521250000_e46_6_rectify_user_data.sql.

-- ============================================================================
-- 1. export_user_data_admin(uuid) — Art. 15 admin export.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.export_user_data_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_email    text;
  v_payload  jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501', HINT = 'admin Art. 15 export requires authentication';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501', HINT = 'admin role required';
  END IF;
  IF NOT public.is_aal2() THEN
    RAISE EXCEPTION 'not_authorized: aal2 required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required'
      USING ERRCODE = '22023';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;

  -- E46.1 scope: identity + governance + DSR/DPA history. The full
  -- 30-table dossier is built incrementally in E46.3 — each section
  -- the UI surfaces extends this jsonb_build_object. Keeping the
  -- initial payload focused on what an Art. 15 response actually
  -- needs (who you are, what GDPR-relevant history we have on you).
  v_payload := jsonb_build_object(
    'generated_at', now(),
    'generated_by', v_caller,
    'subject', jsonb_build_object(
      'user_id', p_user_id,
      'email', v_email
    ),
    'rights', jsonb_build_object(
      'access',      'GDPR Art. 15',
      'portability', 'GDPR Art. 20',
      'erasure',     'GDPR Art. 17 — see erase_user_data() RPC',
      'rectification','GDPR Art. 16 — dossier section edit UI (E46.6)'
    ),
    'records', jsonb_build_object(
      'profile',
        COALESCE(
          (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = p_user_id),
          'null'::jsonb
        ),
      'profile_preferences',
        COALESCE(
          (SELECT to_jsonb(pp) FROM public.profile_preferences pp WHERE pp.user_id = p_user_id),
          'null'::jsonb
        ),
      'user_roles',
        COALESCE(
          (SELECT jsonb_agg(to_jsonb(ur) ORDER BY ur.role)
             FROM public.user_roles ur
             WHERE ur.user_id = p_user_id),
          '[]'::jsonb
        ),
      'dsr_requests',
        COALESCE(
          (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
             FROM public.dsr_requests d
             WHERE v_email IS NOT NULL AND d.requester_email = v_email),
          '[]'::jsonb
        ),
      'dpa_requests',
        COALESCE(
          (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
             FROM public.dpa_requests d
             WHERE v_email IS NOT NULL AND d.contact_email = v_email),
          '[]'::jsonb
        ),
      'pending_erasure',
        COALESCE(
          (SELECT to_jsonb(pe) FROM public.pending_erasures pe WHERE pe.user_id = p_user_id),
          'null'::jsonb
        )
    )
  );

  PERFORM public.log_audit_event(
    'dsr_export_admin',
    'user',
    p_user_id::text,
    true,
    jsonb_build_object('subject_email', v_email)
  );

  RETURN v_payload;
END;
$$;

COMMENT ON FUNCTION public.export_user_data_admin(uuid) IS
  'E46.1 — Admin variant of export_my_data(). Returns JSON of every '
  'GDPR-relevant record for the target user_id. Caller must have admin '
  'role AND AAL2 (is_aal2 — enforced in-database since SEC-2026-06). '
  'Every call is audit-logged with pii_access=true.';

-- ============================================================================
-- 2. erase_user_data(uuid, text)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.erase_user_data(p_user_id uuid, p_strategy text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_target_email  text;
  v_execute_at    timestamptz;
  v_snapshot      jsonb;
  v_counts        jsonb;
  v_audit_id      uuid;
  v_n_profiles    integer := 0;
  v_n_dsr         integer := 0;
  v_n_dpa         integer := 0;
  v_n_attempts    integer := 0;
  v_n_respondents integer := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501', HINT = 'erase_user_data requires authentication';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501', HINT = 'admin role required';
  END IF;
  IF NOT public.is_aal2() THEN
    RAISE EXCEPTION 'not_authorized: aal2 required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
  END IF;
  IF p_strategy NOT IN ('anonymize', 'hard_delete') THEN
    RAISE EXCEPTION 'invalid_strategy: % (expected anonymize | hard_delete)', p_strategy
      USING ERRCODE = '22023';
  END IF;
  -- Refuse on a self-target — an admin should not be able to wipe
  -- themselves; if they want out, use the user-facing path.
  IF p_user_id = v_caller THEN
    RAISE EXCEPTION 'cannot_target_self'
      USING ERRCODE = 'P0001',
        HINT = 'Use /app/account/profile self-service to delete your own account.';
  END IF;

  -- Block both strategies if a Stripe sub looks active.
  PERFORM public.assert_no_active_sponsorship(p_user_id);

  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_user_id;

  IF p_strategy = 'anonymize' THEN
    -- D-1: NULL only PII columns. Statistical / structural rows
    -- (attempts.score, dsr_requests.status, etc.) stay so Art. 30
    -- records-of-processing audits still work.

    -- profiles — NULL identity strings; keep id + created_at + role
    UPDATE public.profiles
       SET email = NULL,
           display_name = NULL,
           avatar_initials = NULL
     WHERE id = p_user_id;
    GET DIAGNOSTICS v_n_profiles = ROW_COUNT;

    -- DSR requests for this user — NULL the requester_email + note
    -- (note may contain free-text PII). Keep status + type + dates.
    IF v_target_email IS NOT NULL THEN
      UPDATE public.dsr_requests
         SET requester_email = NULL,
             note = NULL
       WHERE requester_email = v_target_email;
      GET DIAGNOSTICS v_n_dsr = ROW_COUNT;
    END IF;

    -- DPA requests where this user was the school contact.
    IF v_target_email IS NOT NULL THEN
      UPDATE public.dpa_requests
         SET contact_email = NULL,
             contact_name = NULL,
             anonymized_at = COALESCE(anonymized_at, now())
       WHERE contact_email = v_target_email;
      GET DIAGNOSTICS v_n_dpa = ROW_COUNT;
    END IF;

    -- attempts — for edu mode rows owned by this user as a
    -- respondent, NULL the PII. We do NOT touch admin-of-test
    -- attempts here (those are anonymous respondent rows owned
    -- by another author).
    UPDATE public.attempts
       SET respondent_email = NULL,
           respondent_name = NULL
     WHERE respondent_email = v_target_email
        OR (respondent_name IS NOT NULL AND v_target_email IS NOT NULL
            AND respondent_email IS NULL);
    GET DIAGNOSTICS v_n_attempts = ROW_COUNT;

    -- respondents table (edu mode respondent registry).
    UPDATE public.respondents
       SET email = NULL,
           display_name = NULL
     WHERE email = v_target_email;
    GET DIAGNOSTICS v_n_respondents = ROW_COUNT;

    v_counts := jsonb_build_object(
      'profiles', v_n_profiles,
      'dsr_requests', v_n_dsr,
      'dpa_requests', v_n_dpa,
      'attempts', v_n_attempts,
      'respondents', v_n_respondents
    );

    PERFORM public.log_audit_event(
      'dsr_erase_anonymize_executed',
      'user',
      p_user_id::text,
      true,
      jsonb_build_object(
        'strategy', 'anonymize',
        'rows_affected', v_counts
      )
    );

    RETURN jsonb_build_object(
      'strategy', 'anonymize',
      'executed_at', now(),
      'rows_affected', v_counts
    );
  END IF;

  -- p_strategy = 'hard_delete' — enqueue, do not destroy.
  --
  -- 1. Snapshot the user's data into pre_delete_snapshot. This is
  --    the recovery surface: if the destroy step turns out to be a
  --    mistake, an operator with a database backup can reconstruct
  --    everything from this jsonb.
  -- 2. Set execute_at = now() + 5 min (D-3).
  -- 3. Foreign keys with ON DELETE CASCADE on auth.users.id will
  --    take care of the actual data wipe when the CF Function cron
  --    (E46.5) calls auth.admin.deleteUser(p_user_id) post-window.
  v_snapshot := public.export_user_data_admin(p_user_id);
  v_execute_at := now() + interval '5 minutes';

  v_audit_id := public.log_audit_event(
    'dsr_hard_delete_enqueued',
    'user',
    p_user_id::text,
    true,
    jsonb_build_object(
      'strategy', 'hard_delete',
      'execute_at', v_execute_at,
      'grace_window_minutes', 5
    )
  );

  INSERT INTO public.pending_erasures
    (user_id, strategy, execute_at, initiated_by, audit_log_id, pre_delete_snapshot)
  VALUES
    (p_user_id, 'hard_delete', v_execute_at, v_caller, v_audit_id, v_snapshot)
  ON CONFLICT (user_id) DO UPDATE
    SET execute_at = EXCLUDED.execute_at,
        initiated_by = EXCLUDED.initiated_by,
        audit_log_id = EXCLUDED.audit_log_id,
        pre_delete_snapshot = EXCLUDED.pre_delete_snapshot,
        created_at = now();

  RETURN jsonb_build_object(
    'strategy', 'hard_delete',
    'enqueued_at', now(),
    'execute_at', v_execute_at,
    'grace_window_minutes', 5,
    'snapshot_bytes', length(v_snapshot::text)
  );
END;
$$;

COMMENT ON FUNCTION public.erase_user_data(uuid, text) IS
  'E46.1 — Admin GDPR Art. 17 fulfilment. Strategy = anonymize | '
  'hard_delete. Anonymize NULLs PII columns inline (synchronous). '
  'Hard delete enqueues a pending_erasures row with 5-minute grace '
  'window; actual auth.users deletion is processed by the E46.5 cron '
  'via Supabase Admin API. Both strategies refuse self-target + '
  'refuse if assert_no_active_sponsorship() raises. Requires admin '
  'role AND AAL2 (is_aal2). Both paths are audit-logged.';

-- ============================================================================
-- 3. cancel_pending_erasure(uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_pending_erasure(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_aal2() THEN
    RAISE EXCEPTION 'not_authorized: aal2 required' USING ERRCODE = '42501';
  END IF;

  -- Only cancel if the deletion has not yet executed (the cron may
  -- be in flight; once it's past execute_at the row is presumed
  -- to have been processed and a cancel is meaningless).
  DELETE FROM public.pending_erasures
   WHERE user_id = p_user_id
     AND execute_at > now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    PERFORM public.log_audit_event(
      'dsr_hard_delete_cancelled',
      'user',
      p_user_id::text,
      false,
      jsonb_build_object('rows_cancelled', v_deleted)
    );
  END IF;

  RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION public.cancel_pending_erasure(uuid) IS
  'E46.1 — Removes a hard-delete row from pending_erasures if the '
  '5-minute grace window has not elapsed. Returns true on success, '
  'false if no row matched or the window has expired. Requires admin '
  'role AND AAL2 (is_aal2). Successful cancels are audit-logged.';

-- ============================================================================
-- 4. rectify_user_data(uuid, text, text, text)
-- ============================================================================
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
  IF NOT public.is_aal2() THEN
    RAISE EXCEPTION 'not_authorized: aal2 required' USING ERRCODE = '42501';
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
  -- accountability per GDPR Art. 5(2). Routed through log_audit_event
  -- (the single sanctioned audit_log INSERT path) with structured
  -- jsonb details.
  PERFORM public.log_audit_event(
    'dsr_rectification_applied',
    'profile',
    p_user_id::text,
    true,
    jsonb_build_object(
      'table', p_table,
      'column', p_column,
      'old_value', v_old_value,
      'new_value', p_new_value
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

COMMENT ON FUNCTION public.rectify_user_data(uuid, text, text, text) IS
  'E46.6 — Admin GDPR Art. 16 rectification. Whitelisted (table, column) '
  'pairs only — currently profiles.display_name. Captures OLD value into '
  'audit_log details for accountability. NULL new_value rejected (use '
  'erase_user_data() instead). Requires admin role AND AAL2 (is_aal2).';
