-- SEC-2026-06 (6) — dsr_requests: user-side INSERT + SELECT policies
-- bound to auth.email().
--
-- 20260517000000_admin_hub_schema.sql shipped only
-- dsr_requests_admin_read. The user-facing surface
-- (useSubmitDSR / useUserDSRList in src/lib/platform/queries.ts, driven
-- by DsrSubmitForm on /app/legal/dsr) inserts and selects directly from
-- the authenticated client — with no matching policies those calls were
-- denied by RLS, and the queries.ts comment ("RLS by requester_email
-- match") described a policy that never existed.
--
-- The DSR form is reachable ONLY under /app (authenticated route);
-- there is no logged-out submission path, so no anon policy is added.
-- Binding both directions to auth.email() means a user can only file
-- requests for, and read requests about, their own login e-mail —
-- preventing both impersonated submissions and cross-user snooping on
-- request history.

CREATE POLICY dsr_requests_own_insert ON public.dsr_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_email = auth.email());

CREATE POLICY dsr_requests_own_select ON public.dsr_requests
  FOR SELECT TO authenticated
  USING (requester_email = auth.email());
