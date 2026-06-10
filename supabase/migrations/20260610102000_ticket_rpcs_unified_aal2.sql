-- SEC-2026-06 (2) — E48 ticket RPCs: swap literal auth.jwt()->>'aal'
-- checks for public.is_aal2().
--
-- The route guard (getAALStatus) accepts the backup-code recovery
-- window (aal2_via_backup_until app metadata) as AAL2, but these RPCs
-- checked the raw JWT claim only — a backup-code-recovered admin could
-- open /admin yet every ticket mutation returned 403. is_aal2()
-- (20260610100000) implements the guard's exact semantics in-database.
--
-- Function bodies are otherwise byte-identical to their latest
-- definitions (transition_ticket_status from 20260521260000;
-- assign/unassign/request_attachment_signed_url from 20260522170000).

-- ============================================================================
-- transition_ticket_status (admin + AAL2; state-machine enforced)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transition_ticket_status(
  p_ticket_id uuid,
  p_new_status public.support_ticket_status,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_status public.support_ticket_status;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;

  IF NOT public.is_aal2() THEN
    RAISE EXCEPTION 'not_authorized: aal2 required';
  END IF;

  SELECT status INTO v_old_status FROM public.support_tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF NOT (
    (v_old_status = 'new' AND p_new_status = 'in_progress') OR
    (v_old_status = 'in_progress' AND p_new_status IN ('waiting_user', 'resolved')) OR
    (v_old_status = 'waiting_user' AND p_new_status IN ('in_progress', 'resolved')) OR
    (v_old_status = 'resolved' AND p_new_status IN ('reopened', 'archived')) OR
    (v_old_status = 'reopened' AND p_new_status = 'in_progress') OR
    (v_old_status = 'archived' AND p_new_status = 'reopened')
  ) THEN
    RAISE EXCEPTION 'invalid_transition: % -> %', v_old_status, p_new_status;
  END IF;

  UPDATE public.support_tickets
  SET status = p_new_status,
      resolved_at = CASE WHEN p_new_status = 'resolved' THEN now() ELSE resolved_at END,
      archived_at = CASE WHEN p_new_status = 'archived' THEN now() ELSE archived_at END
  WHERE id = p_ticket_id;

  PERFORM public.log_audit_event(
    'support_ticket_status_transitioned',
    'support_tickets',
    p_ticket_id::text,
    true,
    jsonb_build_object(
      'from_status', v_old_status,
      'to_status', p_new_status,
      'note', p_note
    )
  );

  RETURN jsonb_build_object(
    'ticket_id', p_ticket_id,
    'from_status', v_old_status,
    'to_status', p_new_status
  );
END;
$$;

-- ============================================================================
-- request_attachment_signed_url (admin + AAL2)
-- ============================================================================

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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;

  IF NOT public.is_aal2() THEN
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

-- ============================================================================
-- assign_admin_to_ticket (admin + AAL2)
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
  v_ticket_exists boolean;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;
  IF NOT public.is_aal2() THEN
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

-- ============================================================================
-- unassign_admin_from_ticket (admin + AAL2)
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
  v_deleted integer;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;
  IF NOT public.is_aal2() THEN
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
