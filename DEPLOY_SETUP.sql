-- ============================================================================
-- INTERNET IQ TEST — Complete database schema
-- ============================================================================
-- Usage:
-- 1. Create a new project on supabase.com (free tier).
-- 2. In the Supabase dashboard open: SQL Editor -> New query.
-- 3. Copy the full contents of this file and click RUN.
-- ============================================================================
-- ADMIN BOOTSTRAP — required AFTER running this file (admin-hub / AH-*)
-- ============================================================================
-- After this script completes successfully, no user has the admin role.
-- The first admin must be promoted manually via the Supabase SQL Editor:
--
--   1. Sign up the future admin through the live login flow (this
--      triggers the on_auth_user_created handler from AH-1.2 and creates
--      a public.profiles row).
--   2. Copy that user's UUID from public.profiles (filter by email).
--   3. Run the following INSERT in the Supabase SQL Editor:
--
--        INSERT INTO public.user_roles (user_id, role)
--        VALUES ('<copied-uuid>', 'admin')
--        ON CONFLICT (user_id, role) DO NOTHING;
--
-- All subsequent admins are promoted via the /admin/users UI once the
-- first admin is in place. See tasks/PLAN-2026-05-17-admin-hub-integration.md
-- decision #10 and the AH-11.8 story for the production-ready checklist.
-- ============================================================================
-- AH-11.3 Part 2 — CF Pages environment variable required for role/ban UI
-- ============================================================================
-- The /admin/users role-change and ban toggle controls hit the Cloudflare
-- Pages function PATCH /api/admin/users/:id, which uses the Supabase
-- service-role key to bypass RLS (user_roles writes + auth.admin ban).
--
--   1. Cloudflare dashboard -> Pages -> subenai -> Settings ->
--      Environment Variables -> Production.
--   2. Add `SUPABASE_SERVICE_ROLE_KEY` with the value from Supabase
--      Dashboard -> Settings -> API -> `service_role` secret.
--   3. Redeploy production. Without this env var every PATCH on
--      /api/admin/users/:id returns 500 `supabase_not_configured`.
--
-- NEVER commit the service_role key to the repo. It is a master key
-- that bypasses every RLS policy.
-- ============================================================================

-- 1) ATTEMPTS TABLE
CREATE TABLE public.attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT NOT NULL UNIQUE,
  nickname TEXT,
  final_score INTEGER NOT NULL,
  base_score INTEGER NOT NULL,
  total_penalty INTEGER NOT NULL,
  percentile INTEGER NOT NULL,
  personality TEXT NOT NULL,
  breakdown JSONB NOT NULL,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_time_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Demografia (voliteľné, vypĺňa sa po teste)
  age_range TEXT,
  gender TEXT,
  city TEXT,
  country TEXT,
  self_caution SMALLINT,
  survey_completed BOOLEAN NOT NULL DEFAULT false,
  -- Rastový prieskum (E2.1, voliteľné, vypĺňa sa po teste)
  top_fear TEXT,
  has_been_scammed TEXT,
  referral_source TEXT,
  wants_courses BOOLEAN,
  interests TEXT[],
  survey_extras_completed BOOLEAN NOT NULL DEFAULT false
);

-- 2) INDEXES
CREATE INDEX attempts_score_idx ON public.attempts (final_score DESC);
CREATE INDEX attempts_created_idx ON public.attempts (created_at DESC);
CREATE INDEX attempts_share_id_idx ON public.attempts (share_id);
CREATE INDEX idx_attempts_answers ON public.attempts USING gin (answers);

-- 3) CONSTRAINTS (data validation)
ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_final_score_range CHECK (final_score BETWEEN 0 AND 100),
  ADD CONSTRAINT attempts_base_score_range CHECK (base_score BETWEEN 0 AND 100),
  ADD CONSTRAINT attempts_percentile_range CHECK (percentile BETWEEN 0 AND 100),
  ADD CONSTRAINT attempts_penalty_nonneg CHECK (total_penalty >= 0),
  ADD CONSTRAINT attempts_time_nonneg CHECK (total_time_ms >= 0 AND total_time_ms < 3600000),
  ADD CONSTRAINT attempts_nickname_len CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 1 AND 40),
  ADD CONSTRAINT attempts_share_id_format CHECK (share_id ~ '^[a-zA-Z0-9]{6,12}$'),
  ADD CONSTRAINT attempts_personality_known CHECK (personality IN (
    'internet_ninja','overconfident_victim','scam_magnet','clickbait_zombie','cautious_but_vulnerable'
  )),
  -- E2.1 — growth survey enums (mirror src/lib/quiz/survey-options.ts)
  ADD CONSTRAINT attempts_top_fear_known CHECK (
    top_fear IS NULL OR top_fear IN
      ('phishing','scam_money','scam_identity','hate','doxxing','nothing')
  ),
  ADD CONSTRAINT attempts_has_been_scammed_known CHECK (
    has_been_scammed IS NULL OR has_been_scammed IN
      ('yes_money','yes_data','yes_account','no','prefer_not_to_say')
  ),
  ADD CONSTRAINT attempts_referral_source_known CHECK (
    referral_source IS NULL OR referral_source IN
      ('tiktok','instagram','facebook','friend','google','other')
  ),
  ADD CONSTRAINT attempts_interests_size CHECK (
    interests IS NULL
      OR array_length(interests, 1) IS NULL
      OR array_length(interests, 1) <= 10
  );

-- 4) ROW-LEVEL SECURITY
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert attempts"
  ON public.attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read attempts"
  ON public.attempts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update demographics"
  ON public.attempts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5) VALIDATION TRIGGER for demographic fields
CREATE OR REPLACE FUNCTION public.validate_attempt_demographics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.self_caution IS NOT NULL AND (NEW.self_caution < 1 OR NEW.self_caution > 5) THEN
    RAISE EXCEPTION 'self_caution must be between 1 and 5';
  END IF;
  IF NEW.age_range IS NOT NULL AND length(NEW.age_range) > 20 THEN
    RAISE EXCEPTION 'age_range too long';
  END IF;
  IF NEW.gender IS NOT NULL AND length(NEW.gender) > 30 THEN
    RAISE EXCEPTION 'gender too long';
  END IF;
  IF NEW.city IS NOT NULL AND length(NEW.city) > 80 THEN
    RAISE EXCEPTION 'city too long';
  END IF;
  IF NEW.country IS NOT NULL AND length(NEW.country) > 80 THEN
    RAISE EXCEPTION 'country too long';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_attempt_demographics_trg
BEFORE INSERT OR UPDATE ON public.attempts
FOR EACH ROW EXECUTE FUNCTION public.validate_attempt_demographics();

-- 6) SECURITY TRIGGER — protects scores against overwrite
CREATE OR REPLACE FUNCTION public.forbid_attempt_score_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.final_score IS DISTINCT FROM OLD.final_score
     OR NEW.base_score IS DISTINCT FROM OLD.base_score
     OR NEW.total_penalty IS DISTINCT FROM OLD.total_penalty
     OR NEW.percentile IS DISTINCT FROM OLD.percentile
     OR NEW.personality IS DISTINCT FROM OLD.personality
     OR NEW.breakdown::text IS DISTINCT FROM OLD.breakdown::text
     OR NEW.insights::text IS DISTINCT FROM OLD.insights::text
     OR NEW.stats::text IS DISTINCT FROM OLD.stats::text
     OR NEW.flags::text IS DISTINCT FROM OLD.flags::text
     OR NEW.answers::text IS DISTINCT FROM OLD.answers::text
     OR NEW.total_time_ms IS DISTINCT FROM OLD.total_time_ms
     OR NEW.share_id IS DISTINCT FROM OLD.share_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Score / identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER forbid_attempt_score_changes_trg
BEFORE UPDATE ON public.attempts
FOR EACH ROW EXECUTE FUNCTION public.forbid_attempt_score_changes();

-- ============================================================================
-- Self-service delete + 36-month retention (matches privacy policy)
-- ============================================================================

DROP POLICY IF EXISTS attempts_anon_delete ON public.attempts;
CREATE POLICY attempts_anon_delete
  ON public.attempts
  FOR DELETE
  TO anon
  USING (share_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.purge_expired_attempts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.attempts
    WHERE created_at < (now() - interval '36 months')
    RETURNING 1
  )
  SELECT count(*) INTO purged_count FROM deleted;
  RETURN purged_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_attempts() FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge_expired_attempts_daily')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'purge_expired_attempts_daily'
    );
    PERFORM cron.schedule(
      'purge_expired_attempts_daily',
      '17 3 * * *',
      'SELECT public.purge_expired_attempts();'
    );
  END IF;
END $$;

-- ============================================================================
-- E10.2 — Sponsorship schema (sponsors, donations, subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  display_link TEXT,
  display_message TEXT,
  show_in_footer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
  CONSTRAINT sponsors_display_link_https CHECK (
    display_link IS NULL OR display_link LIKE 'https://%'
  ),
  CONSTRAINT sponsors_display_message_len CHECK (
    display_message IS NULL OR length(display_message) <= 80
  )
);
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS sponsors_stripe_customer_id_idx
  ON public.sponsors (stripe_customer_id);

CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE RESTRICT,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_eur NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  kind TEXT NOT NULL CHECK (kind IN ('oneoff', 'subscription_invoice', 'refund')),
  refund_of_donation_id UUID REFERENCES public.donations(id) ON DELETE RESTRICT,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT donations_refund_consistency CHECK (
    (kind = 'refund' AND refund_of_donation_id IS NOT NULL AND amount_eur < 0)
    OR (kind <> 'refund' AND refund_of_donation_id IS NULL AND amount_eur > 0)
  )
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS donations_sponsor_id_idx ON public.donations (sponsor_id);
CREATE INDEX IF NOT EXISTS donations_created_at_idx ON public.donations (created_at DESC);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE RESTRICT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  monthly_eur NUMERIC(10, 2) NOT NULL CHECK (monthly_eur > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS subscriptions_sponsor_id_idx ON public.subscriptions (sponsor_id);
CREATE INDEX IF NOT EXISTS subscriptions_active_idx
  ON public.subscriptions (sponsor_id) WHERE cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_sponsor_total()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sponsors SET total_eur = total_eur + NEW.amount_eur WHERE id = NEW.sponsor_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS donations_update_sponsor_total ON public.donations;
CREATE TRIGGER donations_update_sponsor_total AFTER INSERT ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.update_sponsor_total();
REVOKE ALL ON FUNCTION public.update_sponsor_total() FROM anon, authenticated;

DROP VIEW IF EXISTS public.public_sponsors;
CREATE VIEW public.public_sponsors AS
SELECT
  s.id,
  s.display_name,
  s.display_link,
  s.display_message,
  s.created_at,
  s.total_eur AS net_amount_eur,
  EXISTS (
    SELECT 1 FROM public.donations d
    WHERE d.sponsor_id = s.id AND d.kind = 'refund'
  ) AS has_refund
FROM public.sponsors s
WHERE s.display_name IS NOT NULL;
GRANT SELECT ON public.public_sponsors TO anon, authenticated;

DROP VIEW IF EXISTS public.footer_sponsors;
CREATE VIEW public.footer_sponsors AS
SELECT DISTINCT s.id, s.display_name, s.display_link, s.created_at
FROM public.sponsors s
LEFT JOIN public.subscriptions sub ON sub.sponsor_id = s.id AND sub.cancelled_at IS NULL
WHERE s.show_in_footer = true AND s.display_name IS NOT NULL
  AND (s.total_eur >= 50 OR sub.monthly_eur >= 25);
GRANT SELECT ON public.footer_sponsors TO anon, authenticated;

-- ============================================================================
-- E8.1 — test_sets table for the Composer (E8 epic).
-- Question CONTENT lives in src/lib/quiz/questions.ts (TS bundle); this
-- table only stores the SELECTION (question_ids[]) + threshold + max.
-- Forward-compat: author_password_hash + collects_responses NULL/false
-- so E12 (education mode) can land without another migration round.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_ids TEXT[] NOT NULL,
  passing_threshold INT2 NOT NULL DEFAULT 70,
  max_questions INT2 NOT NULL,
  creator_label TEXT,
  source_pack_slugs TEXT[],
  author_password_hash TEXT,
  collects_responses BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT test_sets_size_chk CHECK (array_length(question_ids, 1) BETWEEN 5 AND 50),
  CONSTRAINT test_sets_threshold_chk CHECK (passing_threshold BETWEEN 50 AND 90),
  CONSTRAINT test_sets_max_consistent CHECK (max_questions = array_length(question_ids, 1)),
  CONSTRAINT test_sets_label_len CHECK (creator_label IS NULL OR length(creator_label) <= 80),
  CONSTRAINT test_sets_pwd_required_when_collecting CHECK (
    collects_responses = false OR author_password_hash IS NOT NULL
  )
  -- Per-element question_id length cap (64 chars) is enforced via the
  -- trigger below — CHECK constraints cannot contain subqueries.
);

CREATE OR REPLACE FUNCTION public.check_test_sets_question_id_len()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW.question_ids) AS q WHERE length(q) > 64) THEN
    RAISE EXCEPTION 'question_ids elements must be at most 64 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS test_sets_question_id_len_trg ON public.test_sets;
CREATE TRIGGER test_sets_question_id_len_trg
  BEFORE INSERT OR UPDATE ON public.test_sets
  FOR EACH ROW EXECUTE FUNCTION public.check_test_sets_question_id_len();

CREATE INDEX IF NOT EXISTS test_sets_created_at_idx ON public.test_sets (created_at DESC);

ALTER TABLE public.test_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_sets_anon_select ON public.test_sets;
CREATE POLICY test_sets_anon_select ON public.test_sets FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS test_sets_anon_insert ON public.test_sets;
CREATE POLICY test_sets_anon_insert ON public.test_sets FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS test_set_id UUID REFERENCES public.test_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS attempts_test_set_id_idx
  ON public.attempts (test_set_id) WHERE test_set_id IS NOT NULL;

-- Extend immutability trigger so test_set_id is locked once an attempt is INSERTed.
CREATE OR REPLACE FUNCTION public.forbid_attempt_score_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.final_score IS DISTINCT FROM OLD.final_score
     OR NEW.base_score IS DISTINCT FROM OLD.base_score
     OR NEW.total_penalty IS DISTINCT FROM OLD.total_penalty
     OR NEW.percentile IS DISTINCT FROM OLD.percentile
     OR NEW.personality IS DISTINCT FROM OLD.personality
     OR NEW.breakdown::text IS DISTINCT FROM OLD.breakdown::text
     OR NEW.insights::text IS DISTINCT FROM OLD.insights::text
     OR NEW.stats::text IS DISTINCT FROM OLD.stats::text
     OR NEW.flags::text IS DISTINCT FROM OLD.flags::text
     OR NEW.answers::text IS DISTINCT FROM OLD.answers::text
     OR NEW.total_time_ms IS DISTINCT FROM OLD.total_time_ms
     OR NEW.share_id IS DISTINCT FROM OLD.share_id
     OR NEW.test_set_id IS DISTINCT FROM OLD.test_set_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Score / identity / set fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_unused_test_sets()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE purged_count integer;
BEGIN
  UPDATE public.attempts SET test_set_id = NULL
  WHERE test_set_id IN (
    SELECT id FROM public.test_sets WHERE created_at < (now() - interval '12 months')
  );
  WITH deleted AS (
    DELETE FROM public.test_sets WHERE created_at < (now() - interval '12 months')
    RETURNING 1
  )
  SELECT count(*) INTO purged_count FROM deleted;
  RETURN purged_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_unused_test_sets() FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge_unused_test_sets_daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_unused_test_sets_daily');
    PERFORM cron.schedule(
      'purge_unused_test_sets_daily', '23 3 * * *',
      'SELECT public.purge_unused_test_sets();'
    );
  END IF;
END $$;

-- ============================================================================
-- E12.1 — Education mode (authors collect student responses, opt-in PII).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS respondent_name TEXT,
  ADD COLUMN IF NOT EXISTS respondent_email TEXT;

ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_respondent_email_format;
ALTER TABLE public.attempts ADD CONSTRAINT attempts_respondent_email_format CHECK (
  respondent_email IS NULL OR respondent_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_edu_pii_pair;
ALTER TABLE public.attempts ADD CONSTRAINT attempts_edu_pii_pair CHECK (
  (respondent_name IS NULL AND respondent_email IS NULL)
  OR (respondent_name IS NOT NULL AND respondent_email IS NOT NULL)
);
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_respondent_name_len;
ALTER TABLE public.attempts ADD CONSTRAINT attempts_respondent_name_len CHECK (
  respondent_name IS NULL OR length(respondent_name) BETWEEN 1 AND 120
);

CREATE INDEX IF NOT EXISTS attempts_test_set_id_created_at_idx
  ON public.attempts (test_set_id, created_at DESC)
  WHERE test_set_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can read attempts" ON public.attempts;
CREATE POLICY "Anon read non-edu attempts"
  ON public.attempts FOR SELECT TO anon, authenticated
  USING (respondent_name IS NULL);

CREATE OR REPLACE VIEW public.attempts_anon
WITH (security_invoker = true) AS
SELECT id, share_id, nickname, final_score, base_score, total_penalty, percentile,
       personality, breakdown, insights, stats, flags, total_time_ms,
       test_set_id, created_at
FROM public.attempts
WHERE respondent_name IS NULL;

GRANT SELECT ON public.attempts_anon TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.forbid_attempt_score_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.final_score IS DISTINCT FROM OLD.final_score
     OR NEW.base_score IS DISTINCT FROM OLD.base_score
     OR NEW.total_penalty IS DISTINCT FROM OLD.total_penalty
     OR NEW.percentile IS DISTINCT FROM OLD.percentile
     OR NEW.personality IS DISTINCT FROM OLD.personality
     OR NEW.breakdown::text IS DISTINCT FROM OLD.breakdown::text
     OR NEW.insights::text IS DISTINCT FROM OLD.insights::text
     OR NEW.stats::text IS DISTINCT FROM OLD.stats::text
     OR NEW.flags::text IS DISTINCT FROM OLD.flags::text
     OR NEW.answers::text IS DISTINCT FROM OLD.answers::text
     OR NEW.total_time_ms IS DISTINCT FROM OLD.total_time_ms
     OR NEW.share_id IS DISTINCT FROM OLD.share_id
     OR NEW.test_set_id IS DISTINCT FROM OLD.test_set_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (NEW.respondent_name IS DISTINCT FROM OLD.respondent_name
         AND NOT (OLD.respondent_name IS NOT NULL AND NEW.respondent_name IS NULL))
     OR (NEW.respondent_email IS DISTINCT FROM OLD.respondent_email
         AND NOT (OLD.respondent_email IS NOT NULL AND NEW.respondent_email IS NULL))
  THEN
    RAISE EXCEPTION 'Score / identity / set / respondent fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_test_set_password(password TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF password IS NULL OR length(password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;
REVOKE ALL ON FUNCTION public.hash_test_set_password(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_test_set_password(set_id UUID, password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE stored_hash TEXT;
BEGIN
  IF set_id IS NULL OR password IS NULL THEN RETURN false; END IF;
  SELECT author_password_hash INTO stored_hash FROM public.test_sets WHERE id = set_id;
  IF stored_hash IS NULL THEN RETURN false; END IF;
  RETURN crypt(password, stored_hash) = stored_hash;
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_test_set_password(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_respondent_pii()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.attempts
  SET respondent_name = NULL, respondent_email = NULL
  WHERE respondent_name IS NOT NULL
    AND created_at < (now() - interval '12 months');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_respondent_pii() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge_expired_respondent_pii_daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_expired_respondent_pii_daily');
    PERFORM cron.schedule(
      'purge_expired_respondent_pii_daily', '35 3 * * *',
      'SELECT public.purge_expired_respondent_pii();'
    );
  END IF;
END $$;

-- ============================================================================
-- E12.3 + E12.7 — Lock down anon INSERT for edu attempts.
-- Anon may INSERT only non-edu rows (respondent_* NULL). Edu rows are
-- written exclusively by /api/finish-edu-attempt CF Function via the
-- service-role key.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert attempts" ON public.attempts;

CREATE POLICY "Anon insert non-edu attempts only"
  ON public.attempts FOR INSERT TO anon, authenticated
  WITH CHECK (respondent_name IS NULL AND respondent_email IS NULL);

-- ============================================================================
-- AH-1 — admin-hub schema foundation
-- Mirror of supabase/migrations/20260517000000_admin_hub_schema.sql
-- ============================================================================

-- ============================================================================
-- AH-1.1 — Enums (12) + has_role() helper
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TYPE public.test_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE public.question_type AS ENUM (
  'single', 'multi', 'scale_1_5', 'scale_1_10', 'nps', 'matrix', 'ranking',
  'slider', 'short_text', 'long_text', 'date', 'time', 'file_upload',
  'image_choice', 'yes_no'
);

CREATE TYPE public.question_status AS ENUM (
  'draft', 'approved', 'deprecated', 'pending', 'flagged', 'published', 'archived'
);

CREATE TYPE public.gdpr_purpose AS ENUM (
  'marketing', 'research', 'recruitment', 'education', 'internal_training'
);

CREATE TYPE public.session_status AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TYPE public.training_status AS ENUM ('published', 'draft', 'archived');

CREATE TYPE public.report_reason AS ENUM (
  'spam', 'inappropriate', 'harassment', 'misinformation', 'other'
);

CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

CREATE TYPE public.team_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TYPE public.dsr_type AS ENUM ('access', 'erase', 'portability');

CREATE TYPE public.dsr_status AS ENUM ('open', 'in_progress', 'completed', 'rejected');

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  found_role boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) INTO found_role;
  RETURN found_role;
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- ============================================================================
-- AH-1.2 — Identity tables + handle_new_user trigger
-- ============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_initials text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'viewer',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX team_members_user_id_idx ON public.team_members (user_id);
CREATE INDEX team_members_team_id_idx ON public.team_members (team_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    upper(left(NEW.email, 2))
  )
  ON CONFLICT (id) DO NOTHING;

  -- AH-1.9 fix: also seed the default 'user' role so has_role(uid,'user')
  -- evaluates true for every signed-up account.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AH-1.3 — Content tables (categories, topics, answer_sets, answers,
--                          questions, templates, trainings)
-- ============================================================================

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.answer_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  branch_slugs text[] NOT NULL DEFAULT '{}',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.answer_sets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.answer_sets(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  explanation text,
  position int NOT NULL DEFAULT 0
);
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE INDEX answers_set_position_idx ON public.answers (set_id, position);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.question_type NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  matrix_rows jsonb,
  matrix_cols jsonb,
  correct jsonb,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  branch_slug text,
  difficulty text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.question_status NOT NULL DEFAULT 'draft',
  answer_set_id uuid REFERENCES public.answer_sets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX questions_category_branch_idx
  ON public.questions (category_id, branch_slug);

CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  gdpr_purpose public.gdpr_purpose NOT NULL DEFAULT 'research',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX templates_gdpr_purpose_idx ON public.templates (gdpr_purpose);

CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  topic_slug text,
  status public.training_status NOT NULL DEFAULT 'draft',
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AH-1.4 — Test + session tables + forbid_session_score_changes trigger
-- ============================================================================

CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  share_id text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status public.test_status NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  password_hash text,
  segmentation text[] NOT NULL DEFAULT '{}',
  gdpr_purpose public.gdpr_purpose NOT NULL DEFAULT 'research',
  intake_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  notif_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  anonymize_after_days int,
  allow_behavioral_tracking boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE INDEX tests_owner_id_idx ON public.tests (owner_id);
CREATE INDEX tests_share_id_idx ON public.tests (share_id);
CREATE INDEX tests_slug_idx ON public.tests (slug);

CREATE TABLE public.test_questions (
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (test_id, question_id)
);
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.test_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changelog text,
  UNIQUE (test_id, version)
);
ALTER TABLE public.test_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  display_name text,
  anonymized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.respondents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  respondent_id uuid REFERENCES public.respondents(id) ON DELETE SET NULL,
  intake_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_given boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  score numeric(5, 2),
  status public.session_status NOT NULL DEFAULT 'in_progress',
  segment text,
  ip_hash text
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX sessions_test_status_idx ON public.sessions (test_id, status);
CREATE INDEX sessions_respondent_idx ON public.sessions (respondent_id);

CREATE TABLE public.session_answers (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  value text,
  is_correct boolean,
  time_ms int,
  PRIMARY KEY (session_id, question_id)
);
ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

CREATE INDEX session_answers_session_idx ON public.session_answers (session_id);

CREATE TABLE public.behavioral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX behavioral_events_session_idx ON public.behavioral_events (session_id);

CREATE TABLE public.respondent_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_emails text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.respondent_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.respondent_groups(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  invited_count int NOT NULL DEFAULT 0,
  UNIQUE (test_id, group_id)
);
ALTER TABLE public.group_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.forbid_session_score_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'completed'
     AND NEW.score IS DISTINCT FROM OLD.score THEN
    RAISE EXCEPTION 'Session score is immutable once status = completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forbid_session_score_changes_trg ON public.sessions;
CREATE TRIGGER forbid_session_score_changes_trg
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.forbid_session_score_changes();

-- ============================================================================
-- AH-1.5 — Governance tables (notifications, audit_log, dsr_requests, reports)
-- ============================================================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX notifications_user_read_idx
  ON public.notifications (user_id, read_at);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id text,
  pii_access boolean NOT NULL DEFAULT false,
  details jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX audit_log_actor_at_idx ON public.audit_log (actor_id, at DESC);
CREATE INDEX audit_log_target_idx ON public.audit_log (target_type, target_id);

CREATE OR REPLACE FUNCTION public.forbid_audit_log_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS forbid_audit_log_update_trg ON public.audit_log;
CREATE TRIGGER forbid_audit_log_update_trg
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_log_updates();

CREATE TABLE public.dsr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email text NOT NULL,
  type public.dsr_type NOT NULL,
  status public.dsr_status NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sla_due_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  resolved_at timestamptz
);
ALTER TABLE public.dsr_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX dsr_requests_status_sla_idx
  ON public.dsr_requests (status, sla_due_at);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason public.report_reason NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  note text,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AH-1.6 — CMS + config tables
-- ============================================================================

CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  seo_title text,
  seo_description text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE INDEX cms_pages_slug_idx ON public.cms_pages (slug);
CREATE INDEX cms_pages_status_published_idx
  ON public.cms_pages (status, published_at DESC);

CREATE TABLE public.cms_header (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo text,
  nav jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_header ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cms_header (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.cms_footer (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  socials jsonb NOT NULL DEFAULT '[]'::jsonb,
  legal jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_footer ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cms_footer (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.cms_navigation (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_navigation ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cms_navigation (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.share_card_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  gradient text,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.share_card_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.share_card_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.quick_test_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quick_test_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.quick_test_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.support_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email text,
  hours text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.support_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AH-1.7 — RLS policies for all 29 new tables
-- ============================================================================

CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_self_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY teams_member_read ON public.teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY teams_owner_write ON public.teams
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY team_members_self_read ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY team_members_owner_write ON public.team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categories_admin_write ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY topics_public_read ON public.topics
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY topics_admin_write ON public.topics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY answer_sets_owner_read ON public.answer_sets
  FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY answer_sets_owner_write ON public.answer_sets
  FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY answers_via_set_read ON public.answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sets s
      WHERE s.id = answers.set_id
        AND (s.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY answers_via_set_write ON public.answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sets s
      WHERE s.id = answers.set_id
        AND (s.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.answer_sets s
      WHERE s.id = answers.set_id
        AND (s.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY questions_owner_read ON public.questions
  FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY questions_owner_write ON public.questions
  FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY templates_auth_read ON public.templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY templates_admin_write ON public.templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY trainings_public_published_read ON public.trainings
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY trainings_admin_write ON public.trainings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY tests_owner_read ON public.tests
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = tests.team_id AND tm.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY tests_owner_write ON public.tests
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY test_questions_via_test_read ON public.test_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_questions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY test_questions_via_test_write ON public.test_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_questions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_questions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY test_versions_via_test_read ON public.test_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_versions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY test_versions_admin_write ON public.test_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_versions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_versions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY respondents_via_session_read ON public.respondents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.tests t ON t.id = s.test_id
      WHERE s.respondent_id = respondents.id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY sessions_via_test_read ON public.sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = sessions.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY session_answers_via_test_read ON public.session_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.tests t ON t.id = s.test_id
      WHERE s.id = session_answers.session_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY behavioral_events_via_test_read ON public.behavioral_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.tests t ON t.id = s.test_id
      WHERE s.id = behavioral_events.session_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY respondent_groups_owner_read ON public.respondent_groups
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY respondent_groups_owner_write ON public.respondent_groups
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY group_assignments_via_test_read ON public.group_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = group_assignments.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY group_assignments_via_test_write ON public.group_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = group_assignments.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = group_assignments.test_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY notifications_self_read ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY notifications_self_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY audit_log_admin_read ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY dsr_requests_admin_read ON public.dsr_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY reports_admin_read ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_pages_public_published_read ON public.cms_pages
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND published_at IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY cms_pages_admin_write ON public.cms_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_header_public_read ON public.cms_header
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cms_header_admin_write ON public.cms_header
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_footer_public_read ON public.cms_footer
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cms_footer_admin_write ON public.cms_footer
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_navigation_public_read ON public.cms_navigation
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cms_navigation_admin_write ON public.cms_navigation
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY share_card_config_public_read ON public.share_card_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY share_card_config_admin_write ON public.share_card_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY quick_test_config_public_read ON public.quick_test_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY quick_test_config_admin_write ON public.quick_test_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY support_config_public_read ON public.support_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY support_config_admin_write ON public.support_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY app_settings_admin_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY app_settings_admin_write ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- AH-1.8 — pg_cron stubs (COMMENTED OUT — manual activation post-merge)
-- ============================================================================
-- The pg_cron extension is not enabled by default in Supabase projects.
-- After this migration runs in production, enable pg_cron in the
-- Supabase Dashboard -> Database -> Extensions, then uncomment and run
-- the two cron.schedule calls below.
--
-- select cron.schedule('anonymize-sessions', '0 3 * * *', $$
--   update public.sessions s set respondent_id = null
--     from public.tests t
--    where s.test_id = t.id
--      and t.anonymize_after_days is not null
--      and s.finished_at < now() - (t.anonymize_after_days || ' days')::interval
--      and s.respondent_id is not null;
-- $$);
--
-- select cron.schedule('dsr-sla-check', '0 * * * *', $$
--   select 1; -- replaced in AH-7 by public.dsr_sla_check_notify()
-- $$);

-- ============================================================================
-- AH-12.1 — MFA backup codes
-- ============================================================================
-- Pairs with Supabase Auth's built-in TOTP (enable in Project Settings →
-- Authentication → Multi-Factor Authentication BEFORE merging the admin-only
-- AAL2 enforcement commit, otherwise the admin gets locked out).

CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON public.mfa_backup_codes (user_id);

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mfa_backup_codes_select_own ON public.mfa_backup_codes;
CREATE POLICY mfa_backup_codes_select_own ON public.mfa_backup_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS mfa_backup_codes_update_own ON public.mfa_backup_codes;
CREATE POLICY mfa_backup_codes_update_own ON public.mfa_backup_codes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_mfa_backup_codes()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_codes text[] := ARRAY[]::text[];
  v_code text;
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.mfa_backup_codes WHERE user_id = v_uid;

  FOR i IN 1..8 LOOP
    v_code := upper(
      substr(encode(gen_random_bytes(2), 'hex'), 1, 4) ||
      '-' ||
      substr(encode(gen_random_bytes(2), 'hex'), 1, 4)
    );
    INSERT INTO public.mfa_backup_codes (user_id, code_hash)
    VALUES (v_uid, encode(digest(v_code, 'sha256'), 'hex'));
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN v_codes;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_mfa_backup_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_mfa_backup_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_mfa_backup_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_code IS NULL OR length(p_code) = 0 THEN
    RETURN false;
  END IF;

  v_hash := encode(digest(upper(p_code), 'sha256'), 'hex');

  UPDATE public.mfa_backup_codes
     SET used_at = now()
   WHERE user_id = v_uid
     AND code_hash = v_hash
     AND used_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_mfa_backup_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_mfa_backup_code(text) TO authenticated;

-- ============================================================================
-- DONE!
-- Now go to Settings -> API and copy:
--   - Project URL  (e.g. https://abcdef.supabase.co)
--   - anon public key
-- You will use these in Cloudflare Pages as environment variables.
-- ============================================================================
-- ============================================================================
-- AH-1.10 — Fix infinite RLS recursion on tests / teams / team_members
-- ============================================================================
--
-- Bug introduced in AH-1.7 (migration 20260517000000_admin_hub_schema.sql):
-- the policies on `tests`, `teams`, and `team_members` form a cycle:
--
--   tests_owner_read       → EXISTS (SELECT FROM team_members ...)
--   team_members_self_read → EXISTS (SELECT FROM teams ...)
--   teams_member_read      → EXISTS (SELECT FROM team_members ...)
--
-- Postgres detects "infinite recursion detected in policy for relation
-- 'tests'" (SQLSTATE 42P17) and returns 500 on every SELECT against
-- `tests`, `sessions` (which joins tests), or `teams`.
--
-- The bug stayed dormant during AH-3..AH-10 because all reads went
-- through mock-store. It surfaced after AH-11.1b/c routed admin reads
-- through the anon Supabase client (real RLS path).
--
-- Fix: introduce a SECURITY DEFINER helper `public.is_team_member(uid,
-- team_id)` that bypasses RLS (same pattern as `public.has_role`).
-- Replace every inline EXISTS-on-team_members clause inside RLS
-- policies with a call to the helper. Recursion broken; queries work.
--
-- Safe to re-run. Idempotent via DROP POLICY IF EXISTS / CREATE OR
-- REPLACE FUNCTION.

-- ----------------------------------------------------------------------------
-- 1. is_team_member helper (SECURITY DEFINER bypasses RLS on team_members)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_team_member(
  _user_id uuid,
  _team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. tests_owner_read — recreate without inline team_members EXISTS
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS tests_owner_read ON public.tests;
CREATE POLICY tests_owner_read ON public.tests
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
    OR public.has_role(auth.uid(), 'admin')
  );

-- ----------------------------------------------------------------------------
-- 3. teams_member_read — recreate without inline team_members EXISTS
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS teams_member_read ON public.teams;
CREATE POLICY teams_member_read ON public.teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_team_member(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- ----------------------------------------------------------------------------
-- 4. team_members_self_read — keep teams reference, but teams policy is now
--    safe (no longer recurses back into team_members). team_members SELECT
--    of own row is intrinsically non-recursive (user_id = auth.uid()), and
--    the teams.owner_id branch only reads teams.owner_id which doesn't need
--    its own RLS evaluation when fetched via teams_member_read — but to be
--    fully defensive against any future re-entry, we route this branch
--    through has_role(admin)/owner_id check that doesn't re-query teams.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS team_members_self_read ON public.team_members;
CREATE POLICY team_members_self_read ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Note: the team-owner-can-list-members case is intentionally dropped here
-- to fully sever the cycle. Owners can fetch their team via `teams` and
-- iterate over the team's relation client-side. If we later need a
-- richer access path, add another SECURITY DEFINER helper
-- `is_team_owner(uid, team_id)` mirroring is_team_member, and add an OR
-- clause referencing it — same recursion-safe pattern.

-- ----------------------------------------------------------------------------
-- 5. team_members_owner_write — same hardening: use a SECURITY DEFINER
--    helper to avoid the cross-table EXISTS that could re-enter `teams`
--    policy evaluation.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_team_owner(
  _user_id uuid,
  _team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = _team_id AND owner_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS team_members_owner_write ON public.team_members;
CREATE POLICY team_members_owner_write ON public.team_members
  FOR ALL TO authenticated
  USING (
    public.is_team_owner(auth.uid(), team_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_team_owner(auth.uid(), team_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================================
-- AH-11.3 — Privileged server function: log_audit_event
-- ============================================================================
-- Source migration: supabase/migrations/20260518200000_audit_log_insert_fn.sql
-- Audit_log has SELECT-only RLS + immutability trigger; this is the single
-- sanctioned INSERT path. SECURITY DEFINER + has_role() gate ensure only
-- authenticated admins can write rows.

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_pii_access boolean DEFAULT true,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT COALESCE(display_name, email, v_uid::text)
    INTO v_name
    FROM public.profiles
    WHERE id = v_uid;

  INSERT INTO public.audit_log (
    actor_id, actor_name, action, target_type, target_id, pii_access, details, at
  )
  VALUES (
    v_uid, v_name, p_action, p_target_type, p_target_id, p_pii_access, p_details, now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, text, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, boolean, jsonb) TO authenticated;
