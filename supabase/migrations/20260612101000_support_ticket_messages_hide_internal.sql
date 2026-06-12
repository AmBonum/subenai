-- ============================================================================
-- SECURITY FIX — internal admin notes leaked to authenticated submitters
-- ============================================================================
--
-- 20260522180000_e48_v4_internal_notes.sql added is_internal and filtered
-- it inside the anon view-token RPC (get_ticket_thread_for_view_token),
-- but never amended the direct-table policy from 20260521260000:
--
--   CREATE POLICY support_ticket_messages_user_select ...
--     USING (EXISTS (... t.submitter_user_id = auth.uid()));
--
-- An authenticated submitter could bypass the app and read every
-- is_internal = true admin note on their own ticket via
--   GET /rest/v1/support_ticket_messages?ticket_id=eq.<own>&select=*
-- breaking the admin-UI promise "Zákazník ju neuvidí". Add the filter.
-- ============================================================================

DROP POLICY IF EXISTS support_ticket_messages_user_select ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_user_select ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    support_ticket_messages.is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND t.submitter_user_id = auth.uid()
    )
  );
