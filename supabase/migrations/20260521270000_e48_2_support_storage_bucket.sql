-- E48.2 — Private Storage bucket for support ticket attachments.
--
-- This bucket holds user-uploaded JPG / PNG / PDF attachments after they
-- pass the deterministic sanitisation pipeline (sharp re-encode +
-- pdf-lib JS/AcroForm/URI strip; see migration 20260521260000 D-1).
--
-- Security posture:
--   - public = false. Direct unauthenticated GET returns 403.
--   - INSERT happens exclusively via /functions/api/support-attachment-upload.ts
--     using the service-role key (bypasses RLS by design). No INSERT policy
--     is granted to anon or authenticated — absence-of-policy = deny.
--   - DELETE happens via service-role from the GDPR cron or admin RPC.
--     No DELETE policy is granted to non-service-role.
--   - SELECT is granted to admins (display_name in dashboard / debugging
--     via Supabase UI). Production download URLs are signed (15-min TTL)
--     and issued by request_attachment_signed_url() RPC which itself
--     enforces admin + AAL2 + scan_status='clean'.
--
-- This migration is idempotent (re-runnable) via the standard
-- ON CONFLICT DO NOTHING + DROP POLICY IF EXISTS dance.

INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "support_attachments_admin_select" ON storage.objects;

CREATE POLICY "support_attachments_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments' AND public.has_role(auth.uid(), 'admin')
  );

-- Deliberately NO insert/update/delete policy on storage.objects for the
-- support-attachments bucket. All writes go through service-role from the
-- CF function. If you find yourself needing to add one, stop and review
-- E48.2 AC-1 — the policy might be the wrong primitive to reach for.
