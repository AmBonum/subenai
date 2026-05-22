-- E48-v4 — Internal notes on support ticket threads.
--
-- Adds `is_internal boolean NOT NULL DEFAULT false` to
-- public.support_ticket_messages so admins can leave thread comments that
-- the anonymous submitter NEVER sees and that DO NOT trigger a Resend
-- email (the CF function checks the flag).
--
-- Also patches public.get_ticket_thread_for_view_token — the only path
-- the anon submitter has to read the thread — to filter out internal
-- notes at the source. Signature and security model are preserved so
-- existing PostgREST clients keep working without a regenerated client.

-- ----------------------------------------------------------------------
-- Column
-- ----------------------------------------------------------------------

ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.support_ticket_messages.is_internal IS
'E48-v4 internal note flag. When true, message is admin-only: hidden from anon view-token reader and skipped by the reply CF function''s Resend dispatch.';

-- ----------------------------------------------------------------------
-- View-token RPC — filter internal notes from anon callers
-- ----------------------------------------------------------------------
-- CREATE OR REPLACE preserves the existing signature, SECURITY DEFINER
-- model, and GRANTs (anon, authenticated). The only behavioural delta is
-- the `WHERE m.is_internal = false` clause inside the messages jsonb_agg
-- subquery.

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
    'ticket', to_jsonb(v_ticket) - 'view_token_hash' - 'view_token_expires_at' - 'view_token_invalidated_at',
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

REVOKE EXECUTE ON FUNCTION public.get_ticket_thread_for_view_token(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ticket_thread_for_view_token(uuid, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_ticket_thread_for_view_token(uuid, text, text) IS
'E48 anonymous ticket thread reader. SECURITY DEFINER, gated by SHA-256 view-token compare. audit_log INSERT must remain AFTER the IF NOT FOUND guard (E48 audit A5). E48-v4: messages subquery filters is_internal=false so internal admin notes never leak to anon callers.';

NOTIFY pgrst, 'reload schema';
