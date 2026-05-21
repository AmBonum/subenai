-- E44.11 Phase C — admin-kind notifications + template-submission fan-out.
--
-- Goal: when a user submits a template for public listing
-- (`template_submissions.status = 'pending'`), every admin gets a
-- notification row in `public.notifications` so the admin shell badge
-- counts them and they appear in the bell dropdown.
--
-- Design choice: fan-out (one notification row per admin), NOT a single
-- `user_id IS NULL` row. Reasons:
--   1. Each admin has their own `read_at` — one admin marking it read
--      must NOT mark it read for the others.
--   2. `notifications.user_id` is `NOT NULL` today; relaxing that would
--      cascade through every RLS policy on the table.
--   3. The existing `notifications_self_read` policy already grants
--      admin a read on every row via `has_role(auth.uid(), 'admin')`, so
--      no RLS change is needed — `kind` is a metadata discriminator,
--      not a security gate.
--
-- `kind` column is text + CHECK rather than a new enum. Matches the
-- existing `event_type` convention (also text) and keeps the migration
-- reversible without a `DROP TYPE` step.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'user';

-- CHECK constraint is added as NOT VALID + VALIDATE to avoid a long
-- exclusive lock on a large table. The DEFAULT above means every
-- existing row is already 'user', so VALIDATE is instant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_kind_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_kind_check
      CHECK (kind IN ('user', 'admin')) NOT VALID;
    ALTER TABLE public.notifications
      VALIDATE CONSTRAINT notifications_kind_check;
  END IF;
END $$;

-- Index supporting the admin-shell badge query: count of unread admin
-- notifications for the current admin user. Partial index keeps it
-- small (only unread rows; reads dominate writes by 1000:1 here).
CREATE INDEX IF NOT EXISTS notifications_admin_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE kind = 'admin' AND read_at IS NULL;

-- Fan-out helper: insert one `kind='admin'` row for every active admin.
-- SECURITY DEFINER so callers (triggers, service-role) don't need direct
-- read on `user_roles`. Returns the count of admins notified — useful
-- for trigger-side smoke checks and integration tests.
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_event_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_test_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.notifications (user_id, event_type, title, body, test_id, kind)
  SELECT ur.user_id, p_event_type, p_title, p_body, p_test_id, 'admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_admins(text, text, text, uuid)
  TO authenticated, service_role;

-- Trigger function on `template_submissions`: fire on every transition
-- INTO `pending` (initial submit OR re-submit from `rejected`). Suppress
-- duplicate fires when the row is updated for other reasons (precheck
-- write-back, withdrawn, approved, rejected — none of those notify).
CREATE OR REPLACE FUNCTION public.notify_admins_on_template_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tpl_title text;
  v_body text;
BEGIN
  -- INSERT: only fire if the new row lands in `pending`.
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- UPDATE: only fire on `rejected` → `pending` (re-submission). Other
  -- transitions either DON'T involve pending (approved/rejected →
  -- terminal) or are a no-op (pending → pending).
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status <> 'pending' THEN
      RETURN NEW;
    END IF;
    IF OLD.status = 'pending' THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT title INTO v_tpl_title
  FROM public.templates
  WHERE id = NEW.template_id;

  v_body := coalesce(v_tpl_title, '(bez názvu)')
            || ' — autor ' || NEW.author_display_name;

  PERFORM public.notify_admins(
    'template_submission_pending',
    'Nová šablóna čaká na schválenie',
    v_body,
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS template_submissions_notify_admins
  ON public.template_submissions;
CREATE TRIGGER template_submissions_notify_admins
  AFTER INSERT OR UPDATE OF status ON public.template_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_template_submission();

-- ============================================================================
-- E44.10 — Admin moderation RPCs (approve / reject).
-- ============================================================================
-- These exist so the admin route can flip the submission state, the
-- corresponding template's visibility, and write the audit_log entry
-- in ONE transaction. Without them, a network failure between the two
-- UPDATEs would leave the system inconsistent (submission says
-- "approved" but template is still `private`/`draft`).

-- Approve: submission → 'approved', template → public+published.
CREATE OR REPLACE FUNCTION public.approve_template_submission(
  p_submission_id uuid
)
RETURNS uuid  -- returns the template_id that was published
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission public.template_submissions;
  v_now timestamptz := now();
  v_admin uuid := auth.uid();
BEGIN
  -- Privilege check. The function is SECURITY DEFINER so RLS doesn't
  -- gate it; we re-check the caller's role explicitly.
  IF NOT public.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT * INTO v_submission
  FROM public.template_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_not_found: %', p_submission_id;
  END IF;
  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION 'illegal_state: submission is %, expected pending', v_submission.status;
  END IF;

  -- Flip the submission. The state-machine trigger lets pending→approved.
  UPDATE public.template_submissions
  SET status = 'approved',
      reviewed_at = v_now,
      reviewer_id = v_admin
  WHERE id = p_submission_id;

  -- Flip the template to publicly listed + published.
  -- author_display_name on the template row is pinned to whatever the
  -- submission captured (snapshot survives later profile rename / delete).
  UPDATE public.templates
  SET visibility = 'public',
      status = 'published',
      published_at = coalesce(published_at, v_now),
      updated_at = v_now,
      author_display_name = v_submission.author_display_name,
      age_rating = v_submission.age_rating_declared,
      license = v_submission.license
  WHERE id = v_submission.template_id;

  -- Audit log. `pii_access = false` — approving a public template is
  -- not a PII operation; the author's display name was already in the
  -- submission row by their consent.
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, pii_access, details)
  VALUES (
    v_admin,
    'template_submission.approved',
    'template_submission',
    p_submission_id::text,
    false,
    jsonb_build_object(
      'template_id', v_submission.template_id,
      'age_rating', v_submission.age_rating_declared,
      'author_display_name', v_submission.author_display_name
    )
  );

  RETURN v_submission.template_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_template_submission(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_template_submission(uuid) TO authenticated;

-- Reject: submission → 'rejected', template stays private (untouched).
CREATE OR REPLACE FUNCTION public.reject_template_submission(
  p_submission_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission public.template_submissions;
  v_now timestamptz := now();
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required: rejection must include a reason (min 3 chars)';
  END IF;

  SELECT * INTO v_submission
  FROM public.template_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_not_found: %', p_submission_id;
  END IF;
  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION 'illegal_state: submission is %, expected pending', v_submission.status;
  END IF;

  UPDATE public.template_submissions
  SET status = 'rejected',
      rejection_reason = btrim(p_reason),
      reviewed_at = v_now,
      reviewer_id = v_admin
  WHERE id = p_submission_id;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, pii_access, details)
  VALUES (
    v_admin,
    'template_submission.rejected',
    'template_submission',
    p_submission_id::text,
    false,
    jsonb_build_object(
      'template_id', v_submission.template_id,
      'reason', btrim(p_reason)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_template_submission(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reject_template_submission(uuid, text) TO authenticated;

-- Self-check after applying:
--   SELECT column_name, data_type, column_default FROM information_schema.columns
--     WHERE table_name = 'notifications' AND column_name = 'kind';
--     -- expect: kind / text / 'user'::text
--   SELECT conname FROM pg_constraint
--     WHERE conrelid = 'public.notifications'::regclass AND conname LIKE 'notifications_kind%';
--     -- expect: notifications_kind_check
--   SELECT indexname FROM pg_indexes
--     WHERE tablename = 'notifications' AND indexname = 'notifications_admin_unread_idx';
--     -- expect 1 row.
--   SELECT proname FROM pg_proc WHERE proname IN ('notify_admins', 'notify_admins_on_template_submission');
--     -- expect 2 rows.
--   SELECT tgname FROM pg_trigger
--     WHERE tgrelid = 'public.template_submissions'::regclass
--       AND tgname = 'template_submissions_notify_admins';
--     -- expect 1 row.
