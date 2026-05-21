-- E48.2 — Close TOCTOU race on the per-ticket attachment cap.
--
-- Background: functions/api/support-attachment-upload.ts pre-checks the
-- existing attachment count via SELECT count(*) before INSERT. With N
-- concurrent multipart POSTs targeting the same ticket each request can
-- observe count=0, pass the >= 3 guard, and INSERT — bypassing the cap.
-- TC-40 in specs/support/E48-security.md asserts at most 3 rows exist
-- after parallel uploads.
--
-- Fix: enforce the cap atomically at the DB layer via a BEFORE INSERT
-- trigger. The SELECT ... FOR UPDATE inside the trigger takes a
-- row-level lock on every existing attachment row for the ticket, so
-- concurrent INSERTs on the same ticket_id serialise — the second
-- transaction reads the first's not-yet-visible row after the first
-- commits (or rolls back), making the count check authoritative.
--
-- The CF function keeps its pre-check as a fast-path (skips the storage
-- upload work when clearly over cap) but now also recognises the
-- trigger-raised exception and returns the same friendly 400 response.
-- ERRCODE is 'check_violation' so the function can distinguish it from
-- a generic insert failure (unique violations, FK violations, etc.).

CREATE OR REPLACE FUNCTION public.enforce_attachment_cap_per_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.support_ticket_attachments
    WHERE ticket_id = NEW.ticket_id
    FOR UPDATE;
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'attachment_limit_reached' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_attachment_cap_per_ticket_trg
  ON public.support_ticket_attachments;

CREATE TRIGGER enforce_attachment_cap_per_ticket_trg
  BEFORE INSERT ON public.support_ticket_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_attachment_cap_per_ticket();
