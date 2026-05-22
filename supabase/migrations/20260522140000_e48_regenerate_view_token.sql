-- E48 bugfix — regenerate_support_ticket_view_token
--
-- Mints a fresh plaintext token, updates view_token_hash + view_token_expires_at,
-- clears view_token_invalidated_at, and returns the plaintext so the CF function
-- can embed it directly in the notification email URL.
--
-- Called exclusively by the service_role (CF function).  Old email links from
-- previous notifications stop working after a call — acceptable security trade-off
-- (rotating tokens is a stricter posture than keeping a stale one).

CREATE OR REPLACE FUNCTION public.regenerate_support_ticket_view_token(p_ticket_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_token text;
  v_hash  text;
  v_role  text := auth.role();
BEGIN
  IF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'unauthorized_role: %', v_role;
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash  := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE public.support_tickets
     SET view_token_hash         = v_hash,
         view_token_expires_at   = now() + interval '90 days',
         view_token_invalidated_at = NULL
   WHERE id         = p_ticket_id
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_not_found_or_deleted';
  END IF;

  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regenerate_support_ticket_view_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.regenerate_support_ticket_view_token(uuid) TO service_role;

COMMENT ON FUNCTION public.regenerate_support_ticket_view_token(uuid) IS
'E48 bugfix: mints a new view_token on every admin reply so the notification email URL carries a valid ?token= param. service_role only. search_path includes extensions because gen_random_bytes/digest live in the extensions schema on Supabase.';
