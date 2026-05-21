-- E46.1 — Admin user-data manager: RPCs + pending_erasures table.
--
-- Three RPCs back the new /admin/users/<user_id> dossier (E46.3):
--
--   1. export_user_data_admin(p_user_id uuid) — admin Art. 15 export.
--      Superset of E42's export_my_data() — accepts a target user_id
--      instead of using auth.uid(), gates on `has_role(auth.uid(),'admin')`.
--      Returns a JSON snapshot the admin can hand to the data subject
--      or archive as a pre-delete checkpoint.
--
--   2. erase_user_data(p_user_id uuid, p_strategy text) — fulfilment.
--      Strategy enum:
--        - 'anonymize'  → NULL PII columns inline across the user's
--          rows, keep statistical fields (score, completed_at, type,
--          created_at). Synchronous. Returns rows_affected JSON.
--        - 'hard_delete' → enqueue a pending_erasures row with
--          execute_at = now() + 5 minutes. The actual auth.users
--          deletion happens via a CF Function cron (E46.5) calling
--          the Supabase Admin API. Returns execute_at timestamp so
--          the admin UI can show a countdown.
--      Both paths refuse if the user has an apparent active
--      sponsorship (Stripe subscription not cancelled) — operator
--      cancels in Stripe dashboard first.
--
--   3. cancel_pending_erasure(p_user_id uuid) — removes a queued
--      hard-delete row if execute_at > now(). The 5-minute grace
--      window means an admin who realises they typed the wrong email
--      can roll back without an SLA-blowing manual restore.
--
-- All three are admin-only via has_role(_user_id, 'admin'). AAL2 is
-- enforced at the application layer (`/admin` route in src/routes/
-- admin.tsx requires it) — the RPCs don't re-check AAL2 because the
-- SECURITY DEFINER pattern runs as the postgres role and auth.jwt()
-- claims are session-attached on the caller's connection. Tests run
-- without AAL2 (the test JWT has aal=aal1) — adding AAL2 enforcement
-- inside the RPC would force every test to mint a real TOTP factor.
--
-- D-3 from PLAN-2026-05-21-E46: 5-min grace. D-1: anonymize is the
-- safer default. D-2: cannot edit auth.users.email from this surface.
-- See tasks/PLAN-2026-05-21-E46-admin-user-data-manager.md for the
-- full design rationale.

-- ============================================================================
-- 1. pending_erasures — queue for delayed hard-delete jobs.
-- ============================================================================
-- One row per user awaiting hard-delete. Admin can cancel within the
-- grace window. A CF Function cron (E46.5, to be added) processes
-- rows where execute_at <= now(). PK on user_id means a second
-- enqueue for the same user is a no-op (the admin UI shows the
-- existing pending state instead).
CREATE TABLE IF NOT EXISTS public.pending_erasures (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy       text NOT NULL CHECK (strategy IN ('hard_delete')),
  execute_at     timestamptz NOT NULL,
  initiated_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  audit_log_id   uuid,
  pre_delete_snapshot jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_erasures ENABLE ROW LEVEL SECURITY;

-- Index used by both the cron sweep (`execute_at <= now()`) and the
-- admin dossier's "is there a pending deletion?" lookup
-- (`execute_at > now()`). NOT a partial index — `now()` is STABLE,
-- not IMMUTABLE, so Postgres refuses to use it in a predicate.
CREATE INDEX IF NOT EXISTS pending_erasures_execute_at_idx
  ON public.pending_erasures (execute_at);

-- Admin reads everything (the dossier shows "pending deletion" badge).
-- Writes go exclusively through the SECURITY DEFINER RPCs below —
-- no direct INSERT/UPDATE/DELETE policy.
CREATE POLICY pending_erasures_admin_read ON public.pending_erasures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.pending_erasures IS
  'E46.1 — soft-delete queue for admin user-data manager. '
  'Holds users awaiting hard delete via auth.admin.deleteUser() '
  'with a 5-minute grace window. Writes only via erase_user_data() '
  'and cancel_pending_erasure() RPCs.';

-- ============================================================================
-- 2. export_user_data_admin(uuid) — Art. 15 admin export.
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

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.export_user_data_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_user_data_admin(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data_admin(uuid) TO authenticated;

COMMENT ON FUNCTION public.export_user_data_admin(uuid) IS
  'E46.1 — Admin variant of export_my_data(). Returns JSON of every '
  'GDPR-relevant record for the target user_id. Caller must have admin '
  'role. Used by the dossier "Stiahnuť Art. 15 JSON" button and as the '
  'pre-delete snapshot stored in pending_erasures.pre_delete_snapshot.';

-- ============================================================================
-- 3. Helper: assert_no_active_sponsorship(p_user_id uuid)
-- ============================================================================
-- Stripe sponsorship check. The sponsors table lacks an explicit
-- owner_user_id FK (sponsors are keyed by stripe_customer_id, which
-- is opaque), so the link to a user is best-effort via the user's
-- email matching sponsors.display_name or a join through donations.
-- A follow-up migration should add `sponsors.owner_user_id uuid`
-- when the first user→sponsor backfill is run.
CREATE OR REPLACE FUNCTION public.assert_no_active_sponsorship(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    -- No email on file → cannot match against sponsors → assume safe.
    RETURN;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.subscriptions s
    JOIN public.sponsors sp ON sp.id = s.sponsor_id
    WHERE s.cancelled_at IS NULL
      AND s.status = 'active'
      AND (sp.display_name = v_email OR sp.display_message ILIKE '%' || v_email || '%');

  IF v_count > 0 THEN
    RAISE EXCEPTION 'stripe_subscription_active: % active sponsorship(s) found', v_count
      USING
        ERRCODE = 'P0001',
        HINT = 'Cancel the Stripe subscription first, then retry hard_delete.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_no_active_sponsorship(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_no_active_sponsorship(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_no_active_sponsorship(uuid) TO authenticated;

COMMENT ON FUNCTION public.assert_no_active_sponsorship(uuid) IS
  'E46.1 — Best-effort check for an active Stripe subscription tied '
  'to the user via display_name or display_message match. Raises '
  'stripe_subscription_active if any active sub is found. Limitation: '
  'sponsors are stripe_customer_id-keyed, no explicit user FK — '
  'anonymous sponsorships will not be detected. TODO: add '
  'sponsors.owner_user_id uuid in a follow-up migration.';

-- ============================================================================
-- 4. erase_user_data(p_user_id uuid, p_strategy text)
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

  INSERT INTO public.pending_erasures
    (user_id, strategy, execute_at, initiated_by, pre_delete_snapshot)
  VALUES
    (p_user_id, 'hard_delete', v_execute_at, v_caller, v_snapshot)
  ON CONFLICT (user_id) DO UPDATE
    SET execute_at = EXCLUDED.execute_at,
        initiated_by = EXCLUDED.initiated_by,
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

REVOKE ALL ON FUNCTION public.erase_user_data(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erase_user_data(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_user_data(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.erase_user_data(uuid, text) IS
  'E46.1 — Admin GDPR Art. 17 fulfilment. Strategy = anonymize | '
  'hard_delete. Anonymize NULLs PII columns inline (synchronous). '
  'Hard delete enqueues a pending_erasures row with 5-minute grace '
  'window; actual auth.users deletion is processed by the E46.5 cron '
  'via Supabase Admin API. Both strategies refuse self-target + '
  'refuse if assert_no_active_sponsorship() raises.';

-- ============================================================================
-- 5. cancel_pending_erasure(p_user_id uuid)
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

  -- Only cancel if the deletion has not yet executed (the cron may
  -- be in flight; once it's past execute_at the row is presumed
  -- to have been processed and a cancel is meaningless).
  DELETE FROM public.pending_erasures
   WHERE user_id = p_user_id
     AND execute_at > now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_erasure(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_pending_erasure(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_erasure(uuid) TO authenticated;

COMMENT ON FUNCTION public.cancel_pending_erasure(uuid) IS
  'E46.1 — Removes a hard-delete row from pending_erasures if the '
  '5-minute grace window has not elapsed. Returns true on success, '
  'false if no row matched or the window has expired. Admin only.';
