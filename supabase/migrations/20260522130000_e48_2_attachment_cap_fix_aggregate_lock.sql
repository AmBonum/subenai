-- E48.2 — Fix TOCTOU attachment cap trigger.
--
-- Incident: Production 500 errors on every attachment upload. Root cause:
-- PostgreSQL 0A000 (feature_not_supported). Migration 20260522100000 used
-- SELECT count(*) ... FOR UPDATE, which is invalid syntax in PG —
-- FOR UPDATE locks rows, but aggregate functions return a single computed value,
-- not rows. The trigger failed on every INSERT attempt.
--
-- Fix: Serialize concurrent inserts on the same ticket by locking the parent
-- ticket row (PERFORM 1 ... FOR UPDATE on support_tickets), then safely count
-- attachments. This pattern avoids the aggregate+lock conflict.
--
-- Note: The original migration 20260522100000 may have been applied before
-- this fix was discovered; this new migration ensures the corrected function
-- body is in place and recorded in migration history.

CREATE OR REPLACE FUNCTION public.enforce_attachment_cap_per_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Acquire row lock on the parent ticket. PERFORM doesn't run an
  -- aggregate, so FOR UPDATE is legal here (PostgreSQL 0A000 forbids
  -- FOR UPDATE with aggregate functions). Concurrent attachment inserts
  -- for the same ticket_id will serialise on this row lock, ensuring
  -- the count check below is authoritative and the cap is enforced.
  PERFORM 1 FROM public.support_tickets
    WHERE id = NEW.ticket_id
    FOR UPDATE;

  -- Now safely count existing attachments — no conflict between
  -- lock + aggregate.
  SELECT count(*) INTO v_count
    FROM public.support_ticket_attachments
    WHERE ticket_id = NEW.ticket_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'attachment_limit_reached' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
