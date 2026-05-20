-- E44.6 Phase B — template_submissions table for public-publication review.
--
-- A user submits one of THEIR private templates for public listing. The CF
-- Function `functions/api/templates/precheck.ts` calls Claude Haiku 4.5 to
-- score the content, writes the result here, and surfaces a verdict back to
-- the user. An admin then reads the row in the moderation queue (Phase C)
-- and approves or rejects.
--
-- RLS layering:
--   - Author reads their own rows (any status).
--   - Admin reads/writes all rows.
--   - Anonymous + non-author authenticated users: zero access (DEFAULT DENY).
--   - The precheck CF Function uses the service-role key, bypassing RLS.
--
-- Status transitions enforced by trigger:
--   pending → approved   (admin)
--   pending → rejected   (admin)
--   pending → withdrawn  (author or admin)
--   rejected → pending   (re-submission, 24h cooldown enforced in CF Function)
--   No other transitions; `forbid_template_submission_illegal_transitions` raises.

-- Enum for submission lifecycle.
DO $$
BEGIN
  CREATE TYPE public.template_submission_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'withdrawn'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.template_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Snapshot of profile.full_name at submission time. Survives profile
  -- rename / account delete (the latter via Phase D edge case 7.1 trigger).
  author_display_name text NOT NULL,
  age_rating_declared public.template_age_rating NOT NULL,
  license public.template_license NOT NULL DEFAULT 'cc-by-4.0',
  status public.template_submission_status NOT NULL DEFAULT 'pending',
  -- AI precheck envelope minus raw_response (see Appendix C § 3). Null until
  -- the CF Function runs precheck; non-null after.
  precheck jsonb,
  precheck_passed boolean,
  precheck_at timestamptz,
  -- Admin moderation fields (filled in Phase C).
  rejection_reason text,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.template_submissions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS template_submissions_template_idx
  ON public.template_submissions (template_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS template_submissions_author_idx
  ON public.template_submissions (author_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS template_submissions_admin_queue_idx
  ON public.template_submissions (status, submitted_at)
  WHERE status = 'pending';

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_template_submissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS template_submissions_touch_updated_at ON public.template_submissions;
CREATE TRIGGER template_submissions_touch_updated_at
  BEFORE UPDATE ON public.template_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_template_submissions_updated_at();

-- State-machine trigger. Defense-in-depth on top of RLS: even if a row sneaks
-- through with an illegal status change, this raises. Service-role calls go
-- through too — the rules apply to everyone.
CREATE OR REPLACE FUNCTION public.forbid_template_submission_illegal_transitions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'withdrawn') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'template_submissions: illegal status transition % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS template_submissions_forbid_illegal_transitions
  ON public.template_submissions;
CREATE TRIGGER template_submissions_forbid_illegal_transitions
  BEFORE UPDATE OF status ON public.template_submissions
  FOR EACH ROW EXECUTE FUNCTION public.forbid_template_submission_illegal_transitions();

-- RLS policies

CREATE POLICY template_submissions_author_read ON public.template_submissions
  FOR SELECT TO authenticated
  USING (author_id = auth.uid());

-- Author can INSERT a row for a template they own. CF Function validates
-- the template ownership before inserting; this policy is the secondary
-- gate. WITH CHECK forces author_id = auth.uid() at insert time.
CREATE POLICY template_submissions_author_insert ON public.template_submissions
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Author can withdraw their own pending submission (set status='withdrawn').
-- The state-machine trigger above blocks any other transition. The RLS
-- WITH CHECK also ensures the author can't change author_id / template_id.
CREATE POLICY template_submissions_author_withdraw ON public.template_submissions
  FOR UPDATE TO authenticated
    USING (author_id = auth.uid() AND status = 'pending')
    WITH CHECK (author_id = auth.uid());

-- Admin full-access policy.
CREATE POLICY template_submissions_admin_all ON public.template_submissions
  FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Self-check after applying:
--   SELECT polname FROM pg_policies WHERE tablename = 'template_submissions' ORDER BY polname;
--     -- expect 4 rows: admin_all, author_insert, author_read, author_withdraw
--   SELECT indexname FROM pg_indexes WHERE tablename = 'template_submissions';
--     -- expect 4: pkey + 3 named indexes
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.template_submissions'::regclass
--     AND NOT tgisinternal;
--     -- expect 2: touch_updated_at + forbid_illegal_transitions
--   SELECT unnest(enum_range(NULL::public.template_submission_status));
--     -- expect 4 rows: pending, approved, rejected, withdrawn
