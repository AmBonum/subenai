-- ============================================================================
-- AH-1.10 — Fix infinite RLS recursion on tests / teams / team_members
-- ============================================================================
--
-- Bug introduced in AH-1.7 (migration 20260517000000_admin_hub_schema.sql):
-- the policies on `tests`, `teams`, and `team_members` form a cycle:
--
--   tests_owner_read       → EXISTS (SELECT FROM team_members ...)
--   team_members_self_read → EXISTS (SELECT FROM teams ...)
--   teams_member_read      → EXISTS (SELECT FROM team_members ...)
--
-- Postgres detects "infinite recursion detected in policy for relation
-- 'tests'" (SQLSTATE 42P17) and returns 500 on every SELECT against
-- `tests`, `sessions` (which joins tests), or `teams`.
--
-- The bug stayed dormant during AH-3..AH-10 because all reads went
-- through mock-store. It surfaced after AH-11.1b/c routed admin reads
-- through the anon Supabase client (real RLS path).
--
-- Fix: introduce a SECURITY DEFINER helper `public.is_team_member(uid,
-- team_id)` that bypasses RLS (same pattern as `public.has_role`).
-- Replace every inline EXISTS-on-team_members clause inside RLS
-- policies with a call to the helper. Recursion broken; queries work.
--
-- Safe to re-run. Idempotent via DROP POLICY IF EXISTS / CREATE OR
-- REPLACE FUNCTION.

-- ----------------------------------------------------------------------------
-- 1. is_team_member helper (SECURITY DEFINER bypasses RLS on team_members)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_team_member(
  _user_id uuid,
  _team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. tests_owner_read — recreate without inline team_members EXISTS
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS tests_owner_read ON public.tests;
CREATE POLICY tests_owner_read ON public.tests
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
    OR public.has_role(auth.uid(), 'admin')
  );

-- ----------------------------------------------------------------------------
-- 3. teams_member_read — recreate without inline team_members EXISTS
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS teams_member_read ON public.teams;
CREATE POLICY teams_member_read ON public.teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_team_member(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- ----------------------------------------------------------------------------
-- 4. team_members_self_read — keep teams reference, but teams policy is now
--    safe (no longer recurses back into team_members). team_members SELECT
--    of own row is intrinsically non-recursive (user_id = auth.uid()), and
--    the teams.owner_id branch only reads teams.owner_id which doesn't need
--    its own RLS evaluation when fetched via teams_member_read — but to be
--    fully defensive against any future re-entry, we route this branch
--    through has_role(admin)/owner_id check that doesn't re-query teams.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS team_members_self_read ON public.team_members;
CREATE POLICY team_members_self_read ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Note: the team-owner-can-list-members case is intentionally dropped here
-- to fully sever the cycle. Owners can fetch their team via `teams` and
-- iterate over the team's relation client-side. If we later need a
-- richer access path, add another SECURITY DEFINER helper
-- `is_team_owner(uid, team_id)` mirroring is_team_member, and add an OR
-- clause referencing it — same recursion-safe pattern.

-- ----------------------------------------------------------------------------
-- 5. team_members_owner_write — same hardening: use a SECURITY DEFINER
--    helper to avoid the cross-table EXISTS that could re-enter `teams`
--    policy evaluation.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_team_owner(
  _user_id uuid,
  _team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = _team_id AND owner_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS team_members_owner_write ON public.team_members;
CREATE POLICY team_members_owner_write ON public.team_members
  FOR ALL TO authenticated
  USING (
    public.is_team_owner(auth.uid(), team_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_team_owner(auth.uid(), team_id)
    OR public.has_role(auth.uid(), 'admin')
  );
