-- E48 security audit A5 — audit_log INSERT must happen AFTER the FOUND
-- check inside public.get_ticket_thread_for_view_token, not before.
--
-- Background: the RPC is granted EXECUTE to `anon`, so any client on
-- the internet can call it with an arbitrary (ticket_id, view_token)
-- pair. If the audit_log row is written unconditionally — i.e. before
-- the FOUND check — an attacker can spray random tokens and pollute
-- the audit_log table with one row per probe, drowning real signal in
-- noise and burning Supabase log-storage quota.
--
-- The original migration (20260521260000) already happens to insert
-- AFTER the FOUND check, but the ordering is load-bearing and
-- security-critical. This migration re-asserts the safe ordering and
-- adds a `COMMENT ON FUNCTION` documenting why so future edits can't
-- silently regress it without tripping over the explanation.
--
-- No schema change. CREATE OR REPLACE FUNCTION with identical body
-- ordering except a clarifying SQL comment.

CREATE OR REPLACE FUNCTION public.get_ticket_thread_for_view_token(
  p_ticket_id uuid,
  p_view_token text,
  p_ip_country text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- Security gate (audit A5). The audit_log INSERT below MUST stay
  -- behind this guard. Anonymous callers can spray tokens; logging a
  -- row per probe would let them pollute the audit trail. Only log
  -- successful token uses, never failed lookups.
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
GRANT EXECUTE ON FUNCTION public.get_ticket_thread_for_view_token(uuid, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_ticket_thread_for_view_token(uuid, text, text) IS
'E48 anonymous ticket thread reader. SECURITY DEFINER, gated by SHA-256 view-token compare. audit_log INSERT must remain AFTER the IF NOT FOUND guard — otherwise anon callers can pollute the audit trail by spraying random tokens (E48 security audit, finding A5).';
