-- ============================================================================
-- SECURITY HARDENING — admin RLS branches on PII tables require AAL2
-- ============================================================================
--
-- Context (2026-06-12 security audit): the aal2/TOTP gate protected the
-- /admin UI route and the hardened RPCs (20260610101000/102000), but the
-- ~140 RLS policies keyed on has_role(auth.uid(), 'admin') granted full
-- table access at AAL1 — a plain password login with the admin role could
-- read every profile, ticket, GDPR request and audit row straight through
-- PostgREST. Made concretely exploitable by the leaked e2e admin password
-- (seed-e49-e2e-users.sql in this public repo, seeded to prod).
--
-- Fix: on every PII-bearing table, the admin branch becomes
--   has_role(auth.uid(), 'admin') AND public.is_aal2()
-- is_aal2() (20260610100000) honours both a real aal2 JWT and the
-- backup-code recovery window. Admin UI sessions are always aal2 (route
-- guard), CF Functions use the service role (bypasses RLS) — no app flow
-- regresses. Self-access branches (id = auth.uid() etc.) are untouched.
--
-- Scope: profiles, audit_log, dsr_requests, dpa_requests, reports,
-- pending_erasures, support_tickets, support_ticket_messages,
-- support_ticket_attachments, support_ticket_assignees.
-- Non-PII admin policies (CMS, blog, quiz config, packs) stay AAL1 —
-- widening those is cosmetic and would bloat the blast radius.
-- ============================================================================

-- profiles --------------------------------------------------------------
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  );

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  )
  WITH CHECK (
    id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  );

-- audit_log ---------------------------------------------------------------
DROP POLICY IF EXISTS audit_log_admin_read ON public.audit_log;
CREATE POLICY audit_log_admin_read ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- dsr_requests (admin read; the requester's own_select/own_insert stay) ---
DROP POLICY IF EXISTS dsr_requests_admin_read ON public.dsr_requests;
CREATE POLICY dsr_requests_admin_read ON public.dsr_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- reports -----------------------------------------------------------------
DROP POLICY IF EXISTS reports_admin_read ON public.reports;
CREATE POLICY reports_admin_read ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- dpa_requests --------------------------------------------------------------
DROP POLICY IF EXISTS dpa_requests_admin_read ON public.dpa_requests;
CREATE POLICY dpa_requests_admin_read ON public.dpa_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

DROP POLICY IF EXISTS dpa_requests_admin_update ON public.dpa_requests;
CREATE POLICY dpa_requests_admin_update ON public.dpa_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- pending_erasures ----------------------------------------------------------
DROP POLICY IF EXISTS pending_erasures_admin_read ON public.pending_erasures;
CREATE POLICY pending_erasures_admin_read ON public.pending_erasures
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- support_tickets -----------------------------------------------------------
DROP POLICY IF EXISTS support_tickets_admin_all ON public.support_tickets;
CREATE POLICY support_tickets_admin_all ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- support_ticket_messages ----------------------------------------------------
DROP POLICY IF EXISTS support_ticket_messages_admin_all ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_admin_all ON public.support_ticket_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- support_ticket_attachments -------------------------------------------------
DROP POLICY IF EXISTS support_ticket_attachments_admin_all ON public.support_ticket_attachments;
CREATE POLICY support_ticket_attachments_admin_all ON public.support_ticket_attachments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

-- support_ticket_assignees -----------------------------------------------------
DROP POLICY IF EXISTS support_ticket_assignees_admin_select ON public.support_ticket_assignees;
CREATE POLICY support_ticket_assignees_admin_select ON public.support_ticket_assignees
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());
