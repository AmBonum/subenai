-- E38 Phase A — test_set ownership + claim flow.
--
-- Adds `owner_id` to `test_sets` so an authenticated user can claim a
-- set they created anonymously. Claiming requires the author password
-- (the same one used by the password-gated /results dashboard) — there
-- is NO trust-on-first-use; a malicious signed-in user cannot claim a
-- set they didn't author by simply knowing the set_id.
--
-- After claiming, the owner can:
--   * see the set in /app/edu-tests via `list_my_test_sets()`
--   * skip the password gate on /results (RLS update — phase A only
--     adds the ownership data path; the CF Function gate update lands
--     in Phase F so the JWT cookie remains the authoritative path
--     during the transition).
--
-- Existing share-by-link flow is unchanged: test_sets remain readable
-- via the existing public-by-id policy; we only ADD an owner-scoped
-- read path that exposes the rows the user owns.
--
-- Schema is forward-compatible: `owner_id` is NULLABLE so historical
-- rows are unaffected. ON DELETE SET NULL means an account deletion
-- never cascades into test_set destruction (the set survives, just
-- becomes "unowned" again).

-- 1. Add the ownership column + index for /app/edu-tests lookups.
ALTER TABLE public.test_sets
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS test_sets_owner_id_idx
  ON public.test_sets (owner_id)
  WHERE owner_id IS NOT NULL;

-- 2. RLS — owner can SELECT their own test_sets. Anon/authenticated
-- continue to read any test_set by id via the existing share-link
-- policy (this is additive, not restrictive). The owner also gets
-- UPDATE access scoped to the metadata columns the owner-only UI may
-- want to edit later (creator_label only for now — schema-level
-- restriction comes via a column-level grant).
DROP POLICY IF EXISTS "test_sets_owner_select" ON public.test_sets;
CREATE POLICY "test_sets_owner_select"
  ON public.test_sets
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- 3. RLS — owner can SELECT attempts for sets they own (parallels the
-- service-role-via-JWT-cookie path the CF Function uses today). This
-- means a signed-in owner who hits the Supabase REST endpoint directly
-- with their user JWT also gets their attempts — useful for an eventual
-- typed RPC `get_my_set_attempts` (not built in this migration).
DROP POLICY IF EXISTS "attempts_owner_select" ON public.attempts;
CREATE POLICY "attempts_owner_select"
  ON public.attempts
  FOR SELECT
  TO authenticated
  USING (
    test_set_id IN (
      SELECT id FROM public.test_sets WHERE owner_id = auth.uid()
    )
  );

-- 4. claim_test_set(set_id, password) — verifies the author password
-- and sets owner_id = auth.uid() if the caller knows it. Idempotent:
-- if the set is already owned by the caller, succeeds. If owned by
-- someone else, fails (returns 'owned_by_other') — we never silently
-- transfer ownership.
DROP FUNCTION IF EXISTS public.claim_test_set(UUID, TEXT);

CREATE FUNCTION public.claim_test_set(set_id UUID, password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  current_owner UUID;
  caller UUID;
  pw_ok BOOLEAN;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;
  IF set_id IS NULL OR password IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args');
  END IF;

  SELECT owner_id INTO current_owner
  FROM public.test_sets
  WHERE id = set_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF current_owner IS NOT NULL AND current_owner <> caller THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'owned_by_other');
  END IF;

  IF current_owner = caller THEN
    -- Idempotent: already owned by this caller, nothing to do.
    RETURN jsonb_build_object('ok', true, 'already_owned', true);
  END IF;

  pw_ok := public.verify_test_set_password(set_id, password);
  IF NOT pw_ok THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_password');
  END IF;

  UPDATE public.test_sets
    SET owner_id = caller
    WHERE id = set_id;

  RETURN jsonb_build_object('ok', true, 'already_owned', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_test_set(UUID, TEXT) TO authenticated;
-- anon explicitly NOT granted — claiming requires auth.uid().

-- 5. list_my_test_sets() — returns sets the caller owns, with
-- lightweight aggregate stats (count of attempts, last attempt). Kept
-- as a typed-return RPC so the client gets a stable shape regardless
-- of future column additions on test_sets.
DROP FUNCTION IF EXISTS public.list_my_test_sets();

CREATE FUNCTION public.list_my_test_sets()
RETURNS TABLE (
  id UUID,
  creator_label TEXT,
  passing_threshold INT2,
  question_count INT,
  collects_responses BOOLEAN,
  created_at TIMESTAMPTZ,
  attempts_count BIGINT,
  last_attempt_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    ts.id,
    ts.creator_label,
    ts.passing_threshold,
    COALESCE(array_length(ts.question_ids, 1), 0)::INT AS question_count,
    ts.collects_responses,
    ts.created_at,
    COALESCE(a.attempts_count, 0)::BIGINT AS attempts_count,
    a.last_attempt_at
  FROM public.test_sets ts
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS attempts_count, MAX(created_at) AS last_attempt_at
    FROM public.attempts
    WHERE test_set_id = ts.id
  ) a ON true
  WHERE ts.owner_id = auth.uid()
  ORDER BY ts.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_test_sets() TO authenticated;

COMMENT ON COLUMN public.test_sets.owner_id IS
  'E38 Phase A — nullable FK to auth.users. Set by claim_test_set() after author-password verification. NULL = unowned (historical or anonymous-only).';

COMMENT ON FUNCTION public.claim_test_set(UUID, TEXT) IS
  'E38 — claims an anonymous test_set for the calling user by verifying the author password. Returns {ok, reason?, already_owned?}.';

COMMENT ON FUNCTION public.list_my_test_sets() IS
  'E38 — lists test_sets owned by the calling user with attempt aggregates. Empty array if none.';
