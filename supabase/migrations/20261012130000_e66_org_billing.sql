-- E66 — paid organisation plans and training-evidence reports.
--
-- org_subscriptions: one row per Stripe subscription, written only by the
-- Stripe webhook (service role). respondent_cap is a snapshot taken at
-- purchase, so later price-list changes never alter what was paid for.
--
-- evidence_reports: one row per generated "Doklad o preškolení". The row
-- outlives the test it describes (test_id ON DELETE SET NULL) because a
-- report is evidence; it is erased with the owner's account. session_ids
-- lets the allowance count distinct respondents, so regenerating a report
-- never consumes the allowance twice. verify_evidence_report() exposes the
-- non-personal summary to the public /overenie page.

CREATE TABLE IF NOT EXISTS public.org_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('start', 'firma', 'firma_plus')),
  status text NOT NULL,
  respondent_cap integer NOT NULL CHECK (respondent_cap > 0),
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_user ON public.org_subscriptions (user_id);

ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_subscriptions_select_own ON public.org_subscriptions;
CREATE POLICY org_subscriptions_select_own ON public.org_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS org_subscriptions_admin_select ON public.org_subscriptions;
CREATE POLICY org_subscriptions_admin_select ON public.org_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_aal2());

CREATE TABLE IF NOT EXISTS public.evidence_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  test_title text NOT NULL,
  test_version integer NOT NULL,
  org_name text NOT NULL CHECK (char_length(org_name) BETWEEN 1 AND 160),
  session_ids uuid[] NOT NULL,
  respondent_count integer NOT NULL CHECK (respondent_count >= 0),
  passed_count integer NOT NULL CHECK (passed_count >= 0),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_reports_owner_created
  ON public.evidence_reports (owner_id, created_at DESC);

ALTER TABLE public.evidence_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_reports_select_own ON public.evidence_reports;
CREATE POLICY evidence_reports_select_own ON public.evidence_reports
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.verify_evidence_report(p_id uuid)
RETURNS TABLE (
  org_name text,
  test_title text,
  test_version integer,
  respondent_count integer,
  passed_count integer,
  content_sha256 text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.org_name, r.test_title, r.test_version, r.respondent_count,
         r.passed_count, r.content_sha256, r.created_at
  FROM public.evidence_reports r
  WHERE r.id = p_id;
$$;

REVOKE ALL ON FUNCTION public.verify_evidence_report(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_evidence_report(uuid) TO anon, authenticated;
