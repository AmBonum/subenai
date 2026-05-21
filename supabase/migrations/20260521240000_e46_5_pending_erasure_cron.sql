-- E46.5 — Auto-execute pending_erasures via pg_cron.
--
-- E46.1 (migration 20260521230000_admin_user_data_rpcs.sql) ships the
-- enqueue side: an admin clicks *Vymazať natvrdo*, types the user's
-- e-mail to confirm, and a row lands in `pending_erasures` with
-- execute_at = now() + 5 minutes. During the grace window an admin
-- can cancel via cancel_pending_erasure().
--
-- This migration ships the OTHER side: a pg_cron job that runs every
-- minute, finds pending_erasures rows where execute_at <= now() and
-- processed_at IS NULL, and performs the actual auth.users delete
-- (cascading through every FK-referencing table). The pending_erasures
-- row itself stays — its pre_delete_snapshot + processed_at form the
-- forensic record for GDPR Art. 5(2) accountability.
--
-- Why pg_cron over a CF Worker cron trigger:
--   - destructive operation stays inside Postgres / SECURITY DEFINER
--   - no extra secret-bearing host or HTTP round-trip
--   - pg_cron is already enabled per E38 retention jobs
--   - same observability surface as other admin RPCs (audit_log)
--
-- Why FOR UPDATE SKIP LOCKED:
--   - the cron is scheduled every minute but a slow batch could still
--     be running when the next tick fires. SKIP LOCKED ensures the
--     second tick picks a disjoint set rather than blocking or
--     double-processing.
--
-- Why we KEEP the pending_erasures row post-processing:
--   - GDPR Art. 5(2) "accountability" requires a forensic record of
--     destructive operations. The row's pre_delete_snapshot is the
--     only place that snapshot exists after auth.users is gone.
--   - Setting processed_at = now() (not deleting the row) makes the
--     audit complete: "we received the request, queued, deleted at X".

-- ============================================================================
-- 1. pending_erasures.processed_at — completion marker.
-- ============================================================================
ALTER TABLE public.pending_erasures
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE INDEX IF NOT EXISTS pending_erasures_unprocessed_idx
  ON public.pending_erasures (execute_at)
  WHERE processed_at IS NULL;

COMMENT ON COLUMN public.pending_erasures.processed_at IS
  'E46.5 — set by execute_pending_erasures() cron when the actual '
  'auth.users delete completed (or failed-and-marked-skip). NULL = '
  'still queued or still in grace window. The pre_delete_snapshot '
  'remains accessible after processing for forensic / Art. 5(2) audit.';

-- ============================================================================
-- 2. execute_pending_erasures() — the worker that pg_cron calls.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_pending_erasures()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, auth
AS $$
DECLARE
  v_row     public.pending_erasures%ROWTYPE;
  v_done    integer := 0;
  v_failed  integer := 0;
BEGIN
  -- We don't gate on auth.uid() here — this is the cron path; pg_cron
  -- runs as the cron-owner user, no auth context exists. The function
  -- is intentionally NOT granted to authenticated/anon; only the
  -- pg_cron schedule can reach it (and superuser, for manual flush).
  FOR v_row IN
    SELECT *
      FROM public.pending_erasures
     WHERE execute_at <= now()
       AND processed_at IS NULL
       AND strategy = 'hard_delete'
     ORDER BY execute_at ASC
     LIMIT 50
     FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Delete from auth.users — cascades through every FK-referencing
      -- table that has ON DELETE CASCADE on auth.users.id (profiles,
      -- profile_preferences, user_roles, sessions, attempts as owner,
      -- dpa_requests as contact, etc.). DSR rows owned by the user
      -- via requester_email do NOT cascade (no FK there); those are
      -- already anonymised by the enqueue-side snapshot logic in the
      -- E46.1 anonymise variant.
      DELETE FROM auth.users WHERE id = v_row.user_id;

      UPDATE public.pending_erasures
         SET processed_at = now()
       WHERE user_id = v_row.user_id;

      INSERT INTO public.audit_log
        (actor_id, actor_name, action, target_type, target_id, pii_access, details)
      VALUES (
        v_row.initiated_by,
        '(system: pending_erasures cron)',
        'dsr_hard_delete_executed',
        'user',
        v_row.user_id::text,
        true,
        format(
          'Hard delete executed after grace window. Enqueued by %s at %s, executed at %s. ' ||
          'Snapshot bytes retained in pending_erasures.pre_delete_snapshot.',
          v_row.initiated_by, v_row.created_at, now()
        )
      );

      v_done := v_done + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Don't crash the whole sweep on one bad row. Mark it processed
      -- with a failed audit entry; manual intervention required.
      -- An UNLIMITED retry loop would block every subsequent row
      -- behind the same failure forever — worse than a documented
      -- failure surface.
      UPDATE public.pending_erasures
         SET processed_at = now()
       WHERE user_id = v_row.user_id;

      INSERT INTO public.audit_log
        (actor_id, actor_name, action, target_type, target_id, pii_access, details)
      VALUES (
        v_row.initiated_by,
        '(system: pending_erasures cron)',
        'dsr_hard_delete_failed',
        'user',
        v_row.user_id::text,
        true,
        format(
          'Hard delete FAILED with SQLSTATE %s: %s. ' ||
          'Row marked processed to avoid retry loop. Manual intervention required.',
          SQLSTATE, SQLERRM
        )
      );
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'rows_deleted', v_done,
    'rows_failed', v_failed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_pending_erasures() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_pending_erasures() FROM anon, authenticated;
-- Grant ONLY to postgres + the cron extension's user. No app role
-- can call this directly — it bypasses identity checks by design.
-- (pg_cron runs as the user who owned cron.schedule() at install time,
-- which is postgres by default in Supabase.)
GRANT EXECUTE ON FUNCTION public.execute_pending_erasures() TO postgres;

COMMENT ON FUNCTION public.execute_pending_erasures() IS
  'E46.5 — Worker called by pg_cron every minute. Processes pending_erasures '
  'rows past their grace window: DELETE FROM auth.users (cascades), set '
  'processed_at, audit_log entry. Failures are isolated per-row (one bad '
  'row does not block the rest). NOT granted to anon/authenticated.';

-- ============================================================================
-- 3. pg_cron schedule — every minute.
-- ============================================================================
-- pg_cron is enabled on this Supabase project via the E38 retention
-- pipeline. The schedule below adds one more job; existing E38 jobs
-- are untouched.
--
-- Why every minute vs every 5 minutes:
--   - Grace window is 5 minutes. A 5-min cron means worst-case ~10 min
--     between admin click and actual delete (5-min window + up to 5
--     more before next cron tick).
--   - Every minute keeps it ≤6 min total, which feels right for an
--     irreversible operation an admin just confirmed.
--   - Per-tick work is bounded (LIMIT 50); the runtime cost is minimal.
--
-- Idempotency: re-running this migration on a Supabase project that
-- already has the schedule no-ops via cron.unschedule + cron.schedule.
DO $$
BEGIN
  -- Drop any existing schedule with the same name to keep the migration
  -- idempotent. cron.unschedule() raises if the job doesn't exist, so
  -- wrap in an exception block.
  BEGIN
    PERFORM cron.unschedule('pending-erasures-flush');
  EXCEPTION WHEN OTHERS THEN
    -- expected on first apply
    NULL;
  END;

  PERFORM cron.schedule(
    'pending-erasures-flush',
    '* * * * *',  -- every minute
    $cron$SELECT public.execute_pending_erasures();$cron$
  );
END;
$$;

COMMENT ON EXTENSION pg_cron IS
  'Used by E38 retention jobs (anonymise expired attempts / respondents / '
  'DPA contacts) and E46.5 (execute_pending_erasures every minute).';
