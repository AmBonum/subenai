-- E48-v4 hotfix — replace auth.users JOIN with profiles JOIN in
-- `support_tickets_with_assignees` view.
--
-- ## Bug
--
-- The original view (migration 20260522170000) was created with
-- `security_invoker = true` and LEFT JOINed `auth.users` to enrich the
-- assignees jsonb with email + display_name. With security-invoker, the
-- caller's privileges decide whether each underlying table is readable.
--
-- Authenticated Supabase users (including admins) do NOT have a direct
-- GRANT SELECT on `auth.users` — it is intentionally locked down so only
-- SECURITY DEFINER functions can read it. The view query therefore fails
-- with 403 Forbidden for every admin trying to load /admin/tickets.
--
-- ## Fix
--
-- Drop the JOIN on `auth.users` entirely; use only `public.profiles`,
-- which has a `profiles_self_read` policy allowing admins (and self) to
-- SELECT all rows. The profiles row already carries `email` and
-- `display_name` for the same user, so no information is lost.
--
-- `security_invoker = true` is preserved (the security model is correct;
-- the bug was only the auth.users dependency).
--
-- ## Verification
--
-- Admin user sign-in → /admin/tickets → GET
-- /rest/v1/support_tickets_with_assignees → 200 + rows (no 403).

CREATE OR REPLACE VIEW public.support_tickets_with_assignees
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.created_at,
  t.updated_at,
  t.status,
  t.category,
  t.source,
  t.subject,
  t.body,
  t.submitter_user_id,
  t.submitter_email,
  t.submitter_name,
  t.archived_at,
  t.deleted_at,
  t.resolved_at,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id',      a.user_id,
          'email',        p.email,
          'display_name', COALESCE(p.display_name, p.email),
          'assigned_at',  a.assigned_at
        ) ORDER BY a.assigned_at
      )
      FROM public.support_ticket_assignees a
      LEFT JOIN public.profiles p ON p.id = a.user_id
      WHERE a.ticket_id = t.id
    ),
    '[]'::jsonb
  ) AS assignees,
  EXISTS (
    SELECT 1 FROM public.support_ticket_assignees a WHERE a.ticket_id = t.id
  ) AS is_assigned,
  -- First assignee's display_name (sorted by assigned_at) — used for queue sortability.
  (
    SELECT COALESCE(p.display_name, p.email)
    FROM public.support_ticket_assignees a
    LEFT JOIN public.profiles p ON p.id = a.user_id
    WHERE a.ticket_id = t.id
    ORDER BY a.assigned_at
    LIMIT 1
  ) AS first_assignee_display_name
FROM public.support_tickets t;

COMMENT ON VIEW public.support_tickets_with_assignees IS
'E48-v3 admin queue view with assignees enrichment. security_invoker=true so support_tickets / support_ticket_assignees RLS applies (admin sees all, others see only their own). E48-v4 hotfix: joins via public.profiles (admin-readable) instead of auth.users (locked down for authenticated role).';

NOTIFY pgrst, 'reload schema';
