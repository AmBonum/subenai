-- E40.1 — DPA request intake table + 12-month PII anonymisation RPC.
--
-- Backs the /schools/dpa flow (E40.2): school contact fills name +
-- e-mail + school name, the server function inserts a row here, the
-- PDF DPA is rendered + delivered + offered as a download. Admin
-- queues the requests at /admin/dpa-requests (E40.5).
--
-- Architectural notes:
--
--   - INSERTs happen via the service-role from the TanStack server
--     function (E40.2). No public INSERT policy — same pattern as
--     dsr_requests (admin-hub schema, AH-1.5). Service role bypasses
--     RLS, the server function is the only validation gate
--     (Turnstile + Zod + rate-limit).
--   - SELECT + UPDATE restricted to admin via has_role(). No DELETE
--     policy — rows are immutable except via anonymisation. Admin
--     "deletes" by anonymising.
--   - dpa_version captures which template revision the school
--     received. Required to answer Art. 28(9) GDPR — "which exact
--     text did school X agree to?" — across future template bumps.
--   - 12-month PII retention (contact_name + contact_email NULL,
--     anonymized_at set, school_name + dpa_version preserved as
--     aggregate non-PII stats). Plugs into the E38 GitHub Actions
--     retention cron (called daily) — wired in E40.6.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.dpa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  downloaded_at timestamptz,
  contact_name text,
  contact_email text,
  school_name text NOT NULL,
  dpa_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'signed', 'cancelled')),
  email_status text NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sent', 'failed')),
  email_error text,
  ip_hash text,
  anonymized_at timestamptz,
  CONSTRAINT dpa_requests_anonymised_consistent CHECK (
    (anonymized_at IS NULL) OR (contact_name IS NULL AND contact_email IS NULL)
  )
);

ALTER TABLE public.dpa_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX dpa_requests_created_at_idx
  ON public.dpa_requests (created_at DESC);

CREATE INDEX dpa_requests_school_name_trgm_idx
  ON public.dpa_requests USING gin (school_name gin_trgm_ops);

CREATE INDEX dpa_requests_status_idx
  ON public.dpa_requests (status)
  WHERE status <> 'cancelled';

-- (E) Admin-only read; INSERT via service-role from server fn; UPDATE
-- via admin (status flips, manual anonymise, re-send tracking). No
-- DELETE policy.
CREATE POLICY dpa_requests_admin_read ON public.dpa_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY dpa_requests_admin_update ON public.dpa_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.dpa_requests IS
  'E40.1 — DPA intake from /schools/dpa. INSERTs via service-role only. '
  '12-month PII anonymisation via anonymize_expired_dpa_requests().';

COMMENT ON COLUMN public.dpa_requests.dpa_version IS
  'Template version the school received (e.g. ''v0.1''). Art. 28(9) GDPR '
  'requires us to prove which text was agreed on. Bumps on legal revisions.';

-- 12-month PII anonymisation. Mirrors anonymize_expired_edu_respondents
-- (E38.2). Called daily by the GitHub Actions retention-cron workflow
-- (.github/workflows/retention-cron.yml — extended in E40.6).
CREATE OR REPLACE FUNCTION public.anonymize_expired_dpa_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  touched_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.dpa_requests
    SET
      contact_name = NULL,
      contact_email = NULL,
      anonymized_at = now()
    WHERE created_at < (now() - interval '12 months')
      AND anonymized_at IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO touched_count FROM updated;
  RETURN touched_count;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_expired_dpa_requests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_expired_dpa_requests() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_dpa_requests() TO service_role;

COMMENT ON FUNCTION public.anonymize_expired_dpa_requests() IS
  'E40.1 — NULL contact_name + contact_email on dpa_requests older than '
  '12 months; sets anonymized_at. Called daily by the GH Actions '
  'retention-cron workflow. Preserves school_name + dpa_version (aggregate, '
  'non-PII).';
