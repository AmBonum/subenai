-- E48-v3 — Multi-assignee support tickets + inline attachment viewer support.
--
-- Replaces the single-admin `support_tickets.assigned_to` column with a
-- proper junction table `support_ticket_assignees`. Adds three RPCs
-- (assign / unassign / list_admin_users) all gated by admin + AAL2 (for
-- write ops) or admin (for list). Adds an audit trigger on the junction
-- table as defense-in-depth so direct table writes (e.g. via SQL editor
-- with service_role) cannot bypass audit. Replaces the legacy
-- `support_tickets_immutability_and_audit` trigger with a version that
-- no longer references the dropped `assigned_to` column. Extends
-- `request_attachment_signed_url` with a `p_inline` boolean (default
-- false; backward-compatible) so the admin detail page can render
-- images/PDFs inline instead of forcing download. Adds a
-- `support_tickets_with_assignees` security_invoker view that joins
-- assignees as a JSONB aggregate for queue rendering.
--
-- Backfills the junction table from existing `assigned_to` rows BEFORE
-- dropping the column so no assignments are lost.

-- ============================================================================
-- JUNCTION TABLE — support_ticket_assignees
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_ticket_assignees (
  ticket_id   uuid        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)             ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid                 REFERENCES auth.users(id)             ON DELETE SET NULL,
  PRIMARY KEY (ticket_id, user_id)
);

COMMENT ON TABLE public.support_ticket_assignees IS
  'Multi-assignment relationship between support_tickets and admin auth.users. Replaces support_tickets.assigned_to (dropped in same migration).';

CREATE INDEX IF NOT EXISTS support_ticket_assignees_user_idx
  ON public.support_ticket_assignees (user_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS support_ticket_assignees_assigned_by_idx
  ON public.support_ticket_assignees (assigned_by) WHERE assigned_by IS NOT NULL;

ALTER TABLE public.support_ticket_assignees ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_ticket_assignees FROM anon;
GRANT SELECT ON public.support_ticket_assignees TO authenticated;

DROP POLICY IF EXISTS support_ticket_assignees_admin_select ON public.support_ticket_assignees;
CREATE POLICY support_ticket_assignees_admin_select ON public.support_ticket_assignees
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- AUDIT TRIGGER on junction table (defense-in-depth — bypasses-proof)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.support_ticket_assignees_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id       uuid := auth.uid();
  v_actor_name     text;
  v_assignee_email text;
BEGIN
  SELECT COALESCE(display_name, email, v_actor_id::text)
    INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

  IF TG_OP = 'INSERT' THEN
    SELECT email INTO v_assignee_email FROM auth.users WHERE id = NEW.user_id;
    INSERT INTO public.audit_log (
      actor_id, actor_name, action, target_type, target_id, pii_access, details, at
    ) VALUES (
      v_actor_id, v_actor_name, 'support_ticket_assigned',
      'support_tickets', NEW.ticket_id::text, false,
      jsonb_build_object(
        'assignee_id',    NEW.user_id,
        'assignee_email', v_assignee_email,
        'assigned_by',    NEW.assigned_by
      ),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT email INTO v_assignee_email FROM auth.users WHERE id = OLD.user_id;
    INSERT INTO public.audit_log (
      actor_id, actor_name, action, target_type, target_id, pii_access, details, at
    ) VALUES (
      v_actor_id, v_actor_name, 'support_ticket_unassigned',
      'support_tickets', OLD.ticket_id::text, false,
      jsonb_build_object(
        'assignee_id',    OLD.user_id,
        'assignee_email', v_assignee_email
      ),
      now()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_assignees_audit_trg ON public.support_ticket_assignees;
CREATE TRIGGER support_ticket_assignees_audit_trg
  AFTER INSERT OR DELETE ON public.support_ticket_assignees
  FOR EACH ROW EXECUTE FUNCTION public.support_ticket_assignees_audit();

-- ============================================================================
-- BACKFILL from existing assigned_to (before dropping the column)
-- ============================================================================

INSERT INTO public.support_ticket_assignees (ticket_id, user_id, assigned_at, assigned_by)
SELECT id, assigned_to, COALESCE(updated_at, created_at), NULL
FROM public.support_tickets
WHERE assigned_to IS NOT NULL
ON CONFLICT (ticket_id, user_id) DO NOTHING;

-- ============================================================================
-- REPLACE legacy immutability+audit trigger (drops assigned_to references)
-- ============================================================================

DROP TRIGGER IF EXISTS support_tickets_immutability_and_audit_trg ON public.support_tickets;

CREATE OR REPLACE FUNCTION public.support_tickets_immutability_and_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_name text;
BEGIN
  IF NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.submitter_email IS DISTINCT FROM OLD.submitter_email
     OR NEW.submitter_name IS DISTINCT FROM OLD.submitter_name
     OR NEW.submitter_user_id IS DISTINCT FROM OLD.submitter_user_id
     OR NEW.view_token_hash IS DISTINCT FROM OLD.view_token_hash
     OR NEW.view_token_expires_at IS DISTINCT FROM OLD.view_token_expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.source IS DISTINCT FROM OLD.source THEN
    RAISE EXCEPTION 'immutable_field_changed: subject/body/email/name/category/source/view_token are immutable post-insert';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.view_token_invalidated_at IS DISTINCT FROM OLD.view_token_invalidated_at THEN
    SELECT COALESCE(display_name, email, v_actor_id::text) INTO v_actor_name
      FROM public.profiles WHERE id = v_actor_id;
    INSERT INTO public.audit_log (
      actor_id, actor_name, action, target_type, target_id, pii_access, details, at
    ) VALUES (
      v_actor_id, v_actor_name, 'support_ticket_modified', 'support_tickets', NEW.id::text, true,
      jsonb_strip_nulls(jsonb_build_object(
        'status', CASE WHEN NEW.status IS DISTINCT FROM OLD.status
          THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) END,
        'deleted_at', CASE WHEN NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
          THEN jsonb_build_object('from', OLD.deleted_at, 'to', NEW.deleted_at) END,
        'archived_at', CASE WHEN NEW.archived_at IS DISTINCT FROM OLD.archived_at
          THEN jsonb_build_object('from', OLD.archived_at, 'to', NEW.archived_at) END,
        'view_token_invalidated_at', CASE WHEN NEW.view_token_invalidated_at IS DISTINCT FROM OLD.view_token_invalidated_at
          THEN jsonb_build_object('from', OLD.view_token_invalidated_at, 'to', NEW.view_token_invalidated_at) END
      )),
      now()
    );
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_immutability_and_audit_trg
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_immutability_and_audit();

-- ============================================================================
-- DROP legacy assigned_to column + its index
-- ============================================================================

DROP INDEX IF EXISTS public.support_tickets_assigned_to_idx;
ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS assigned_to;

-- ============================================================================
-- RPC — assign_admin_to_ticket (admin + AAL2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_admin_to_ticket(
  p_ticket_id uuid,
  p_user_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_aal           text := (auth.jwt() ->> 'aal');
  v_ticket_exists boolean;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;
  IF v_aal IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'not_authorized: aal2 required';
  END IF;
  IF NOT public.has_role(p_user_id, 'admin') THEN
    RAISE EXCEPTION 'invalid_assignee: target user is not an admin';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = p_ticket_id AND deleted_at IS NULL
  ) INTO v_ticket_exists;
  IF NOT v_ticket_exists THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  INSERT INTO public.support_ticket_assignees (ticket_id, user_id, assigned_by)
  VALUES (p_ticket_id, p_user_id, v_uid)
  ON CONFLICT (ticket_id, user_id) DO NOTHING;

  UPDATE public.support_tickets SET updated_at = now() WHERE id = p_ticket_id;

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'user_id', p_user_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_admin_to_ticket(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.assign_admin_to_ticket(uuid, uuid) TO authenticated;

-- ============================================================================
-- RPC — unassign_admin_from_ticket (admin + AAL2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.unassign_admin_from_ticket(
  p_ticket_id uuid,
  p_user_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid     uuid    := auth.uid();
  v_aal     text    := (auth.jwt() ->> 'aal');
  v_deleted integer;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;
  IF v_aal IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'not_authorized: aal2 required';
  END IF;

  DELETE FROM public.support_ticket_assignees
   WHERE ticket_id = p_ticket_id AND user_id = p_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    UPDATE public.support_tickets SET updated_at = now() WHERE id = p_ticket_id;
  END IF;

  RETURN jsonb_build_object(
    'ticket_id', p_ticket_id,
    'user_id',   p_user_id,
    'removed',   v_deleted > 0
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unassign_admin_from_ticket(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.unassign_admin_from_ticket(uuid, uuid) TO authenticated;

-- ============================================================================
-- RPC — list_admin_users (admin only; AAL2 not required for read-only listing)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (user_id uuid, email text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.display_name, u.raw_user_meta_data ->> 'display_name', u.email::text)
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL
  ORDER BY 3;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_admin_users() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;

-- ============================================================================
-- RPC — request_attachment_signed_url (extended with p_inline variant)
-- ============================================================================
-- Backward-compatible: p_inline defaults to false so existing callers
-- (which omit the parameter) get the same attachment-disposition behaviour
-- they had before. New callers passing p_inline=true receive the same
-- payload plus an `inline: true` flag — the client (admin UI) honours this
-- by omitting the `download` option when calling supabase.storage.createSignedUrl,
-- so the browser renders images/PDFs inline instead of forcing download.
-- The signed URL itself is still minted client-side; the RPC's job is
-- (a) authorization gating (admin + AAL2 + scan_status='clean')
-- (b) audit logging
-- (c) returning storage_path/filename/mime_type/inline flag.

CREATE OR REPLACE FUNCTION public.request_attachment_signed_url(
  p_attachment_id uuid,
  p_inline        boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attachment public.support_ticket_attachments;
  v_uid uuid := auth.uid();
  v_aal text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;

  v_aal := (auth.jwt() ->> 'aal');
  IF v_aal IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'not_authorized: aal2 required';
  END IF;

  SELECT * INTO v_attachment FROM public.support_ticket_attachments
  WHERE id = p_attachment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_attachment.scan_status <> 'clean' THEN
    RAISE EXCEPTION 'not_clean';
  END IF;

  PERFORM public.log_audit_event(
    'support_attachment_download_url_issued',
    'support_ticket_attachments',
    v_attachment.id::text,
    true,
    jsonb_build_object(
      'ticket_id', v_attachment.ticket_id,
      'filename',  v_attachment.filename,
      'inline',    p_inline
    )
  );

  RETURN jsonb_build_object(
    'storage_path', v_attachment.storage_path,
    'filename',     v_attachment.filename,
    'mime_type',    v_attachment.mime_type,
    'inline',       p_inline
  );
END;
$$;

-- Drop the old single-arg overload so PostgREST schema cache resolves to the
-- new signature unambiguously. The 2-arg form covers the 1-arg call via the
-- p_inline DEFAULT false, so existing callers keep working.
DROP FUNCTION IF EXISTS public.request_attachment_signed_url(uuid);

REVOKE EXECUTE ON FUNCTION public.request_attachment_signed_url(uuid, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.request_attachment_signed_url(uuid, boolean) TO authenticated;

-- ============================================================================
-- VIEW — support_tickets_with_assignees (security_invoker; admin RLS applies)
-- ============================================================================

CREATE OR REPLACE VIEW public.support_tickets_with_assignees
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.created_at,
  t.updated_at,
  t.status,
  t.category,
  t.source,
  t.subject,
  t.body,
  t.submitter_user_id,
  t.submitter_email,
  t.submitter_name,
  t.archived_at,
  t.deleted_at,
  t.resolved_at,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id',      a.user_id,
          'email',        u.email,
          'display_name', COALESCE(p.display_name, u.raw_user_meta_data ->> 'display_name', u.email),
          'assigned_at',  a.assigned_at
        ) ORDER BY a.assigned_at
      )
      FROM public.support_ticket_assignees a
      LEFT JOIN auth.users u ON u.id = a.user_id
      LEFT JOIN public.profiles p ON p.id = a.user_id
      WHERE a.ticket_id = t.id
    ),
    '[]'::jsonb
  ) AS assignees,
  EXISTS (
    SELECT 1 FROM public.support_ticket_assignees a WHERE a.ticket_id = t.id
  ) AS is_assigned,
  -- First assignee's display_name (sorted by assigned_at) — used for queue sortability.
  (
    SELECT COALESCE(p.display_name, u.raw_user_meta_data ->> 'display_name', u.email)
    FROM public.support_ticket_assignees a
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN public.profiles p ON p.id = a.user_id
    WHERE a.ticket_id = t.id
    ORDER BY a.assigned_at
    LIMIT 1
  ) AS first_assignee_display_name
FROM public.support_tickets t;

REVOKE ALL    ON public.support_tickets_with_assignees FROM anon;
GRANT  SELECT ON public.support_tickets_with_assignees TO authenticated;
