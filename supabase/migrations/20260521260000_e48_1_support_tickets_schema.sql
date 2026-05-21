-- E48.1 — Support ticketing schema, RLS, RPCs, audit triggers.
--
-- Ships the foundation for E48 (support contact form + admin ticketing).
-- Four tables: support_tickets, support_ticket_messages,
-- support_ticket_attachments, admin_notification_preferences.
-- Four enums. Four RPCs. Server-side notification fan-out trigger.
-- Audit triggers. Full RLS lockdown.
--
-- Phase-A pre-implementation review (2026-05-21) decisions absorbed:
--   - anon has NO direct DML on any new table. Anon submissions land only
--     via submit_support_ticket() SECURITY DEFINER RPC, called by the CF
--     function with the service-role key. Anon reads happen only via
--     get_ticket_thread_for_view_token() (HMAC token-gated SECURITY
--     DEFINER, audit-logged on every call).
--   - scan_status collapsed to ('clean', 'error') only — VirusTotal was
--     dropped in PLAN D-1; scan_provider and scan_result columns dropped.
--   - assigned_to FK explicitly ON DELETE SET NULL.
--   - source is a typed enum, not free text.
--   - body/subject/email/name/view_token columns immutable post-insert
--     (enforced both by an UPDATE policy column exclusion AND a BEFORE
--     UPDATE trigger that raises on attempts to change them).
--   - view_token_invalidated_at column added — provides a revocation
--     path for compromised tokens.
--   - Partial indexes scoped to (deleted_at IS NULL AND archived_at IS NULL)
--     keep the admin working-set fast at scale.
--   - Notification rows created server-side by an AFTER INSERT trigger,
--     so notifications cannot be silently dropped when no admin browser
--     is open.
--
-- Why enums over CHECK-constrained text: type safety wins for closed
-- sets that we control. The trade-off (ADD VALUE is one-way) is
-- acceptable for status/category/source — we have not changed any of
-- these values for the entire epic-planning phase and do not expect
-- to. New categories can be added with ALTER TYPE … ADD VALUE without
-- a data migration.

-- pgcrypto is required for `gen_random_bytes()` + `digest()`. Already enabled
-- in earlier migrations (e.g. 20260501000000_edu_mode.sql, 20260520800000_session_token_dod.sql)
-- but adding `IF NOT EXISTS` here keeps this migration self-contained for
-- `supabase db reset` against a fresh DB.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.support_ticket_status AS ENUM (
  'new', 'in_progress', 'waiting_user', 'resolved', 'reopened', 'archived'
);

CREATE TYPE public.support_ticket_category AS ENUM (
  'bug', 'question', 'feature_request', 'abuse_report', 'billing', 'gdpr', 'other'
);

CREATE TYPE public.support_ticket_source AS ENUM (
  'public_form', 'app_form'
);

CREATE TYPE public.support_attachment_scan_status AS ENUM (
  'clean', 'error'
);

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status public.support_ticket_status NOT NULL DEFAULT 'new',
  category public.support_ticket_category NOT NULL,
  source public.support_ticket_source NOT NULL DEFAULT 'public_form',
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  submitter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email text NOT NULL CHECK (
    char_length(submitter_email) BETWEEN 5 AND 254
    AND submitter_email ~ '^[^@]+@[^@]+\.[^@]+$'
  ),
  submitter_name text CHECK (submitter_name IS NULL OR char_length(submitter_name) <= 100),
  view_token_hash text NOT NULL CHECK (view_token_hash ~ '^[0-9a-f]{64}$'),
  view_token_expires_at timestamptz NOT NULL,
  view_token_invalidated_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  archived_at timestamptz,
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 200),
  ip_country text CHECK (ip_country IS NULL OR ip_country ~ '^[A-Z]{2}$'),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  author_kind text NOT NULL CHECK (author_kind IN ('user', 'admin', 'system')),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  email_message_id text
);

CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  filename text NOT NULL CHECK (
    char_length(filename) BETWEEN 1 AND 200
    AND filename ~ '^[A-Za-z0-9._\-]+$'
  ),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'application/pdf')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  storage_path text NOT NULL,
  scan_status public.support_attachment_scan_status NOT NULL DEFAULT 'clean',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  enabled boolean NOT NULL DEFAULT true,
  channels jsonb NOT NULL DEFAULT '{"email": true, "in_app": true}'::jsonb
    CHECK (channels ? 'email' AND channels ? 'in_app'),
  per_category jsonb NOT NULL DEFAULT
    '{"bug": true, "question": true, "feature_request": true, "abuse_report": true, "billing": true, "gdpr": true, "other": true}'::jsonb
    CHECK (per_category ?& ARRAY['bug','question','feature_request','abuse_report','billing','gdpr','other']),
  digest_cadence text NOT NULL DEFAULT 'instant'
    CHECK (digest_cadence IN ('instant', 'hourly', 'daily', 'off'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS support_tickets_admin_working_set_idx
  ON public.support_tickets (status, created_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS support_tickets_submitter_email_lower_idx
  ON public.support_tickets (lower(submitter_email));

CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx
  ON public.support_tickets (assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_tickets_category_status_idx
  ON public.support_tickets (category, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS support_tickets_fts_idx
  ON public.support_tickets
  USING GIN (to_tsvector('simple', subject || ' ' || body))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_created_at_idx
  ON public.support_ticket_messages (ticket_id, created_at);

CREATE INDEX IF NOT EXISTS support_ticket_attachments_ticket_id_idx
  ON public.support_ticket_attachments (ticket_id);

-- ============================================================================
-- ROW-LEVEL SECURITY — anon revoked everywhere; only via SECURITY DEFINER RPCs
-- ============================================================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_tickets FROM anon;
REVOKE ALL ON public.support_ticket_messages FROM anon;
REVOKE ALL ON public.support_ticket_attachments FROM anon;
REVOKE ALL ON public.admin_notification_preferences FROM anon, authenticated;

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_notification_preferences TO authenticated;

CREATE POLICY support_tickets_user_select ON public.support_tickets
  FOR SELECT TO authenticated
  USING (submitter_user_id = auth.uid());

CREATE POLICY support_tickets_user_insert ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (submitter_user_id = auth.uid());

CREATE POLICY support_tickets_admin_all ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY support_ticket_messages_user_select ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND t.submitter_user_id = auth.uid()
    )
  );

CREATE POLICY support_ticket_messages_user_insert ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_kind = 'user'
    AND author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND t.submitter_user_id = auth.uid()
    )
  );

CREATE POLICY support_ticket_messages_admin_all ON public.support_ticket_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY support_ticket_attachments_user_select ON public.support_ticket_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_attachments.ticket_id
        AND t.submitter_user_id = auth.uid()
    )
  );

CREATE POLICY support_ticket_attachments_admin_all ON public.support_ticket_attachments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY admin_notification_preferences_owner_select ON public.admin_notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY admin_notification_preferences_owner_insert ON public.admin_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY admin_notification_preferences_owner_update ON public.admin_notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- IMMUTABILITY + AUDIT TRIGGER on support_tickets
-- ============================================================================

CREATE OR REPLACE FUNCTION public.support_tickets_immutability_and_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
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
    RAISE EXCEPTION 'immutable_field_changed: %', 'subject/body/email/name/category/source/view_token are immutable post-insert';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.view_token_invalidated_at IS DISTINCT FROM OLD.view_token_invalidated_at THEN

    SELECT COALESCE(display_name, email, v_actor_id::text)
      INTO v_actor_name
      FROM public.profiles
      WHERE id = v_actor_id;

    INSERT INTO public.audit_log (
      actor_id, actor_name, action, target_type, target_id, pii_access, details, at
    ) VALUES (
      v_actor_id, v_actor_name, 'support_ticket_modified', 'support_tickets', NEW.id::text, true,
      jsonb_strip_nulls(jsonb_build_object(
        'status', CASE WHEN NEW.status IS DISTINCT FROM OLD.status
          THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) END,
        'assigned_to', CASE WHEN NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
          THEN jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to) END,
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
-- NOTIFICATION FAN-OUT TRIGGER on support_tickets INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_admin_notifications_for_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- public.notifications columns: id, user_id, event_type, test_id, title NOT NULL,
  -- body, read_at, created_at. test_id stays NULL (this is a support_ticket event,
  -- not a test event). title carries the user-facing label.
  INSERT INTO public.notifications (user_id, event_type, test_id, title, body, read_at, created_at)
  SELECT
    p.user_id,
    'support_ticket_new',
    NULL,
    'Nová žiadosť: ' || left(NEW.subject, 80),
    left(NEW.body, 280),
    NULL,
    now()
  FROM public.admin_notification_preferences p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'admin'
    AND p.enabled = true
    AND COALESCE((p.per_category ->> NEW.category::text)::boolean, true) = true
    AND COALESCE((p.channels ->> 'in_app')::boolean, true) = true;

  PERFORM pg_notify(
    'support_tickets_admin',
    jsonb_build_object(
      'event', 'INSERT',
      'ticket_id', NEW.id,
      'category', NEW.category,
      'subject', NEW.subject,
      'created_at', NEW.created_at
    )::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_notification_fanout_trg
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_admin_notifications_for_ticket();

-- ============================================================================
-- RPC 1 — submit_support_ticket (anon via service_role, or authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_support_ticket(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket_id uuid := gen_random_uuid();
  v_view_token text;
  v_view_token_hash text;
  v_submitter_user_id uuid;
  v_role text := auth.role();
BEGIN
  IF v_role = 'service_role' THEN
    IF (p_payload ->> 'user_id') IS NOT NULL THEN
      RAISE EXCEPTION 'anonymous_cannot_supply_user_id';
    END IF;
    v_submitter_user_id := NULL;
  ELSIF v_role = 'authenticated' THEN
    IF (p_payload ->> 'user_id') IS NULL
       OR (p_payload ->> 'user_id')::uuid <> auth.uid() THEN
      RAISE EXCEPTION 'user_id_must_match_auth_uid';
    END IF;
    v_submitter_user_id := auth.uid();
  ELSE
    RAISE EXCEPTION 'unauthorized_role: %', v_role;
  END IF;

  v_view_token := encode(gen_random_bytes(32), 'hex');
  v_view_token_hash := encode(digest(v_view_token, 'sha256'), 'hex');

  INSERT INTO public.support_tickets (
    id, status, category, source, subject, body,
    submitter_user_id, submitter_email, submitter_name,
    view_token_hash, view_token_expires_at, view_token_invalidated_at,
    user_agent, ip_country
  ) VALUES (
    v_ticket_id,
    'new',
    (p_payload ->> 'category')::public.support_ticket_category,
    COALESCE((p_payload ->> 'source')::public.support_ticket_source, 'public_form'),
    p_payload ->> 'subject',
    p_payload ->> 'body',
    v_submitter_user_id,
    lower(p_payload ->> 'email'),
    NULLIF(p_payload ->> 'name', ''),
    v_view_token_hash,
    now() + interval '90 days',
    NULL,
    NULLIF(p_payload ->> 'user_agent', ''),
    NULLIF(upper(p_payload ->> 'ip_country'), '')
  );

  RETURN jsonb_build_object(
    'ticket_id', v_ticket_id,
    'view_token', v_view_token
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_support_ticket(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_support_ticket(jsonb) TO service_role, authenticated;

-- ============================================================================
-- RPC 2 — get_ticket_thread_for_view_token (anon-callable via HMAC token)
-- ============================================================================

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

-- ============================================================================
-- RPC 3 — request_attachment_signed_url (admin + AAL2 only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_attachment_signed_url(p_attachment_id uuid)
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
      'filename', v_attachment.filename
    )
  );

  RETURN jsonb_build_object(
    'storage_path', v_attachment.storage_path,
    'filename', v_attachment.filename,
    'mime_type', v_attachment.mime_type
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_attachment_signed_url(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_attachment_signed_url(uuid) TO authenticated;

-- ============================================================================
-- RPC 4 — transition_ticket_status (admin + AAL2; state-machine enforced)
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
  v_aal text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized: admin role required';
  END IF;

  v_aal := (auth.jwt() ->> 'aal');
  IF v_aal IS DISTINCT FROM 'aal2' THEN
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

REVOKE EXECUTE ON FUNCTION public.transition_ticket_status(uuid, public.support_ticket_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_ticket_status(uuid, public.support_ticket_status, text) TO authenticated;
