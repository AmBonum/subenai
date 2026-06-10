-- SEC-2026-06 (8) — get_ticket_thread_for_view_token: explicit ticket
-- projection instead of to_jsonb(row) minus a denylist.
--
-- The previous payload built the ticket object as
-- `to_jsonb(v_ticket) - 'view_token_hash' - ...` — a denylist. Any
-- column added to support_tickets later (or simply forgotten, like
-- ip_country and user_agent today) leaked to every anonymous caller
-- holding a view token. The public thread page
-- (src/routes/contact-form.ticket.$id.lazy.tsx, ThreadTicket interface)
-- consumes exactly: id, subject, body, category, status, created_at,
-- submitter_email, submitter_name. Project only those — an allowlist
-- fails closed when the schema grows.
--
-- Everything else (token gate, audit-after-FOUND ordering per E48 audit
-- A5, is_internal filter per E48-v4) is unchanged from 20260522180000.

CREATE OR REPLACE FUNCTION public.get_ticket_thread_for_view_token(
  p_ticket_id uuid,
  p_view_token text,
  p_ip_country text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_token_hash text;
  v_ticket public.support_tickets;
BEGIN
  IF p_view_token IS NULL OR char_length(p_view_token) <> 64 THEN
    RETURN NULL;
  END IF;

  v_token_hash := encode(digest(p_view_token, 'sha256'), 'hex');

  SELECT * INTO v_ticket FROM public.support_tickets
  WHERE id = p_ticket_id
    AND view_token_hash = v_token_hash
    AND view_token_expires_at > now()
    AND view_token_invalidated_at IS NULL
    AND deleted_at IS NULL;

  -- Security gate (E48 audit A5). The audit_log INSERT below MUST stay
  -- behind this guard. Anon has GRANT EXECUTE on this RPC; logging
  -- every probe would let unauthenticated callers pollute the audit
  -- trail by spraying random tokens.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.audit_log (
    actor_id, actor_name, action, target_type, target_id, pii_access, details, at
  ) VALUES (
    NULL, 'anon-view-token', 'support_ticket_view_token_used',
    'support_tickets', v_ticket.id::text, false,
    jsonb_build_object('ip_country', p_ip_country),
    now()
  );

  RETURN jsonb_build_object(
    'ticket', jsonb_build_object(
      'id',              v_ticket.id,
      'subject',         v_ticket.subject,
      'body',            v_ticket.body,
      'category',        v_ticket.category,
      'status',          v_ticket.status,
      'created_at',      v_ticket.created_at,
      'submitter_email', v_ticket.submitter_email,
      'submitter_name',  v_ticket.submitter_name
    ),
    'messages', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'created_at', m.created_at,
        'author_kind', m.author_kind,
        'author_name', m.author_name,
        'body', m.body
      ) ORDER BY m.created_at), '[]'::jsonb)
      FROM public.support_ticket_messages m
      WHERE m.ticket_id = v_ticket.id
        AND m.is_internal = false
    ),
    'attachments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', a.id,
        'filename', a.filename,
        'mime_type', a.mime_type,
        'size_bytes', a.size_bytes,
        'scan_status', a.scan_status,
        'created_at', a.created_at
      )), '[]'::jsonb)
      FROM public.support_ticket_attachments a
      WHERE a.ticket_id = v_ticket.id
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_ticket_thread_for_view_token(uuid, text, text) IS
'E48 anonymous ticket thread reader. SECURITY DEFINER, gated by SHA-256 view-token compare. audit_log INSERT must remain AFTER the IF NOT FOUND guard (E48 audit A5). E48-v4: messages subquery filters is_internal=false. SEC-2026-06: ticket payload is an explicit jsonb_build_object allowlist — never to_jsonb(row) minus columns, which leaks new/forgotten columns (ip_country, user_agent) to anon.';

NOTIFY pgrst, 'reload schema';
