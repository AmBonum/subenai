-- ============================================================================
-- E37 architect-P1 follow-up — protect the platform-system user from
--                               accidental Auth-dashboard deletion
-- ============================================================================
-- Background (from the multi-lens architect audit on 2026-05-21):
--
--   public.tests.owner_id  uuid NOT NULL REFERENCES auth.users(id)
--                          ON DELETE CASCADE
--
-- All 15 platform packs (the rows backing `/tests/{slug}` catalog) are
-- owned by the `platform@subenai.sk` system user. If that user is ever
-- deleted via Supabase Dashboard → Authentication → Users (e.g., a
-- well-meaning "delete inactive users" sweep, or a typo in a CLI script),
-- the CASCADE would silently remove all 15 pack rows. `/tests` would
-- render empty on the next page load, with no audit signal beyond the
-- auth.users tombstone.
--
-- This migration adds a defensive trigger that raises a typed exception
-- when something attempts to delete the platform user. Pattern matches
-- the codebase's existing `forbid_attempt_score_changes`,
-- `forbid_session_score_changes`, `forbid_audit_log_updates` triggers.
--
-- Why a trigger, not ALTER FK ... RESTRICT:
--   - The codebase has 8 existing `FOR EACH ROW EXECUTE FUNCTION`
--     triggers and only 9 `ON DELETE RESTRICT` clauses across all
--     migrations. The trigger idiom is the dominant defensive pattern.
--   - A trigger gives a *typed* error message ("cannot delete the
--     platform system user — 15 platform packs depend on it") at
--     delete time. RESTRICT only produces the cryptic Postgres
--     "update or delete on table 'users' violates foreign key
--     constraint" with no actionable guidance for ops.
--   - The trigger is non-invasive — no schema change on `public.tests`
--     itself. Adding a new constraint to a referencing-table FK
--     definition would require a lock window on `tests` proportional
--     to its row count.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS +
-- CREATE TRIGGER. Re-applying this migration is a safe no-op.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.forbid_platform_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pack_count int;
BEGIN
  -- Only fire on the specific email. Other auth.users deletes are
  -- governed by their own FKs (sessions, attempts, etc.) and the
  -- E46 retention crons; we don't want to interfere with them.
  IF OLD.email = 'platform@subenai.sk' THEN
    SELECT COUNT(*) INTO v_pack_count
      FROM public.tests t
      JOIN public.platform_pack_metadata m ON m.test_id = t.id
     WHERE t.owner_id = OLD.id;

    RAISE EXCEPTION
      'forbid_platform_user_delete: cannot delete platform@subenai.sk — % platform pack(s) depend on this owner_id. Reassign or archive the packs before deleting the system user.',
      v_pack_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS forbid_platform_user_delete ON auth.users;

CREATE TRIGGER forbid_platform_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.forbid_platform_user_delete();

-- The trigger function runs as SECURITY DEFINER so it can read
-- public.tests + public.platform_pack_metadata regardless of which role
-- attempted the delete. Revoke + grant per the project's convention.
REVOKE EXECUTE ON FUNCTION public.forbid_platform_user_delete() FROM PUBLIC;
-- No grants needed — only the trigger machinery calls this function.

-- ============================================================================
-- Verification (run after applying):
--   -- Should raise the typed exception:
--   DELETE FROM auth.users WHERE email = 'platform@subenai.sk';
--   -- ERROR:  forbid_platform_user_delete: cannot delete platform@subenai.sk —
--   --        15 platform pack(s) depend on this owner_id. Reassign or archive
--   --        the packs before deleting the system user.
--
--   -- Other user deletes should be unaffected — sanity-check by
--   -- attempting a no-op delete on a non-existent email:
--   DELETE FROM auth.users WHERE email = 'never-existed@example.test';
--   -- (0 rows affected, no error)
-- ============================================================================
