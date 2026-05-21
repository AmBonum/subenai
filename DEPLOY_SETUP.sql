-- ============================================================================
-- subenai.sk — Supabase bootstrap (standalone)
-- ============================================================================
--
-- This file is the canonical bootstrap for a fresh Supabase project. It
-- replays every migration in supabase/migrations/ in chronological order.
-- Apply once via Supabase Dashboard -> SQL Editor -> New query -> paste ->
-- Run. Re-runnable: every CREATE/INSERT uses IF NOT EXISTS / ON CONFLICT.
--
-- After applying:
--   1. Project Settings -> Authentication -> Multi-Factor -> Enable TOTP
--   2. Project Settings -> API -> copy `service_role secret` -> set as
--      SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages env vars
--   3. Bootstrap your admin: INSERT into public.user_roles per AH-1
--      runbook (tasks/AH-1-staging-runbook.md).
--
-- See tasks/AH-11-production-runbook.md for the full deployment runbook
-- including end-to-end smoke tests.
-- ============================================================================
-- Legacy usage notes
-- ============================================================================
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

-- E38 Phase A — test_set ownership + claim flow.
ALTER TABLE public.test_sets
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS test_sets_owner_id_idx
  ON public.test_sets (owner_id)
  WHERE owner_id IS NOT NULL;

DROP POLICY IF EXISTS "test_sets_owner_select" ON public.test_sets;
CREATE POLICY "test_sets_owner_select" ON public.test_sets
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "attempts_owner_select" ON public.attempts;
CREATE POLICY "attempts_owner_select" ON public.attempts
  FOR SELECT TO authenticated
  USING (test_set_id IN (SELECT id FROM public.test_sets WHERE owner_id = auth.uid()));

DROP FUNCTION IF EXISTS public.claim_test_set(UUID, TEXT);
CREATE FUNCTION public.claim_test_set(set_id UUID, password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE current_owner UUID; caller UUID; pw_ok BOOLEAN;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated'); END IF;
  IF set_id IS NULL OR password IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args'); END IF;
  SELECT owner_id INTO current_owner FROM public.test_sets WHERE id = set_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF current_owner IS NOT NULL AND current_owner <> caller THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'owned_by_other');
  END IF;
  IF current_owner = caller THEN RETURN jsonb_build_object('ok', true, 'already_owned', true); END IF;
  pw_ok := public.verify_test_set_password(set_id, password);
  IF NOT pw_ok THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_password'); END IF;
  UPDATE public.test_sets SET owner_id = caller WHERE id = set_id;
  RETURN jsonb_build_object('ok', true, 'already_owned', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_test_set(UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.list_my_test_sets();
CREATE FUNCTION public.list_my_test_sets()
RETURNS TABLE (id UUID, creator_label TEXT, passing_threshold INT2, question_count INT,
               collects_responses BOOLEAN, created_at TIMESTAMPTZ,
               attempts_count BIGINT, last_attempt_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT ts.id, ts.creator_label, ts.passing_threshold,
    COALESCE(array_length(ts.question_ids, 1), 0)::INT AS question_count,
    ts.collects_responses, ts.created_at,
    COALESCE(a.attempts_count, 0)::BIGINT AS attempts_count, a.last_attempt_at
  FROM public.test_sets ts
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS attempts_count, MAX(created_at) AS last_attempt_at
    FROM public.attempts WHERE test_set_id = ts.id
  ) a ON true
  WHERE ts.owner_id = auth.uid()
  ORDER BY ts.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_my_test_sets() TO authenticated;

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
  IF v_rows = 1 THEN
    -- AH-12.8: stamp 30-minute AAL2 substitute on the user record so
    -- `getAALStatus()` honors the backup-code recovery flow.
    UPDATE auth.users
       SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object(
              'aal2_via_backup_until',
              to_char(now() + interval '30 minutes', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
     WHERE id = v_uid;
    RETURN true;
  END IF;
  RETURN false;
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

-- ============================================================================
-- AH-11.4 — Public respondent flow: SECURITY DEFINER RPCs
-- ============================================================================
-- Source migration: supabase/migrations/20260518300000_public_respondent_rpc.sql
-- The /t/$shareId route runs anonymously. sessions / session_answers /
-- respondents have no anon INSERT policies; these three RPCs are the only
-- sanctioned anonymous write path. SECURITY DEFINER bypasses RLS; functions
-- re-resolve the test from share_id and guard against tampering.

CREATE OR REPLACE FUNCTION public.start_respondent_session(
  p_share_id text,
  p_intake jsonb DEFAULT '{}'::jsonb,
  p_consent_given boolean DEFAULT false,
  p_segment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test_id uuid;
  v_version int;
  v_respondent_id uuid;
  v_session_id uuid;
  v_email text;
  v_display_name text;
BEGIN
  SELECT id, version
    INTO v_test_id, v_version
    FROM public.tests
    WHERE share_id = p_share_id AND status = 'published';
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;

  v_email := NULLIF(p_intake ->> 'if_email', '');
  v_display_name := NULLIF(p_intake ->> 'if_name', '');

  IF v_email IS NOT NULL OR v_display_name IS NOT NULL THEN
    INSERT INTO public.respondents (email, display_name)
    VALUES (v_email, v_display_name)
    RETURNING id INTO v_respondent_id;
  END IF;

  INSERT INTO public.sessions (
    test_id, version, respondent_id, intake_data, consent_given,
    segment, status, started_at
  )
  VALUES (
    v_test_id, v_version, v_respondent_id, p_intake, p_consent_given,
    p_segment, 'in_progress', now()
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_respondent_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_value text,
  p_is_correct boolean DEFAULT NULL,
  p_time_ms int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.session_status;
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
  VALUES (p_session_id, p_question_id, p_value, p_is_correct, p_time_ms)
  ON CONFLICT (session_id, question_id) DO UPDATE
    SET value = EXCLUDED.value,
        is_correct = EXCLUDED.is_correct,
        time_ms = EXCLUDED.time_ms;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.finalize_respondent_session(
  p_session_id uuid,
  p_score numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.session_status;
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  UPDATE public.sessions
    SET status = 'completed',
        finished_at = now(),
        score = p_score
    WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_respondent_session(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_respondent_session(uuid, numeric) TO anon, authenticated;
-- ============================================================================
-- AH-11.5b.1 — Quiz questions DB infrastructure
-- ============================================================================
-- 1. Add `visual jsonb` column to public.questions
-- 2. Create public.quick_test_questions junction table
-- 3. Add SECURITY DEFINER RPC for anonymous reads
-- 4. Seed scam scenarios from src/lib/quiz/bank/questions.ts
--
-- Zero app code changes ship with this migration. The bank file stays
-- intact; AH-11.5b.2 wires /test onto get_quick_test_questions().
-- Re-runs are idempotent via ON CONFLICT.
-- ============================================================================

-- ---- (1) visual column ----
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visual jsonb;

-- ---- (2) quick_test_questions junction ----
CREATE TABLE IF NOT EXISTS public.quick_test_questions (
  quick_test_config_id int NOT NULL DEFAULT 1
    REFERENCES public.quick_test_config(id) ON DELETE CASCADE,
  question_id uuid NOT NULL
    REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  PRIMARY KEY (quick_test_config_id, question_id)
);
ALTER TABLE public.quick_test_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS quick_test_questions_order_idx
  ON public.quick_test_questions (quick_test_config_id, order_index);

-- Admin-only write. Anonymous reads go through get_quick_test_questions().
DROP POLICY IF EXISTS quick_test_questions_admin_write
  ON public.quick_test_questions;
CREATE POLICY quick_test_questions_admin_write
  ON public.quick_test_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---- (3) get_quick_test_questions RPC (AH-15.7 trilingual) ----
-- Anonymous-safe read. Returns N randomly-ordered published questions
-- with prompt/options/visual projected for the requested locale.
-- COALESCE(<col>_<locale>, <col>) means partial localization is safe:
-- rows without an en/cs translation fall back to the sk source-of-truth.
-- status='published' keeps drafts hidden; ORDER BY random() is
-- server-side so clients cannot enumerate the bank via repeat calls.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS prompt_en  text,
  ADD COLUMN IF NOT EXISTS prompt_cs  text,
  ADD COLUMN IF NOT EXISTS options_en jsonb,
  ADD COLUMN IF NOT EXISTS options_cs jsonb,
  ADD COLUMN IF NOT EXISTS visual_en  jsonb,
  ADD COLUMN IF NOT EXISTS visual_cs  jsonb;

DROP FUNCTION IF EXISTS public.get_quick_test_questions(int);

CREATE OR REPLACE FUNCTION public.get_quick_test_questions(
  p_limit  int  DEFAULT 10,
  p_locale text DEFAULT 'sk'
)
RETURNS TABLE (
  id uuid,
  type public.question_type,
  prompt text,
  options jsonb,
  correct jsonb,
  branch_slug text,
  difficulty text,
  visual jsonb,
  order_index int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    q.id,
    q.type,
    CASE
      WHEN p_locale = 'en' THEN COALESCE(q.prompt_en, q.prompt)
      WHEN p_locale = 'cs' THEN COALESCE(q.prompt_cs, q.prompt)
      ELSE q.prompt
    END AS prompt,
    CASE
      WHEN p_locale = 'en' THEN COALESCE(q.options_en, q.options)
      WHEN p_locale = 'cs' THEN COALESCE(q.options_cs, q.options)
      ELSE q.options
    END AS options,
    q.correct,
    q.branch_slug,
    q.difficulty,
    CASE
      WHEN p_locale = 'en' THEN COALESCE(q.visual_en, q.visual)
      WHEN p_locale = 'cs' THEN COALESCE(q.visual_cs, q.visual)
      ELSE q.visual
    END AS visual,
    qtq.order_index
  FROM public.quick_test_questions qtq
  JOIN public.questions q ON q.id = qtq.question_id
  WHERE qtq.quick_test_config_id = 1
    AND q.status = 'published'
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

REVOKE ALL ON FUNCTION public.get_quick_test_questions(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quick_test_questions(int, text)
  TO anon, authenticated;

-- ---- (4) Seed scam scenarios ----
-- Rows generated from src/lib/quiz/bank/questions.ts with deterministic
-- UUIDv5 ids (URL namespace + bank id). Re-running this migration is
-- a no-op thanks to ON CONFLICT.

-- questions rows
INSERT INTO public.questions (id, type, prompt, options, correct, branch_slug, difficulty, status, visual)
VALUES
  ('d0c42316-c2d2-532e-9cde-2814adaa1398', 'single', 'Prišla ti táto SMS. Klikneš?', '[{"id":"a","label":"Kliknem a zaplatím — len 2 eurá","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — Pošta neposiela linky","correct":true,"severity":null},{"id":"c","label":"Odpíšem na číslo a opýtam sa","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"InfoSMS","body":"Slovenská pošta: Vaša zásielka čaká. Doplaťte 1,99€ za doručenie:","link":"http://posta-sk.delivery-pay.com/track"}'::jsonb),
  ('d1085207-921d-55e5-b796-ccc9a18f68e5', 'single', 'DPD ti píše. Akcia?', '[{"id":"a","label":"Kliknem — chcem balík","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem stav v oficiálnej DPD appke / na dpd.sk","correct":true,"severity":null},{"id":"c","label":"Zavolám na to číslo","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"+421 902 555 121","body":"DPD: Balík nebolo možné doručiť, kuriér čaká na váš výber adresy:","link":"https://dpd-sk.parcel-redirect.info"}'::jsonb),
  ('ea5c587e-1163-512d-bb1d-4ac5839af252', 'single', 'SMS „od banky". Reaguješ?', '[{"id":"a","label":"Kliknem — môj účet je v ohrození","correct":false,"severity":"critical"},{"id":"b","label":"Otvorím Tatra banka appku ručne a pozriem aktivitu","correct":true,"severity":null},{"id":"c","label":"Odpíšem STOP","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"TatraBanka","body":"Zaznamenali sme prihlásenie z neznámeho zariadenia (Praha). Ak ste to neboli vy, overte tu:","link":"https://tatrabanka-secure.sk/overit"}'::jsonb),
  ('f1ac728e-8d6f-59a0-b44e-b2bd928d76da', 'single', 'Sporiteľňa ti píše. Klik?', '[{"id":"a","label":"Kliknem — potrebujem kartu","correct":false,"severity":"critical"},{"id":"b","label":"Zavolám na číslo na zadnej strane karty","correct":true,"severity":null},{"id":"c","label":"Odpíšem ANO","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"SLSP-Info","body":"Vaša karta bola dočasne zablokovaná z dôvodu bezpečnosti. Odblokujte tu:","link":"https://slsp.sk-bezpecnost.online"}'::jsonb),
  ('9c71b5ce-cc71-5111-a7fb-8bef03776c94', 'single', 'ČSOB ti píše o aktualizácii.', '[{"id":"a","label":"Aktualizujem — kvôli regulácii","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — banka takto nikdy nepýta údaje","correct":true,"severity":null},{"id":"c","label":"Zatelefonujem na číslo z SMS","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"CSOB","body":"Z dôvodu novej PSD2 regulácie aktualizujte vaše údaje do 24h, inak bude účet pozastavený:","link":"https://csob-update.eu/auth"}'::jsonb),
  ('23d550d2-5586-55fa-b7d4-2b4917c83fb2', 'single', 'Práve si zadal heslo do net bankingu a prišla ti táto SMS. Klikneš na potvrdiť?', '[{"id":"a","label":"Áno — práve som sa prihlasoval","correct":false,"severity":"critical"},{"id":"b","label":"Nie — neposielal som žiadnu platbu","correct":true,"severity":null},{"id":"c","label":"Pre istotu zadám kód do appky","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"sms","sender":"TB SecureCode","body":"Potvrdte transakciu: 2 450€ → IBAN SK21 0900 0000 0050 1234 5678. Kód: 884213"}'::jsonb),
  ('cc113595-caa2-5925-9e0f-7a1fe6ea53a7', 'single', 'Daňový úrad ti vraj vracia preplatok.', '[{"id":"a","label":"Zadám kartu — chcem peniaze","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — daniari neposielajú peniaze cez SMS link","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"DanovyUrad","body":"Bol vám priznaný preplatok 287,50€. Pre vyplatenie zadajte údaje karty:","link":"https://financnasprava-vratky.sk"}'::jsonb),
  ('69f19901-6291-5607-a7f7-108a384bec7d', 'single', 'Tento email — phishing alebo legit?', '[{"id":"a","label":"Legit — kliknem aktualizovať","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `netfl1x` má jednotku namiesto `i`","correct":true,"severity":null},{"id":"c","label":"Legit, ale prihlásim sa cez appku","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Netflix Security","fromEmail":"security@netfl1x-account.com","subject":"Vaše predplatné bolo pozastavené","body":"Zistili sme problém s platbou. Aktualizujte fakturačné údaje do 24h, inak bude účet zrušený.","cta":"Aktualizovať teraz"}'::jsonb),
  ('1327585e-05e8-50b7-9f83-40e2c6b957f6', 'single', 'Microsoft hlási problém. Reakcia?', '[{"id":"a","label":"Kliknem — niekto sa hacká","correct":false,"severity":"critical"},{"id":"b","label":"Otvorím account.microsoft.com ručne v prehliadači","correct":true,"severity":null},{"id":"c","label":"Pošlem to IT oddeleniu na kontrolu","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Microsoft Account Team","fromEmail":"no-reply@microsoft-verify.com","subject":"Neobvyklá aktivita na vašom účte","body":"Zistili sme prihlásenie z Ruska. Ak to neboli vy, kliknite a zabezpečte účet.","cta":"Zabezpečiť účet"}'::jsonb),
  ('b3397560-b85e-511a-8369-a57318a3b3eb', 'single', 'Apple ti tvrdí, že si kúpil aplikáciu.', '[{"id":"a","label":"Kliknem — nič som nekupoval","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem nákupy v App Store / appleid.apple.com","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Apple Support","fromEmail":"billing@apple-receipts.co","subject":"Faktúra: Final Cut Pro — 329,99€","body":"Ďakujeme za nákup. Ak ste neautorizovali túto transakciu, kliknite na zrušenie do 12 hodín.","cta":"Zrušiť transakciu"}'::jsonb),
  ('87f64998-50db-5d6d-8845-659860851939', 'single', 'Google Drive zdieľanie. Otvoríš?', '[{"id":"a","label":"Otvorím — pozná moju adresu","correct":false,"severity":"medium"},{"id":"b","label":"Otvorím Drive ručne a pozriem zdieľané","correct":true,"severity":null},{"id":"c","label":"Pošlem mu odpoveď, kto je","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Peter Novák (cez Google Drive)","fromEmail":"drive-shares-noreply@google.com","subject":"Peter zdieľal s vami: Faktura_2024.pdf","body":"Peter Novák zdieľal s vami dokument. Otvorte ho a prihláste sa pre prístup.","cta":"Otvoriť dokument"}'::jsonb),
  ('e6875080-21f4-5c56-8f44-4b4f238aea14', 'single', 'Ponuka práce na LinkedIn cez email.', '[{"id":"a","label":"Pošlem — znie to skvele","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — pýtať OP+IBAN pred pohovorom = scam","correct":true,"severity":null},{"id":"c","label":"Pýtam sa najprv viac detailov","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"HR Recruiter","fromEmail":"recruiter@global-talent-hub.work","subject":"Pracovná ponuka 4500€ remote — pre vás","body":"Videli sme váš profil. Sme schopní vám ponúknuť pozíciu Marketing Assistant, plat 4500€/mesiac, plne remote. Pre štart pošlite kópiu OP a IBAN."}'::jsonb),
  ('68e42fdc-82a7-515d-8acb-2cab6ab5f2df', 'single', 'Email od šéfky. Reaguješ?', '[{"id":"a","label":"Kúpim a pošlem kódy — je to šéfka","correct":false,"severity":"critical"},{"id":"b","label":"Najprv jej zavolám/napíšem priamo","correct":true,"severity":null},{"id":"c","label":"Odpíšem na ten email","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Jana Nováková","fromEmail":"jana.novakova@firma.sk","subject":"Rýchla pomoc","body":"Ahoj, som na meetingu, nemôžem volať. Potrebujem urgentne kúpiť 5 Apple gift kariet pre klienta. Pošli mi kódy SMS-kou. Nákup ti preplatíme zajtra."}'::jsonb),
  ('dc04128f-7d7f-5d11-8c7e-a0bf65ace3db', 'single', 'PayPal ti údajne posiela peniaze.', '[{"id":"a","label":"Prijmem — peniaze sú peniaze","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — `paypa1` je číslo, nie pravý PayPal","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"PayPal","fromEmail":"service@paypa1-secure.com","subject":"Dostali ste 850 USD — potvrďte príjem","body":"Pre prijatie platby sa prihláste a potvrďte transakciu. Po 24h prepadne.","cta":"Prijať platbu"}'::jsonb),
  ('1e70576d-b484-57d5-9a6c-3fa2f8a4f7b2', 'single', 'iCloud hlási, že máš plný úložný priestor.', '[{"id":"a","label":"Upgradnem — nechcem stratiť fotky","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem v Nastavenia > iCloud na telefóne","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"iCloud","fromEmail":"support@icloud-storage-help.com","subject":"Vaše úložisko je plné — fotky budú zmazané","body":"Aktualizujte plán pre zachovanie vašich fotografií. Akcia končí dnes.","cta":"Upgrade"}'::jsonb),
  ('ee23fe54-923e-5f07-ab63-f6e18cd722c9', 'single', 'Ktorá je pravá Tatra banka?', '[{"id":"a","label":"tatrabanka.sk","correct":true,"severity":null},{"id":"b","label":"tatra-banka.sk","correct":false,"severity":"critical"},{"id":"c","label":"tatrabanka.secure-login.sk","correct":false,"severity":"critical"},{"id":"d","label":"tatrabanka.sk.login.com","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'easy', 'published', NULL),
  ('ca4a271f-5d44-50c2-9a3a-b65c4b6ebd03', 'single', 'Klikneš sa na túto URL. Prihlásiš?', '[{"id":"a","label":"Áno","correct":false,"severity":"critical"},{"id":"b","label":"Nie — pravý SLSP je `slsp.sk`","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', '{"kind":"url","url":"https://slsp-sk.online/auth/login"}'::jsonb),
  ('e847de09-5508-5d80-bdd0-45d212557449', 'single', 'Si na tejto adrese. Je to pravý Google?', '[{"id":"a","label":"Áno — vidím `google.com`","correct":false,"severity":"critical"},{"id":"b","label":"Nie — skutočná doména je `signin-verify.app`","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'hard', 'published', '{"kind":"url","url":"https://accounts.google.com.signin-verify.app"}'::jsonb),
  ('2872ee01-06dd-5e9f-91e4-4fcb98882d75', 'single', 'Pozri pozorne na URL.', '[{"id":"a","label":"Pravý Apple","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `а` je cyrilské, nie latinské `a`","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'hard', 'published', '{"kind":"url","url":"https://www.аpple.com/account"}'::jsonb),
  ('2cf11779-9512-5f37-ae42-3c1eb344690d', 'single', 'Pravá Slovenská pošta?', '[{"id":"a","label":"posta.sk","correct":true,"severity":null},{"id":"b","label":"slovenskaposta-online.sk","correct":false,"severity":"critical"},{"id":"c","label":"posta.sk-zasielky.com","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'easy', 'published', NULL),
  ('4521257a-6444-54d4-8c11-0bc1698a099d', 'single', 'Pravý ČSOB?', '[{"id":"a","label":"csob.sk","correct":true,"severity":null},{"id":"b","label":"csob-banking.sk","correct":false,"severity":"critical"},{"id":"c","label":"csob.secure.sk","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'easy', 'published', NULL),
  ('39e73a9f-0f42-57f9-8666-0853565dfdfc', 'single', 'V SMS prišiel skrátený link. Klikneš?', '[{"id":"a","label":"Áno — bit.ly je seriózny","correct":false,"severity":"medium"},{"id":"b","label":"Nie — neviem, kam skutočne vedie","correct":true,"severity":null},{"id":"c","label":"Áno, ale len cez mobil","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', '{"kind":"url","url":"https://bit.ly/3xQ7pK2"}'::jsonb),
  ('47c547ac-85ba-5b39-a9ce-b8706aec7fa6', 'single', 'Pravá Allegro?', '[{"id":"a","label":"allegro.sk","correct":true,"severity":null},{"id":"b","label":"alegro.sk","correct":false,"severity":"critical"},{"id":"c","label":"allegro-shop.sk","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'medium', 'published', NULL),
  ('091b5809-1fd4-5234-b0f3-94eb839a283d', 'single', 'Klikol si v SMS. Prihlásiš sa?', '[{"id":"a","label":"Áno — vidím orange.sk","correct":false,"severity":"critical"},{"id":"b","label":"Nie — skutočná doména je `faktura-zaplatit.com`","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', '{"kind":"url","url":"https://orange.sk.faktura-zaplatit.com"}'::jsonb),
  ('891a3790-41ed-52ae-9551-d717b62b2bf4', 'single', 'Stránka má zelený zámok 🔒. Je teda bezpečná?', '[{"id":"a","label":"Áno — HTTPS = bezpečné","correct":false,"severity":"medium"},{"id":"b","label":"Nie — HTTPS znamená šifrované, nie že nie je phishing","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', NULL),
  ('cb1f6559-8c6a-528d-b724-6f74bb87d50b', 'single', 'Ktorá je pravá Booking.com?', '[{"id":"a","label":"booking.com","correct":true,"severity":null},{"id":"b","label":"booking.com.reservation-confirm.net","correct":false,"severity":"critical"},{"id":"c","label":"secure-booking.com","correct":false,"severity":"critical"},{"id":"d","label":"booking-com.support","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'hard', 'published', NULL),
  ('cbcf9c6b-861b-5f3a-9b25-08b058ddb95d', 'single', 'Pravý Facebook login?', '[{"id":"a","label":"facebook.com","correct":true,"severity":null},{"id":"b","label":"facebook-login.com","correct":false,"severity":"critical"},{"id":"c","label":"fb-secure.com","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'easy', 'published', NULL),
  ('76abca68-1a07-527b-ada2-835ee8b28e5e', 'single', 'Inzerát na Bazoši — kúpiš?', '[{"id":"a","label":"Kúpim — výhodná cena","correct":false,"severity":"critical"},{"id":"b","label":"Scam — cena príliš nízka + platba vopred","correct":true,"severity":null},{"id":"c","label":"Pýtam si viac fotiek a kúpim","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'easy', 'published', '{"kind":"listing","site":"Bazos","title":"iPhone 15 Pro Max 256GB","price":"299 €","location":"Košice","description":"Úplne nový, neotvorená krabica. Predávam kvôli darčeku, ktorý sa nehodil. Posielam poštou po platbe vopred na účet.","imageEmoji":"📱"}'::jsonb),
  ('98eabcb5-cfbb-5f99-b4c6-473e98c5ad7d', 'single', 'Inzerát na auto. Pôjdeš sa pozrieť?', '[{"id":"a","label":"Pošlem zálohu — auto je super","correct":false,"severity":"critical"},{"id":"b","label":"Scam — Western Union + auto v zahraničí = klasika","correct":true,"severity":null},{"id":"c","label":"Najprv si vypýtam VIN","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', '{"kind":"listing","site":"Bazar","title":"BMW 320d 2019, 45000 km","price":"4 800 €","location":"Holandsko (privezem na SK)","description":"Auto je momentálne v Holandsku. Pošlem fotky, môžeme dohodnúť dovoz. Záloha 500€ cez Western Union pre rezerváciu.","imageEmoji":"🚗"}'::jsonb),
  ('a37dca13-9544-55a7-ae60-732ebb588ec3', 'single', 'Eshop s -80% akciami na značky (Nike, Gucci). Cena Air Jordan 39€. Reálne?', '[{"id":"a","label":"Áno — možno výpredaj","correct":false,"severity":"critical"},{"id":"b","label":"Fake eshop — buď ti nepríde nič, alebo čínska kópia","correct":true,"severity":null},{"id":"c","label":"Možno sivý dovoz, kúpim","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('db2cddf9-20da-5ff8-923b-b4f56218d8c4', 'single', 'Reklama na IG s tvárou známej slovenskej moderátorky. Kúpiš kapsuly?', '[{"id":"a","label":"Kúpim — odporúča to ona","correct":false,"severity":"critical"},{"id":"b","label":"Scam — tvár je ukradnutá, kapsuly sú placebo/škodlivé","correct":true,"severity":null},{"id":"c","label":"Skontrolujem na jej profile","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', '{"kind":"instagram","account":"zdravie_premium_sk","verified":false,"body":"„Schudla som 14 kg za 21 dní! Lekári ma chcú zažalovať. Limitovaná akcia -70% iba dnes.\"","imageEmoji":"💊","cta":"Zistiť viac"}'::jsonb),
  ('b6307537-86ab-5e38-88e4-3f017e258423', 'single', 'Elon Musk live stream rozdáva Bitcoin. Pošleš 0,1 BTC, dostaneš späť 0,2 BTC. Reálne?', '[{"id":"a","label":"Skúsim s malou sumou","correct":false,"severity":"critical"},{"id":"b","label":"Scam — ide o deepfake / staré video","correct":true,"severity":null},{"id":"c","label":"Áno ak ide o oficiálny live","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('25029db2-2517-5c41-9083-52b4b2507e21', 'single', 'Mesiac chatuješ s krásnou doktorkou v Sýrii. Prosí o 800€ na lietadlo, vráti to. Pošleš?', '[{"id":"a","label":"Áno — milujem ju","correct":false,"severity":"critical"},{"id":"b","label":"Romance scam — nikdy ju nestretneš","correct":true,"severity":null},{"id":"c","label":"Pošlem 200€ ako test","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('cb600a25-4441-5a3c-a347-51c337890806', 'single', 'V FB skupine niekto predáva lístky na koncert pod cenu. Pošleš peniaze cez Revolut?', '[{"id":"a","label":"Áno — zľava je zľava","correct":false,"severity":"critical"},{"id":"b","label":"Nie — kupujem len cez oficiálny resale (Ticketportal/Predpredaj)","correct":true,"severity":null},{"id":"c","label":"Pošlem polovicu, druhú po doručení","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('2d5a2aa8-4ea5-5b54-bf0e-0f68d6efe160', 'single', 'Reklama: „Investícia 250€ → 18 000€ za 3 mesiace cez AI obchodovanie. Garantujeme." Skúsiš?', '[{"id":"a","label":"Skúsim s 250€","correct":false,"severity":"critical"},{"id":"b","label":"Scam — žiadna garantovaná investícia neexistuje","correct":true,"severity":null},{"id":"c","label":"Skúsim, ale len cez Revolut","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('94a84bcd-673d-5404-ada0-478e9e2c88ab', 'single', 'Na FB Marketplace ti predajca pošle „doručovací link" na overenie adresy. Klikneš?', '[{"id":"a","label":"Kliknem — chcem produkt","correct":false,"severity":"critical"},{"id":"b","label":"Nie — Marketplace nemá takúto funkciu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('811a44e6-111a-5c1e-996b-5aaeee3cf817', 'single', 'Eshop má 4,9★ z 2000 recenzií, ale všetky sú z posledných 3 týždňov a generické („Super produkt!"). Kúpiš?', '[{"id":"a","label":"Áno — recenzie sú dobré","correct":false,"severity":"medium"},{"id":"b","label":"Nie — fake recenzie nakúpené","correct":true,"severity":null},{"id":"c","label":"Kúpim na dobierku","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('c493ec4a-9b2f-524b-83c9-d807a8d223a4', 'single', 'Volá ti niekto z banky o podozrivej transakcii a pýta kód z SMS.', '[{"id":"a","label":"Nadiktujem kód — banka volá","correct":false,"severity":"critical"},{"id":"b","label":"Zavesím a zavolám sama na číslo z karty","correct":true,"severity":null},{"id":"c","label":"Pýtam overujúce otázky","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', '{"kind":"call","caller":"Tatra Banka — Bezpečnosť","number":"+421 2 5919 1000","hint":"Zobrazené ako overené v kontaktoch"}'::jsonb),
  ('4023b60e-aaa7-511d-aaf2-fcb418430dbb', 'single', 'Na parkovacom automate visí nálepka s QR kódom „Zaplatiť rýchlo cez QR". Tvoja appka nefunguje. Naskenuješ?', '[{"id":"a","label":"Áno — naskenujem a zaplatím","correct":false,"severity":"critical"},{"id":"b","label":"Nie — zaplatím cez SMS na čísle automatu","correct":true,"severity":null},{"id":"c","label":"Naskenujem, skontrolujem URL","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('6ed4c2ef-ebac-5600-b221-0352e6bd3f09', 'single', 'Volá ti niekto s indickým prízvukom: „Som z Microsoftu, váš počítač je infikovaný."', '[{"id":"a","label":"Spolupracujem, dám mu vzdialený prístup","correct":false,"severity":"critical"},{"id":"b","label":"Zavesím a zablokujem číslo","correct":true,"severity":null},{"id":"c","label":"Pýtam sa detaily","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL),
  ('eca4000a-1bc2-5882-800c-53c9a1ac1eef', 'single', 'Volá „policajt": „Vaše konto bolo napadnuté, presuňte peniaze na bezpečný účet."', '[{"id":"a","label":"Presuniem — ide o moje peniaze","correct":false,"severity":"critical"},{"id":"b","label":"Zložím a zavolám 158 sám","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('89a5f706-78da-5914-b416-da5b3194d9c0', 'single', 'WhatsApp od „dcéry" z neznámeho čísla: „Mami, stratila som telefón, potrebujem urgentne 500€ na nový. Pošli na tento účet."', '[{"id":"a","label":"Pošlem — je to dcéra","correct":false,"severity":"critical"},{"id":"b","label":"Zavolám dcére na pôvodné číslo a overím","correct":true,"severity":null},{"id":"c","label":"Odpíšem a pýtam detaily","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('dcf08155-5676-5da5-8638-9d2b44c9b127', 'single', 'Na letisku vidíš otvorené WiFi „Free_Airport_WiFi“. Pripojíš a zaloguješ sa do banky?', '[{"id":"a","label":"Áno — internet zadarmo","correct":false,"severity":"critical"},{"id":"b","label":"Pripojím cez VPN, alebo radšej mobilné dáta","correct":true,"severity":null},{"id":"c","label":"Pripojím, ale len na čítanie news","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('c13411fb-d083-54b6-adde-2c5b47b3fbfc', 'single', 'Na parkovisku pred firmou nájdeš USB kľúč s nápisom „Mzdy 2024". Strčíš ho do PC?', '[{"id":"a","label":"Strčím — som zvedavý","correct":false,"severity":"critical"},{"id":"b","label":"Odovzdám IT bez pripojenia","correct":true,"severity":null},{"id":"c","label":"Strčím do svojho súkromného PC","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('7c34768e-ccdb-5b15-a45d-bb5bcdb239df', 'single', 'Volá ti človek, predstaví sa ako pracovník banky. Pre overenie ti vraví: „Pošlem SMS s kódom, prečítate mi ho."', '[{"id":"a","label":"Prečítam — overuje moju identitu","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem a zavolám na banku","correct":true,"severity":null},{"id":"c","label":"Prečítam len posledné 3 čísla","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('f29988a5-c553-52b4-bd14-86a1dd851b46', 'single', 'Doma sa ti zariadenia odpojili od WiFi a router pýta nové prihlasovacie údaje cez stránku v prehliadači. Zadáš ich?', '[{"id":"a","label":"Zadám — chcem internet","correct":false,"severity":"medium"},{"id":"b","label":"Reštartujem router fyzicky a skontrolujem nastavenia priamo cez 192.168.x.x","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('0abf09fd-21c1-598d-bee9-5fcd84ef6f66', 'single', 'Pri obchode ťa zastaví človek so zoznamom „pomáhame deťom". Pýta IBAN aj kópiu OP na potvrdenie.', '[{"id":"a","label":"Dám — pomáham","correct":false,"severity":"critical"},{"id":"b","label":"Pošlem cez overenú nadáciu (Dobrý anjel, Plamienok…) online","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('69893d6e-6303-55e1-9972-8c8a2188c69c', 'single', 'Telefón ti zrazu stratil signál uprostred dňa. Po hodine ti chodia notifikácie z banky o platbách.', '[{"id":"a","label":"Počkám, či sa signál vráti","correct":false,"severity":"critical"},{"id":"b","label":"Okamžite zavolám operátora a banku z iného telefónu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('90a59e98-63c9-588e-8679-b715cc8eb878', 'single', 'Email od nigerijského princa, ktorý ti pošle 10 mil. USD za poplatok 200€. Akcia?', '[{"id":"a","label":"Pošlem 200€","correct":false,"severity":"critical"},{"id":"b","label":"Odpíšem — môže byť legit","correct":false,"severity":"medium"},{"id":"c","label":"Zmažem — 419 scam","correct":true,"severity":null}]'::jsonb, '[2]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('65158bc0-ec43-5233-93f9-81bd54d75460', 'single', 'SMS: „Vyhrali ste iPhone 16! Pre prevzatie zaplaťte poštovné 4€." Reakcia?', '[{"id":"a","label":"Zaplatím 4€","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — žiadnu súťaž som nehral","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"AKCIA","body":"Gratulujeme, vyhrali ste iPhone 16 Pro! Pre prevzatie zaplaťte 4€ za poštovné:","link":"https://vyhra-iphone.live"}'::jsonb),
  ('d5c2d7dd-6f31-5370-8b30-f4d512c3d8a4', 'single', 'Kamoška ti na Insta píše: „Hlasuj za mňa v súťaži, klikni link a prihlás sa cez Insta." Klikneš?', '[{"id":"a","label":"Áno — pomôžem kamoške","correct":false,"severity":"critical"},{"id":"b","label":"Najprv jej zavolám — pravdepodobne má hacknutý účet","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('e5ec4150-aaed-5dba-8999-82009b3410ee', 'single', 'Na Bazoši kupec povie: „Pošlem ti 500€ cez Revolut, ale potrebujem tvoje heslo na overenie účtu."', '[{"id":"a","label":"Pošlem heslo — chcem peniaze","correct":false,"severity":"critical"},{"id":"b","label":"Nepošlem — Revolut žiadne heslo nepotrebuje","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('3f83f65d-c960-5300-8e22-d1eaac4a964f', 'single', 'Niekto ti tvrdí, že ti omylom poslal 200€ a prosí, aby si mu poslal naspäť. Účet zatiaľ neukazuje vklad. Pošleš?', '[{"id":"a","label":"Áno — slušné by bolo vrátiť","correct":false,"severity":"critical"},{"id":"b","label":"Nie — počkám, kým peniaze reálne prídu (aj 24h)","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'medium', 'published', NULL),
  ('cf091954-21c8-539e-9e6d-c5ee4ce9ec67', 'single', 'Predávaš na Bazoši. Záujemca napíše:', '[{"id":"a","label":"Potvrdím — chcem predať","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — Bazoš nemá žiaden takýto systém","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"+44 7700 900123","body":"Mám záujem o váš inzerát. Pre dokončenie kúpy potvrdte adresu doručenia tu:","link":"https://bazos-secure-payment.com/confirm"}'::jsonb),
  ('87bded60-d620-5595-8c61-39c8dfdc9bcd', 'single', 'Hosť ti na Airbnb napíše a pošle „mimo platformy" lacnejšiu zľavu cez email.', '[{"id":"a","label":"Súhlasím — ušetríme obaja","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — komunikácia mimo Airbnb stráca ochranu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Marko","fromEmail":"marko.airbnb@gmail.com","subject":"Lepšia ponuka — bez poplatkov platformy","body":"Ahoj, chcel by som rezervovať priamo, ušetríme 15% na poplatkoch. Pošlem zálohu na tvoj IBAN."}'::jsonb),
  ('64108ffa-9b89-51a5-8f84-fa9082c5cbd9', 'single', 'Pravý PayPal?', '[{"id":"a","label":"paypal.com","correct":true,"severity":null},{"id":"b","label":"paypal-secure.com","correct":false,"severity":"critical"},{"id":"c","label":"paypaI.com (s veľkým I)","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'medium', 'published', NULL),
  ('9b0c41fb-ba2e-5a5a-9d21-7932f4d7eee0', 'single', 'Pravý Amazon?', '[{"id":"a","label":"amazon.de","correct":true,"severity":null},{"id":"b","label":"amaz0n.de","correct":false,"severity":"critical"},{"id":"c","label":"amazon-eu.de","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'easy', 'published', NULL),
  ('19740138-fda3-53c5-8601-24aa50f3cd7f', 'single', 'Reklama: „Roztoč koleso na Temu, vyhraj 1500€!". Klikneš a prihlásiš sa?', '[{"id":"a","label":"Áno — chcem 1500€","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — buď fake landing alebo dark pattern","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('7407b22f-1b07-5882-9b2f-85cff44a25d0', 'single', 'Pri dverách stojí „pracovník SPP" a žiada vidieť faktúru aj OP, lebo „máš preplatok".', '[{"id":"a","label":"Ukážem — preplatok je super","correct":false,"severity":"critical"},{"id":"b","label":"Pýtam si preukaz a zavolám priamo na SPP linku","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('b17bdc88-7678-58c7-acc9-13bbb44b5752', 'single', 'Balík sa nedoručil.', '[{"id":"a","label":"Overím sa — chcem balík","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem stav v Packeta appke","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"Packeta","body":"Vaša zásielka je pripravená v Packeta boxe. Pre vyzdvihnutie sa overte:","link":"https://packeta-box.online/pickup"}'::jsonb),
  ('b4e3267e-447a-5648-9142-ac3c10f60e78', 'single', 'O2 ti hlási nedoplatok.', '[{"id":"a","label":"Uhradím — nechcem stratiť číslo","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem v Moje O2 appke","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"O2 SK","body":"Vážený zákazník, evidujeme nedoplatok 27,40€. Uhraďte do 24h, inak vypneme číslo:","link":"https://o2-sk.faktury-online.com"}'::jsonb),
  ('e445dee0-1de0-542f-80a0-fe63fbacff20', 'single', 'Pravý Instagram login?', '[{"id":"a","label":"instagram.com","correct":true,"severity":null},{"id":"b","label":"instagram.com-login.help","correct":false,"severity":"critical"},{"id":"c","label":"ig-secure.com","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'medium', 'published', NULL),
  ('6550013d-d06f-53eb-89e7-d445bdc4e3d2', 'single', 'Predávaš PS5. Kupec píše „Pošlem peniaze cez DPD COD na tvoju adresu."', '[{"id":"a","label":"Pošlem mu adresu — peniaze cez kuriéra","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — kuriér peniaze neprenáša, je to scam","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('50ac723d-8e4d-59ff-8b8e-ec6811d1c57b', 'single', 'Pri surfovaní vyskočí: „Váš počítač má 5 vírusov! Stiahnite Antivirus Pro hneď." Akcia?', '[{"id":"a","label":"Stiahnem — vírusy sú zlé","correct":false,"severity":"critical"},{"id":"b","label":"Zavriem zatlačením Esc / zatvorením tabu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('f95434ab-0a13-53be-aae5-b3f2f9e61e5a', 'single', 'Faktúra .docm/.zip príloha od „dodávateľa".', '[{"id":"a","label":"Otvorím a povolím makrá","correct":false,"severity":"critical"},{"id":"b","label":"Neotváram — neznámy odosielateľ + makrá = malware","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Účtáreň","fromEmail":"ucto@dodavatel-faktura.eu","subject":"Faktúra č. 2024-9931 — splatnosť 7 dní","body":"V prílohe zasielame faktúru za služby. Pre zobrazenie povoľte makrá."}'::jsonb),
  ('9205b0dd-8ae4-5af5-9628-ddb23685f7b7', 'single', 'Šéf ti zavolá cez WhatsApp video — vidíš jeho tvár, ale obraz pixeluje. Žiada urgentný prevod 18 000€.', '[{"id":"a","label":"Pošlem — vidím šéfa","correct":false,"severity":"critical"},{"id":"b","label":"Overím cez druhý kanál (osobne / firemný telefón)","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('f95622e0-e553-5a0a-9b70-0f62e954e940', 'single', 'Inzerát: „Pracuj z domu, 80€/deň, len kopírovať texty. Začni dnes, registračný poplatok 49€."', '[{"id":"a","label":"Zaregistrujem sa za 49€","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — práca, kde platíš ty, nie je práca","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('563a9098-4e08-550e-bd86-ed451f687721', 'single', 'Telekom ti vraj posiela bonus.', '[{"id":"a","label":"Vyzdvihnem — 50€ je 50€","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem v Telekom appke","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"TELEKOM","body":"Bonus 50€ za vernosť! Vyzdvihnite si ho do 48h:","link":"https://telekom.bonus-vernost.sk"}'::jsonb),
  ('3be19514-0401-5f69-8a6b-98328ac144da', 'single', 'Pravý Google login?', '[{"id":"a","label":"accounts.google.com","correct":true,"severity":null},{"id":"b","label":"accounts-google.com","correct":false,"severity":"critical"},{"id":"c","label":"google.com-signin.net","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'medium', 'published', NULL),
  ('9160f82b-9dbd-55c5-9908-5750603d03bd', 'single', 'Po rezervácii na Booking ti hostiteľ pošle správu cez Booking chat: „Karta vám neprešla, dokončite cez tento link." Klikneš?', '[{"id":"a","label":"Kliknem — chcem si zachovať rezerváciu","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem v Booking appke a kontaktujem support","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('4238c64f-a51e-52fb-b56b-fe5b60a5c591', 'single', 'Stránka chce nainštalovať „bezpečnostný certifikát" pre prístup. Akcia?', '[{"id":"a","label":"Nainštalujem — chcem na stránku","correct":false,"severity":"critical"},{"id":"b","label":"Zavriem — žiadna stránka takto nepýta certifikát","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL),
  ('4129cfb1-17f7-5ba9-9389-559e1da147f4', 'single', 'Email: „Vaše dedičstvo 1,2 mil. EUR po anglickom tete čaká. Pošlite OP a 350€ na notárske poplatky."', '[{"id":"a","label":"Pošlem — nevedel som o tete","correct":false,"severity":"critical"},{"id":"b","label":"Zmažem — inheritance scam","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('a6acbbd8-fd7d-5180-92f7-4d0d14b7e7f8', 'single', 'Banka ti posiela link na „aktiváciu nového bezpečnostného systému".', '[{"id":"a","label":"Aktivujem — chcem platiť","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem oznam v appke / na vub.sk priamo","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"VÚB Banka","fromEmail":"security@vub-online.sk","subject":"Povinná aktivácia 3D Secure 2.0","body":"Od 1. mája musia všetci klienti aktivovať nový bezpečnostný systém. Inak nebudete môcť platiť kartou online.","cta":"Aktivovať"}'::jsonb),
  ('a10a84ad-eff5-539d-93df-e4e08b2fd9da', 'single', 'Po katastrofe vidíš na FB výzvu „Pomôžte rodine X, IBAN: SK…" so srdcervúcou fotkou. Pošleš?', '[{"id":"a","label":"Pošlem — chcem pomôcť","correct":false,"severity":"critical"},{"id":"b","label":"Pošlem cez overenú zbierku (ľudialudom, donio)","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('61835464-3448-5b35-a07f-5112920d5f4a', 'single', 'Pravá VÚB?', '[{"id":"a","label":"vub.sk","correct":true,"severity":null},{"id":"b","label":"vub-banking.sk","correct":false,"severity":"critical"},{"id":"c","label":"vubbanka.sk","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'medium', 'published', NULL),
  ('62be4536-f938-57c4-a072-994dfdca161b', 'single', 'Revolut ti tvrdí, že máš pozastavený účet.', '[{"id":"a","label":"Potvrdím — chcem účet späť","correct":false,"severity":"critical"},{"id":"b","label":"Otvorím Revolut appku — tam vidím všetky správy","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"Revolut","body":"Váš účet bol dočasne pozastavený. Pre obnovenie potvrďte identitu:","link":"https://revolut-verify.app"}'::jsonb),
  ('89f0daa7-2702-590d-99bd-002954b7ada6', 'single', 'Banka ti zavolá: „Pre vyriešenie problému si stiahnite AnyDesk a dajte nám kód."', '[{"id":"a","label":"Stiahnem — vyriešia problém","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — banka nikdy nepotrebuje vzdialený prístup","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('49797c3c-a518-5a8b-a323-25a609299965', 'single', 'Insta reklama: „MrBeast rozdáva 1000$ prvým 100 ľudom! Stačí kliknúť."', '[{"id":"a","label":"Kliknem — som rýchly","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — celebrity giveaway scam","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'easy', 'published', NULL),
  ('2c1219c7-2bcc-573b-8194-273270bfec7c', 'single', 'Email: „Mám video, ako pozeráš porno. Pošli 800$ v Bitcoine, inak to pošlem všetkým kontaktom."', '[{"id":"a","label":"Zaplatím — nechcem hanbu","correct":false,"severity":"critical"},{"id":"b","label":"Zmažem — sextortion scam, žiadne video nemá","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'medium', 'published', NULL),
  ('8d0caaa0-2f0f-5284-b21f-b05d66e5491a', 'single', 'Pravý Alza?', '[{"id":"a","label":"alza.sk","correct":true,"severity":null},{"id":"b","label":"alza-eshop.sk","correct":false,"severity":"critical"},{"id":"c","label":"alza.sk.deal-zone.com","correct":false,"severity":"critical"},{"id":"d","label":"a1za.sk","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'hard', 'published', NULL),
  ('ef80e646-2411-5a23-98ab-166acd611195', 'single', 'LinkedIn ti hlási nové prepojenie.', '[{"id":"a","label":"Kliknem — práca láka","correct":false,"severity":"critical"},{"id":"b","label":"Otvorím linkedin.com ručne","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"LinkedIn","fromEmail":"no-reply@linkedin-jobs.career","subject":"Máte 3 nové ponuky práce — kliknite","body":"Headhunteri vás hľadajú. Aktivujte profil pre zobrazenie ponúk.","cta":"Zobraziť ponuky"}'::jsonb),
  ('80d0323b-69bd-5518-bf6d-8a37bd17798d', 'single', 'Pri surfovaní vyskočí: „Váš Chrome je zastaralý. Stiahnite update.exe."', '[{"id":"a","label":"Stiahnem update","correct":false,"severity":"critical"},{"id":"b","label":"Updaty robím cez Chrome menu (Pomocník → O Chrome)","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('16996d4a-6bc7-58a4-a289-28c39c161881', 'single', 'Eshop predáva Rolexy za 199€. „Originál, švajčiarsky, posledný kus."', '[{"id":"a","label":"Kúpim — výhodné","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — Rolex za 199€ je sci-fi","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('7d98e002-a223-5fac-af69-88e89f037718', 'single', 'Si na tejto adrese po kliku v emaile.', '[{"id":"a","label":"Pravý SLSP — vidím tatrabanka.sk","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — pravá doména je `user-portal.io`","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'hard', 'published', '{"kind":"url","url":"https://login.tatrabanka.sk.user-portal.io"}'::jsonb),
  ('e3b9c8e4-061b-58dc-828f-77722f6743b4', 'single', 'Príde email: „Niekto požiadal o reset hesla na vašom Google. Ak ste to neboli vy, ignorujte." Ty si nikto. Akcia?', '[{"id":"a","label":"Kliknem na „toto som nebol ja\" link","correct":false,"severity":"medium"},{"id":"b","label":"Ignorujem — varovanie zo skutočnej Google príde aj keď ignoruješ","correct":true,"severity":null},{"id":"c","label":"Resetujem heslo pre istotu cez link v emaile","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('5f06e6e2-7574-504e-b228-d25d454ae853', 'single', 'Eshop sa tvári profi: SK, IČO, kontakt. Recenzie 5★, ale na heureka.sk nie je. Sociálne siete prázdne. Kúpiš?', '[{"id":"a","label":"Áno — má IČO","correct":false,"severity":"medium"},{"id":"b","label":"Skontrolujem registráciu domény (whois) + SK firmy v ORSR","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('e1b3045c-2fd5-5b3f-80fa-6f8456ac826a', 'single', 'Predávaš laptop za 500€. Kupec pošle 700€ a žiada vrátiť 200€ späť, lebo „omylom". Vrátiš?', '[{"id":"a","label":"Vrátim — slušné","correct":false,"severity":"critical"},{"id":"b","label":"Počkám 2 týždne, či sa pôvodný prevod nestorno­vať","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('558a78c5-f89d-5950-8681-e200ea08f0b3', 'single', 'FedEx SMS o cle.', '[{"id":"a","label":"Zaplatím — len 4€","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem cez fedex.com s tracking číslom","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"FedEx","body":"Vaša zásielka čaká na zaplatenie clo 3,99€:","link":"https://fedex-customs.click/pay"}'::jsonb),
  ('02655814-5b40-5d45-b1d1-1484598d5439', 'single', 'Doména s ktorou TLD je najbezpečnejšia?', '[{"id":"a","label":".click","correct":false,"severity":"medium"},{"id":"b","label":".zip","correct":false,"severity":"medium"},{"id":"c","label":".sk od overenej značky","correct":true,"severity":null},{"id":"d","label":".online","correct":false,"severity":"medium"}]'::jsonb, '[2]'::jsonb, 'url', 'medium', 'published', NULL),
  ('f938eec3-d425-5e9c-a285-6552cea0248c', 'single', 'Známy z FB ti odporúča platformu „CryptoYieldPro" so 5% denným ziskom. Skúsiš s 200€?', '[{"id":"a","label":"Skúsim — známy mi to odporúča","correct":false,"severity":"critical"},{"id":"b","label":"Nie — známy je pravdepodobne ďalšia obeť (pyramída)","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('e7a99388-440e-5f89-8e5f-caba827b75f7', 'single', 'Z banky ti príde email s upozornením.', '[{"id":"a","label":"Kliknem v emaile na link","correct":false,"severity":"medium"},{"id":"b","label":"Otvorím ČSOB SmartBanking ručne","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"ČSOB Bezpečnosť","fromEmail":"no-reply@csob.sk","subject":"Bezpečnostné varovanie","body":"Pre bezpečnosť zmente heslo. Ak ste to neboli vy, prihláste sa do ČSOB SmartBanking a zmente heslo."}'::jsonb),
  ('4dbbb1a3-00ca-57d1-ad4e-69f1adaa77eb', 'single', 'Doma máš v schránke list „Zaplatenie pokuty za parkovanie 28€, IBAN SK… variabilný 2024-X.". List vyzerá oficiálne.', '[{"id":"a","label":"Zaplatím — chcem to mať preč","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem na stránke mestskej polície / parkovacej spoločnosti","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('5c7c47f3-bebe-5921-81ad-45e20f973865', 'single', 'Štátna stránka — pravá?', '[{"id":"a","label":"slovensko.sk","correct":true,"severity":null},{"id":"b","label":"slovensko-portal.sk","correct":false,"severity":"critical"},{"id":"c","label":"slovensko.gov.online","correct":false,"severity":"critical"}]'::jsonb, '[0]'::jsonb, 'url', 'medium', 'published', NULL),
  ('e1b4b2c1-7f4d-54f7-8c28-ca5a8901d57a', 'single', 'V crypto peňaženke máš zrazu token „CLAIM 5000$". Klikneš na claim?', '[{"id":"a","label":"Kliknem — peniaze zadarmo","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — claim funkcia okradne celý wallet","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'medium', 'published', NULL),
  ('60638f52-27c8-58a6-ae7b-96668def55b2', 'single', 'SMS od polície.', '[{"id":"a","label":"Kliknem — chcem vedieť","correct":false,"severity":"critical"},{"id":"b","label":"Polícia neposiela SMS — ignorujem","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"sms","sender":"POLICIA SR","body":"Bola na vás podaná sťažnosť. Pre detaily kliknite:","link":"https://policia-sr.info/spis"}'::jsonb),
  ('f6adaae5-c05a-5204-ae1a-8fdd201a228f', 'single', 'Známy slovenský influencer ti píše DM: „Vyhrala si v mojej súťaži! Pošli adresu cez tento link."', '[{"id":"a","label":"Pošlem — výhra je výhra","correct":false,"severity":"critical"},{"id":"b","label":"Skontrolujem profil (verified ✓?) a kontaktujem cez oficiálne kanály","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('f67b9dba-7a9a-58a7-8e7b-61abd26782cb', 'single', 'Reklama: „Pôžička 5000€ bez registra a banky, schválime všetkým. Stačí poslať poplatok 49€."', '[{"id":"a","label":"Pošlem 49€ — potrebujem peniaze","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — žiadna seriózna pôžička nemá poplatok vopred","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('5dfc48cb-217a-5d07-b725-79f6d56beabf', 'single', 'Stránka eshopu má URL `myshop123.myshopify.com`. Je to dôveryhodné?', '[{"id":"a","label":"Áno — Shopify je značka","correct":false,"severity":"medium"},{"id":"b","label":"Shopify hostí kohokoľvek — over si predajcu zvlášť","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', NULL),
  ('83032416-9c7e-5a30-a4ae-a49e75907657', 'single', 'Kolega ti zdieľal Sharepoint dokument.', '[{"id":"a","label":"Otvorím — chcem vidieť bonus","correct":false,"severity":"critical"},{"id":"b","label":"Overím s Petrom osobne / na Teams","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Peter (Sharepoint)","fromEmail":"no-reply@sharepoint-share.online","subject":"Peter zdieľal s vami: Q4_Bonus.xlsx","body":"Otvorte dokument a prihláste sa cez Microsoft.","cta":"Otvoriť"}'::jsonb),
  ('996f45dc-d836-5fbb-9a1f-04ce99fb9502', 'single', 'Pop-up: „Vyplňte 30s prieskum a vyhrajte iPhone 15."', '[{"id":"a","label":"Vyplním","correct":false,"severity":"critical"},{"id":"b","label":"Zavriem — žiadny iPhone za 30s prieskum","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('4fdacd73-cba6-5ea2-b24c-08601db5864e', 'single', 'Predávaš na Bazoši za 200€. Kupec posiela link „pre overenie účtu Bazoš". Klikneš?', '[{"id":"a","label":"Áno — chcem predať","correct":false,"severity":"critical"},{"id":"b","label":"Bazoš nemá overovacie linky pre platby","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', '{"kind":"url","url":"https://bazos.sk-overit-platbu.com","secure":true}'::jsonb),
  ('bac067ec-c743-5152-bbd6-248b7eaa1606', 'single', 'Adresa: `https://tatrabanka.sk:8443.evil.com`. Bezpečné?', '[{"id":"a","label":"Áno — vidím tatrabanka.sk","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — všetko pred `:` môže byť subdoména na cudzom serveri","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'hard', 'published', NULL),
  ('db0d5a01-bb36-5c58-8289-a215518bc80b', 'single', 'SMS o blokácii karty.', '[{"id":"a","label":"Odblokujem","correct":false,"severity":"critical"},{"id":"b","label":"Volám na číslo zo zadnej strany karty","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"VUB","body":"Vaša karta bola zablokovaná za podozrivú aktivitu. Odblokujte tu:","link":"https://vub-odblokovanie.sk"}'::jsonb),
  ('3e8d920c-1245-5c60-b81e-a67a0a7d0c92', 'single', 'Telefón ti nepretržite zvoní notifikáciami z Microsoft authenticator (200x). Akcia?', '[{"id":"a","label":"Schválim — nech to skončí","correct":false,"severity":"critical"},{"id":"b","label":"Vypnem notifikácie a zmením heslo Microsoft účtu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('091c41ce-92a9-5d44-b36a-aee49f6f3115', 'single', 'Hra v telefóne ponúka „za 10€ získaj 100€ v hre + 50€ bonusy v skutočných peniazoch".', '[{"id":"a","label":"Skúsim","correct":false,"severity":"medium"},{"id":"b","label":"Ignorujem — hra peniaze do reality nevypláca, je to scam alebo gambling pasca","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'easy', 'published', NULL),
  ('2ef518a4-d93e-5172-908b-b2030d900782', 'single', 'Banka pošle „výpis" v PDF prílohe.', '[{"id":"a","label":"Otvorím a zadám heslo","correct":false,"severity":"critical"},{"id":"b","label":"ČSOB výpisy posiela len v internet bankingu, ignorujem","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"ČSOB","fromEmail":"vypisy@csob-online.eu","subject":"Mesačný výpis č. 04/2024","body":"V prílohe nájdete váš výpis. Heslo: posledné 4 čísla rodného čísla."}'::jsonb),
  ('c1680e23-5259-521a-b11a-995d83c9cad8', 'single', 'Adresa v prehliadači:', '[{"id":"a","label":"Pravý SLSP","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `π` (pi) namiesto `n`","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'hard', 'published', '{"kind":"url","url":"https://www.tatrabaπka.sk/auth"}'::jsonb),
  ('e6121f5d-0c35-5a57-920a-38cff631ddd1', 'single', 'WhatsApp z neznámeho čísla: „Ahoj, ponúkam prácu z domu, 200-500€ denne za lajkovanie videí. Zaujem?"', '[{"id":"a","label":"Zaujíma","correct":false,"severity":"critical"},{"id":"b","label":"Blokujem — task scam","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('99d211fa-63c9-57af-b41c-b94b597f550c', 'single', 'Predávaš na FB Marketplace. Kupec posiela link „Stripe bezpečná platba — potvrdťe IBAN pre prijatie."', '[{"id":"a","label":"Potvrdím IBAN","correct":false,"severity":"critical"},{"id":"b","label":"Stripe nepýta IBAN cez link, navyše Marketplace nemá Stripe","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('f6281bc6-5b23-5669-9847-e880fc185593', 'single', 'Stránka prejde na celú obrazovku, počítač pípa: „Volajte 0800-XXX-XXX, váš PC je infikovaný!“', '[{"id":"a","label":"Volám číslo","correct":false,"severity":"critical"},{"id":"b","label":"Zatváram tab cez Esc / Task Manager","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL),
  ('78342189-823a-5701-a0b2-d9d57ef1fda9', 'single', 'V SMS link, ktorý chce nainštalovať appku `bankovnictvi.apk` (mimo App Store / Google Play). Inštaluješ?', '[{"id":"a","label":"Áno — banka mi to posiela","correct":false,"severity":"critical"},{"id":"b","label":"Nie — appky banky idú len cez Play Store / App Store","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', NULL),
  ('91fea79f-6da0-591b-96e4-78cff269341e', 'single', 'Banka SLSP ti pošle link na internet banking. Vyzerá takto. Otvoríš?', '[{"id":"a","label":"Áno — moja.slsp.sk je oficiálna doména SLSP","correct":true,"severity":null},{"id":"b","label":"Nie — divný subdoménový tvar","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://moja.slsp.sk/login","secure":true}'::jsonb),
  ('19047939-717b-5c2b-8125-02cb7f38e7e0', 'single', 'Aj toto vyzerá ako ČSOB internet banking. Otvoríš?', '[{"id":"a","label":"Áno — `m` je mobilná verzia, doména csob.sk je legit","correct":true,"severity":null},{"id":"b","label":"Nie — `m.` je podozrivé","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://m.csob.sk","secure":true}'::jsonb),
  ('e2427b05-4dd1-5965-beca-b5e5de68f9e1', 'single', 'Tatra banka má B2B portál. URL vyzerá takto.', '[{"id":"a","label":"Legit — `b2b.tatrabanka.sk` je oficiálna firemná zóna","correct":true,"severity":null},{"id":"b","label":"Skoro phishing, neotváram","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://b2b.tatrabanka.sk/login","secure":true}'::jsonb),
  ('3f184c46-e05a-5188-b898-ff7045dcfb19', 'single', 'Poštová banka prešla rebrandom. Kliknutie na 365.bank — risk?', '[{"id":"a","label":"Legit — `.bank` je regulovaný TLD, 365.bank je oficiálne","correct":true,"severity":null},{"id":"b","label":"TLD `.bank` znie ako scam, neklikám","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://365.bank","secure":true}'::jsonb),
  ('7ba8c165-f49b-5e49-9461-1356e87c6c96', 'single', 'VÚB má internet banking. Vidíš túto URL — bezpečné?', '[{"id":"a","label":"Áno — `ib.vub.sk` je oficiálny VÚB internet banking","correct":true,"severity":null},{"id":"b","label":"Krátka URL je podozrivá","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://ib.vub.sk","secure":true}'::jsonb),
  ('176bd86d-ab7d-5cfd-9913-fdc0b3f93b3e', 'single', 'Národná banka Slovenska — pozeráš sa na zoznam regulovaných subjektov.', '[{"id":"a","label":"Legit — nbs.sk je doména NBS","correct":true,"severity":null},{"id":"b","label":"URL je dlhá, vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://www.nbs.sk/sk/dohlad-nad-financnym-trhom/zoznamy","secure":true}'::jsonb),
  ('8c2f0a7c-d4dc-5d57-bfe1-5c65bb680476', 'single', 'George (Erste) bankovníctvo na webe. Real?', '[{"id":"a","label":"Áno — George je oficiálna platforma Erste / SLSP","correct":true,"severity":null},{"id":"b","label":"Anglická doména na slovenskú banku, nedôverujem","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://georgebanking.com","secure":true}'::jsonb),
  ('3b490e46-9157-5a5e-ac90-290e0b010c99', 'single', 'ČSOB pošle e-mail s linkom na podporu. URL je takáto.', '[{"id":"a","label":"Legit — subdoména podpora.csob.sk je oficiálna","correct":true,"severity":null},{"id":"b","label":"Veľa subdomén = podozrivé","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://podpora.csob.sk/kontakt","secure":true}'::jsonb),
  ('fe6cea6e-4354-56f9-a34f-f4926fcda071', 'single', 'Prima banka má krátky brand subdoménový tvar. Si si istý?', '[{"id":"a","label":"Áno — `prima.primabanka.sk` je legitímna","correct":true,"severity":null},{"id":"b","label":"Duplikácia slova `prima` znie ako klon","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://prima.primabanka.sk","secure":true}'::jsonb),
  ('a7778446-8dba-5598-8568-257cf1110d58', 'single', 'ČSOB potvrdenie cez SMS — link s tracking ID. Otvoríš?', '[{"id":"a","label":"Áno — doména csob.sk + HTTPS + sensible path","correct":true,"severity":null},{"id":"b","label":"Náhodne vyzerajúce ID v URL je suspect","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://www.csob.sk/transakcia/0193af-confirm","secure":true}'::jsonb),
  ('863c8d6b-c347-53cc-8f08-d344438bad08', 'single', 'Alza objednávka — link na sledovanie. Real?', '[{"id":"a","label":"Áno — alza.sk + cesta /objednavka/ je legit","correct":true,"severity":null},{"id":"b","label":"Náhodný kód v URL znie ako scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.alza.sk/objednavka/AB12345678","secure":true}'::jsonb),
  ('bf2fcdaa-b324-5422-8658-987ef724f78c', 'single', 'Mobilná verzia Alzy. Bezpečné?', '[{"id":"a","label":"Áno — m. je mobilná subdoména Alzy","correct":true,"severity":null},{"id":"b","label":"`m.` prefix znie phishingovo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://m.alza.sk/akcia","secure":true}'::jsonb),
  ('91cc7a44-d331-50bb-b67c-c007a9d27e09', 'single', 'Heureka link na porovnanie cien.', '[{"id":"a","label":"Legit — heureka.sk je porovnávač cien","correct":true,"severity":null},{"id":"b","label":"Recenzia URL znie spammy","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"url","url":"https://www.heureka.sk/iphone-15-pro/recenzie/","secure":true}'::jsonb),
  ('b0974b8f-c471-595c-ac36-a8e895f177b2', 'single', 'Slovenská pošta — sledovanie balíka cez ich web.', '[{"id":"a","label":"Áno — tandt.posta.sk je oficiálny tracking","correct":true,"severity":null},{"id":"b","label":"`tandt` znie ako náhodný hack","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://tandt.posta.sk/sledovanie/RR123456789SK","secure":true}'::jsonb),
  ('4fd5c4c1-f8ed-563d-bf28-08faa7cb498e', 'single', 'Notino voucher uplatnenie — link z e-mailu.', '[{"id":"a","label":"Legit — notino.sk + cesta voucher/redeem","correct":true,"severity":null},{"id":"b","label":"Voucher kód v URL znie ako pasca","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.notino.sk/voucher/redeem/X9K2-PMNT","secure":true}'::jsonb),
  ('c331bc83-fb2d-52e8-bf12-b5c81a352ed3', 'single', 'Mall.sk pošle linka po reklamácii.', '[{"id":"a","label":"Áno — account. je legit subdoména Mall.sk","correct":true,"severity":null},{"id":"b","label":"Reklamačná URL by mala byť na hlavnej doméne","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://account.mall.sk/reklamacie/12345","secure":true}'::jsonb),
  ('0f6d47b6-670b-5adf-9458-f37f17857247', 'single', 'Dr. Max e-shop pre lekárenský online predaj.', '[{"id":"a","label":"Legit — drmax.sk patrí Dr. Max lekárňam","correct":true,"severity":null},{"id":"b","label":"Krátka doména na zdravotnícku firmu znie suspect","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://eshop.drmax.sk/akcia","secure":true}'::jsonb),
  ('d5fb3bda-1e3b-557d-9cfd-b6b0801c8f06', 'single', 'Zalando po objednávke pošle tracking link.', '[{"id":"a","label":"Áno — zalando.sk je legit, myaccount je user area","correct":true,"severity":null},{"id":"b","label":"Anglické slovo `myaccount` v SK doméne podozrivé","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.zalando.sk/myaccount/orders/123456","secure":true}'::jsonb),
  ('d4955cfb-d34c-50ea-a845-689c76ea7570', 'single', 'Booking.com potvrdenie rezervácie — link.', '[{"id":"a","label":"Legit — secure.booking.com s SK lokalizáciou","correct":true,"severity":null},{"id":"b","label":"`?aid=123` query param znie ako tracking scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://secure.booking.com/myreservations.sk.html?aid=123","secure":true}'::jsonb),
  ('66e0b679-af88-5c17-ba83-1adb6b3095ec', 'single', 'Kvet od Heureka.sk linkuje recenzie produktu.', '[{"id":"a","label":"Legit — Heureka má `obchody.` subdoménu pre overených predajcov","correct":true,"severity":null},{"id":"b","label":"Sub-subdoména je suspect","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"url","url":"https://obchody.heureka.sk/alza-sk/recenzie/","secure":true}'::jsonb),
  ('3369e50f-a2f2-52cf-8c46-819a9038e32f', 'single', 'Slovensko.sk ti pošle notifikáciu o doručenke v elektronickej schránke.', '[{"id":"a","label":"Legit — slovensko.sk je centrálny portál verejnej správy","correct":true,"severity":null},{"id":"b","label":"Štátny web by mal mať .gov.sk doménu","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.slovensko.sk/sk/elektronicka-schranka","secure":true}'::jsonb),
  ('6caed0cb-63e3-5983-93d6-8931d656a272', 'single', 'Finančná správa — portál pre podávanie daňových priznaní.', '[{"id":"a","label":"Legit — podania.financnasprava.sk je oficiálny portál","correct":true,"severity":null},{"id":"b","label":"Doména je dlhá a chýba .gov","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://podania.financnasprava.sk/dorucenia","secure":true}'::jsonb),
  ('e067c53c-1de3-5ef2-a403-5477f1cb05d2', 'single', 'Sociálna poisťovňa — portál.', '[{"id":"a","label":"Legit — socpoist.sk je SP","correct":true,"severity":null},{"id":"b","label":"Skratka domény vyzerá ako klon","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.socpoist.sk/portal","secure":true}'::jsonb),
  ('3e6585ec-6be6-5fbb-82f8-44316adc5796', 'single', 'MV SR — kontrola pokút online.', '[{"id":"a","label":"Legit — minv.sk je Ministerstvo vnútra SR","correct":true,"severity":null},{"id":"b","label":"Query string s pokútami znie ako pasca","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://www.minv.sk/?platby-pokuty","secure":true}'::jsonb),
  ('e314522d-3278-5c3f-b413-c80fbe2f7275', 'single', 'ÚVZ SR — verejné zdravotníctvo, oznam.', '[{"id":"a","label":"Legit — uvzsr.sk patrí Úradu verejného zdravotníctva","correct":true,"severity":null},{"id":"b","label":"Skratka uvzsr je suspect","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.uvzsr.sk/oznamy/2026","secure":true}'::jsonb),
  ('cec3899c-a90a-5304-a6ee-dd623339d115', 'single', 'Justice.gov.sk — elektronické podanie do súdneho registra.', '[{"id":"a","label":"Legit — justice.gov.sk je Ministerstvo spravodlivosti","correct":true,"severity":null},{"id":"b","label":".gov.sk je nezvyčajné, asi scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://www.justice.gov.sk/sluzby/elektronicke-podanie","secure":true}'::jsonb),
  ('bba74625-f3e3-5993-b8f6-e304e4a41e4f', 'single', 'Štatistický úrad SR — register právnických osôb (RPO) lookup.', '[{"id":"a","label":"Legit — statistics.sk je ŠÚ SR, rpo. je register","correct":true,"severity":null},{"id":"b","label":"Anglický `statistics` na slovenský úrad je divné","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://rpo.statistics.sk/rpo","secure":true}'::jsonb),
  ('009397cd-12b2-5525-9756-20be8d9c78e0', 'single', 'Obchodný register Slovenskej republiky.', '[{"id":"a","label":"Legit — orsr.sk je Obchodný register SR","correct":true,"severity":null},{"id":"b","label":"Query stringy s viacero ID je suspect","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://www.orsr.sk/vypis.asp?ID=237161&SID=8&P=1","secure":true}'::jsonb),
  ('684bc731-ab5e-577f-89f2-302e39405506', 'single', 'eKasa — portál pre živnostníkov a registrácie pokladníc.', '[{"id":"a","label":"Legit — `ekasa.` je subdoména financnasprava.sk","correct":true,"severity":null},{"id":"b","label":"Krátky brand-subdoména na štátnom webe podozrivé","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"url","url":"https://ekasa.financnasprava.sk","secure":true}'::jsonb),
  ('16e4eca3-e949-5585-9d0a-0bc500547b72', 'single', 'Datacentrum Mestia Bratislavy — služba občanom.', '[{"id":"a","label":"Legit — .gov.sk je rezervovaná štátna zóna","correct":true,"severity":null},{"id":"b","label":"Slovo `datacentrum` znie ako server scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://datacentrum.gov.sk/sluzby","secure":true}'::jsonb),
  ('e95e81be-9477-5fd8-a8bc-0fcc74a4a6c2', 'single', 'Kamarát ti na Discorde posiela link: „Dostal som zadarmo Discord Nitro, klikni tu a vezmi si aj ty."', '[{"id":"a","label":"Kliknem — Nitro zadarmo je super","correct":false,"severity":"critical"},{"id":"b","label":"Nespustím — kamaráta mohli hacknúť","correct":true,"severity":null},{"id":"c","label":"Kliknem, ale len cez incognito","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'easy', 'published', '{"kind":"sms","sender":"Kamarát (Discord)","body":"yo mas nesto klukni hned a vezmi zadarmo Discord Nitro na mesiac","link":"https://discord-nitro-gift.click/free"}'::jsonb),
  ('74438156-c08e-59fd-9a1a-198ebcb59d83', 'single', 'Stránka ponúka: „1 000 V-Bucks / Robux ZADARMO! Zadaj meno účtu a „overovací kód"."', '[{"id":"a","label":"Vyskúšam — načo by to bolo fake","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — generátor hernej meny neexistuje","correct":true,"severity":null},{"id":"c","label":"Vyskúšam, ale dám falošné meno","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'easy', 'published', NULL),
  ('d2130da0-20f7-550c-8e60-7dc1a8ebd098', 'single', 'Škola ti vraj posiela link na obnovu hesla do Teams.', '[{"id":"a","label":"Kliknem — nechcem prísť o prístup","correct":false,"severity":"critical"},{"id":"b","label":"Prihlásim sa ručne cez office.com a overím u správcu siete","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"IT Podpora Škola","fromEmail":"it-support@skola-portal-update.com","subject":"Povinná obnova prístupu do Microsoft Teams — do 24 hodín","body":"Platnosť vášho školského konta vyprší zajtra. Kliknite a aktualizujte heslo, inak stratíte prístup.","cta":"Aktualizovať heslo"}'::jsonb),
  ('c707b0fe-ec76-5d64-b2c4-419a4f90cbf3', 'single', 'SMS: „Boli ste vybraní na odmenu 500€ od TikToku. Pre aktiváciu sa prihláste."', '[{"id":"a","label":"Prihlásim sa — 500€ je 500€","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — TikTok takto nič nerozdeľuje","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"TikTok Promo SK","body":"Gratulujeme! Ste jeden z 100 vybraných. Aktivujte odmenu 500€ tu:","link":"https://tiktok-reward-sk.live/login"}'::jsonb),
  ('67bcbefb-a353-5b93-b5f0-1217f64d7a6a', 'single', 'Inzerát na Instagrame: „Pracuj z domu od 15 rokov, 20€/hod, stačí zdieľať príspevky. Registrácia 15€."', '[{"id":"a","label":"Registrujem sa — 20€/hod je super","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — práca, kde ty platíš vopred, nie je práca","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('48460164-ebdc-5818-9eb5-38599577ac39', 'single', 'V školskej chodbe visí QR kód: „Nová app — objednaj obed rýchlejšie." Po naskenovaní stránka žiada školský email a heslo. Zadáš?', '[{"id":"a","label":"Zadám — chcem rýchle objednanie","correct":false,"severity":"critical"},{"id":"b","label":"Nechám to — overím najprv u poverеného správcu IT školy","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('d9c622d6-32b3-581b-a6d9-c9f0c0031516', 'single', 'Kamarát ti pošle link: „Mám aktivovaný Spotify Premium zadarmo, použi aj ty — zadaj tu email a heslo."', '[{"id":"a","label":"Zadám — Spotify Premium zadarmo","correct":false,"severity":"critical"},{"id":"b","label":"Neprihlásim sa cez cudzí link","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'honeypot', 'easy', 'published', NULL),
  ('b0b98a60-6572-5e77-9028-ba813e596411', 'single', '"Ahoj babka/starko, som to ja, Dominik. Mal som nehodu, som v nemocnici a potrebujem 2 000€ hneď. Nehovor to mame." Hlas znie povedomо.', '[{"id":"a","label":"Pošlem — je to vnuk","correct":false,"severity":"critical"},{"id":"b","label":"Pošlem polovicu — pre istotu","correct":false,"severity":"critical"},{"id":"c","label":"Zavesím a zavolám priamo vnukovi na jeho číslo","correct":true,"severity":null}]'::jsonb, '[2]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('d7ce9c72-4d89-568c-909b-1751d05141a5', 'single', 'Niekto zazvoní a povie: „Dobré ráno, som z banky — kontrolujeme vklady v oblasti. Môžem vidieť vašu vkladnú knižku alebo kartu?"', '[{"id":"a","label":"Ukážem — ide z banky","correct":false,"severity":"critical"},{"id":"b","label":"Nepustím dnu — banka nikdy nechodí po domácnostiach bez predošlej objednávky","correct":true,"severity":null},{"id":"c","label":"Nechám ho čakať a zavolám banke na číslo, čo mi dal","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('c36012bd-cc9c-5d52-93f0-47a4242091de', 'single', 'List v schránke: „Sociálna poisťovňa SR: máte nárok na príplatok k dôchodku 128 €/mes. Zavolajte pre aktiváciu na 0900 XXX XXX."', '[{"id":"a","label":"Zavolám — chcem príplatok","correct":false,"severity":"critical"},{"id":"b","label":"Overím priamo na pobočke Sociálnej poisťovne, nie na čísle z listu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('09c1eaaa-be17-59b2-aa30-149f2be8bc0f', 'single', 'Zavolá ti syn/dcéra, spoznáš jeho/jej hlas: „Mama, zadržali ma colníci na hranici, potrebujem 1 800€ v Bitcoine hneď." Hlas znie 100% ako on/ona.', '[{"id":"a","label":"Idem k Bitcoinu — spoznávam hlas","correct":false,"severity":"critical"},{"id":"b","label":"Zavesím a zavolám dieťaťu priamo na jeho číslo","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('753bd60f-cf99-578b-ba0f-28a6d7587af8', 'single', 'Telefonista: „Zbierame na onkologicky choré deti, pošlite teraz 20€ — prečítajte mi číslo karty a CVV."', '[{"id":"a","label":"Prečítam — chcem pomôcť","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem a darujem online cez overenú nadáciu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL),
  ('a7229636-2611-53fd-862a-7c722c1ecae6', 'single', 'Inzerát: izba v Bratislave, 290€/mes, zariadená, pri metre. Prenajímateľ: „Pošlite zálohu 580€, kľúče pošlem poštou — sám som momentálne v zahraničí."', '[{"id":"a","label":"Pošlem zálohu — cena je super","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — záloha pred osobnou prehliadkou = scam","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('e9ae9fff-1c18-51b8-9ec6-ec7dfd615ed0', 'single', 'Email: „UK Bratislava — váš prístup do AIS2 bude zablokovaný o 24 hodín."', '[{"id":"a","label":"Kliknem — nechcem prísť o zápis predmetov","correct":false,"severity":"critical"},{"id":"b","label":"Prihlásim sa priamo na ais2.uniba.sk — nie cez link z emailu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"IT UK Bratislava","fromEmail":"it-support@uniba-portal-update.eu","subject":"Povinná aktualizácia AIS2 — zablokujeme prístup k zápisom","body":"Platnosť vášho prístupu vyprší. Kliknite a aktualizujte údaje do 24 hodín.","cta":"Aktualizovať AIS2"}'::jsonb),
  ('d2c95a2d-9d8a-510e-b5b3-a7f7bc5efb52', 'single', 'Email: „Erasmus+ Slovensko: boli ste vybraní na štipendium 4 500€. Pre aktiváciu pošlite overovací poplatok 80€."', '[{"id":"a","label":"Pošlem 80€ — 4 500€ za to stojí","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — Erasmus+ nikdy nepýta poplatok vopred","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', NULL),
  ('63935c7d-4b0c-5918-bb07-a8c4774ce4fc', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — bežná notifikácia o pripravenej zásielke","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"PostaSK","body":"Vasa zasielka EE123456789SK je pripravena na vyzdvihnutie na poste Bratislava-Petrzalka do 7 dni."}'::jsonb),
  ('5049fa99-75d0-5d61-bebc-e1557d750863', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — kód použijem pri boxe","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"BalikoBOX","body":"Vyzdvihovaci kod: 482913. Platnost 48 hodin. Lokacia: BalikoBOX OC Aupark."}'::jsonb),
  ('a6fc816f-aaf5-5ade-bf7b-c7123ef6ac79', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — počkám na doručovateľa","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"Slovenska posta","body":"Doruceny doporuceny list, prevzatie potvrdte podpisom u doruchovatela. ID listu: RR0091238SK."}'::jsonb),
  ('32e8ed3c-bbf3-5262-929a-c788652c0ed0', 'single', 'Klikol by si na link v tejto SMS?', '[{"id":"a","label":"Áno — `tandt.posta.sk` je oficiálna subdoména pošty","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"PostaSK","body":"Sledovanie zasielky CC918273645SK:","link":"https://tandt.posta.sk/?id=CC918273645SK"}'::jsonb),
  ('1320bfe3-94ab-54e6-859f-b82fbcdbb5cd', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — len potvrdenie o doručení, beriem na vedomie","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"Posta","body":"Zasielka EH4438122SK bola dorucena dna 28.04.2026 o 14:32, prevzala adresat."}'::jsonb),
  ('9b981ed2-4397-5f58-920c-8b602827d098', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — pôjdem na poštu si prevziať","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"PostaSK","body":"Vasa zasielka cak na poste do 02.05.2026. Po tomto datume bude vratena odosielatelovi."}'::jsonb),
  ('9f9f5461-540d-51f1-b877-0be69620b3d5', 'single', 'Klikol by si na link v tejto SMS?', '[{"id":"a","label":"Áno — `eshop.posta.sk` je oficiálna doména pre platby pošty","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"sms","sender":"PostaSK","body":"Doplatok za zasielku zo zahranicia: 1,80 EUR. Detail a platba:","link":"https://eshop.posta.sk/colne-doplatky/EE883"}'::jsonb),
  ('c1f427e6-e929-5be5-8496-786e032da6c1', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — zavolám zo svojho telefónu na číslo z webu pošty","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"Posta","body":"Vyzdvihnutie zasielky moznost predlzit. Volajte 0850 122 413."}'::jsonb),
  ('1a6cc616-eb24-54a4-a2ae-807338cef4e9', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — kód zadám len v aplikácii / na webe csob.sk, ktoré som otvoril sám","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"CSOB","body":"Overovaci kod: 472918. Nezdielajte ho s nikym, ani s pracovnikom banky."}'::jsonb),
  ('f62b78cb-90cd-5ef2-ab4c-c34358c6cc6d', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — len notifikácia o mojej vlastnej platbe","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"Tatra banka","body":"Platba 25,40 EUR v TESCO BRATISLAVA bola autorizovana z karty *4821 dna 28.04 o 17:14."}'::jsonb),
  ('eb19cafa-6dd4-52fb-a7cd-db8c9d413e16', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — práve som platil na Amazone, kód zadám","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"VUB","body":"3D Secure kod: 882134. Pre potvrdenie platby AMAZON 47,90 EUR. Platnost 5 min."}'::jsonb),
  ('a591a585-6fe9-58ef-a6cc-031e29343ac2', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — moja výplata, len beriem na vedomie","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"SLSP","body":"Vyplata mzdy 1234,56 EUR pripisana na ucet *7821 dna 28.04.2026."}'::jsonb),
  ('7644c1c4-d285-5ab1-8ea3-593fc943b98b', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — práve som v appke pridával príjemcu, kód zadám","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"mBank","body":"Pridanie noveho prijemcu Jan Novak SK12 1100 0000 0029 1234 5678 v aplikacii mBank. Kod: 661482."}'::jsonb),
  ('97392731-70b2-528c-af03-d76b3b67c338', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — práve som vyberal, len potvrdenie","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"FioBanka","body":"Vyber 100 EUR z bankomatu BRATISLAVA SLOVNAFT z karty *3344 dna 28.04 o 18:42."}'::jsonb),
  ('4a9269ed-ea97-5599-b6e4-914b57391f2d', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — len informácia o spracovaní môjho priznania","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"FinSprava","body":"Vase danove priznanie typ B za rok 2025 bolo spracovane. Preplatok 87,40 EUR bude pripisany na ucet do 30 dni."}'::jsonb),
  ('ae91d5ae-b6b6-52ff-8e55-361ee71f31a4', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — prihlásim sa cez eID na slovensko.sk ručne","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"sms","sender":"slovensko.sk","body":"V eDesk schranke mate nove podanie. Pre zobrazenie sa prihlaste cez eID na slovensko.sk."}'::jsonb),
  ('4bd3d488-7bab-5f3c-907f-4cd39f3f7203', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — moje nemocenské, len potvrdenie","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"SocPoist","body":"Nemocenske za obdobie 14.04-25.04.2026 vo vyske 312,80 EUR vyplatene dna 28.04.2026."}'::jsonb),
  ('a610af3b-0745-538b-ba8a-e4f59b8412ee', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — môj lekár, otvorím eZdravie ručne","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"ePN","body":"Lekar Vam dnes vystavil ePN c. 2026/04/8821, platnost od 28.04.2026. Detaily v aplikacii eZdravie."}'::jsonb),
  ('b0003b2a-17fd-52ac-bedc-f4dd415abbcf', 'single', 'Klikol by si na link v tejto SMS?', '[{"id":"a","label":"Áno — `tandt.posta.sk` je legit subdoména, kód si overím","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"sms","sender":"Posta","body":"Vasa zasielka prosla colnou kontrolou. Sledovanie:","link":"https://tandt.posta.sk/?id=RA8821736SK"}'::jsonb),
  ('1021aee2-181a-5b32-8ef2-cb294d1187c7', 'single', 'Klikol by si na link v tejto SMS?', '[{"id":"a","label":"Áno — `csob.sk` je legit, ihneď riešim","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"sms","sender":"CSOB","body":"Detegovane neobvykle prihlasenie z noveho zariadenia (Praha, CZ). Ak ste to neboli vy:","link":"https://www.csob.sk/security/zablokuj-pristup"}'::jsonb),
  ('1baba37f-bc46-5c68-89f4-52dde89bed93', 'single', 'Email od „lekára". Reakcia?', '[{"id":"a","label":"Vyplním — nechcem prísť o ePZP","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — ordinácie nikdy takto nepotvrdzujú údaje cez Gmail","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"MUDr. Jana Krátka","fromEmail":"ordinacia.kratka@gmail-clinic.com","subject":"Vaša ePZP karta vyžaduje potvrdenie údajov","body":"Dobrý deň. Vaša elektronická preukaz poistenca (ePZP) bude deaktivovaná do 48h, ak nepotvrdíte údaje. Kliknite a vyplňte rodné číslo a zdravotnú poisťovňu.","cta":"Potvrdiť údaje"}'::jsonb),
  ('beeb425b-e5c4-5278-8cca-6e4b84d40ff9', 'single', 'Email pre nemocničného pracovníka. Akcia?', '[{"id":"a","label":"Spustím — IT sa neozvalo, ja to vyriešim","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — Microsoft posiela patch cez WSUS, nie cez email a .org doménu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Updates Microsoft","fromEmail":"security-updates@windows-patch-2026.org","subject":"Kritická bezpečnostná aktualizácia — nemocničné systémy","body":"Pre podporu izolovaných nemocničných sietí pribudla nutná bezpečnostná aktualizácia. Stiahnite a spustite priložený inštalátor s admin právami.","cta":"Stiahnuť patch.exe"}'::jsonb),
  ('c8339e43-9d4e-5d83-8574-b236ebc2e59e', 'single', 'Pacient pýta od sestry „prezri si môj recept".', '[{"id":"a","label":"Pošlem SMS s číslom receptu — pomáham seniorovi","correct":false,"severity":"medium"},{"id":"b","label":"Odmietnem — eRecepty sa neposielajú SMS, lekáreň ich vyhľadá podľa rodného čísla","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', '{"kind":"text","label":"Telefonát na recepciu","body":"Pán Halmaďan: „Dobrý deň, môj otec dnes nemôže prísť. Pošlite mi prosím SMS s receptom na inzulín, ja mu ho vyzdvihnem v lekárni.\""}'::jsonb),
  ('2044a48f-9b1b-5b88-9ee0-53bf07b8c35d', 'single', 'Email pre dispečera prepravnej firmy. Akcia?', '[{"id":"a","label":"Pošlem CMR a SPZ — cena je dobrá, urgent","correct":false,"severity":"critical"},{"id":"b","label":"Overujem cez TimoCom / volanie do firmy z webu — žiadne potvrdzovanie cez .online doménu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Logistics Partner DE","fromEmail":"dispo@logisticspartner-de.online","subject":"Nová zákazka 24t Frankfurt → Bratislava — urgentný re-dispatch","body":"Pôvodný dopravca odpadol. Cena 2200 EUR (250 nad trh). Potrebujeme CMR a SPZ vozidla na potvrdenie do 1 hodiny — odpoveď na túto adresu.","cta":"Odpovedať s CMR + SPZ"}'::jsonb),
  ('47499fde-302d-5d0c-b9b5-88e44b7000dc', 'single', 'PDF priložené k mailu od „nového dopravcu". Akcia?', '[{"id":"a","label":"Zaplatím zálohu — máme CMR, je to v poriadku","correct":false,"severity":"critical"},{"id":"b","label":"Overujem firmu cez SK obchodný register a TimoCom — `.icu` doména a SI IBAN sú red flag","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'fake_vs_real', 'medium', 'published', '{"kind":"email","from":"Marek B., dispatcher","fromEmail":"dispatch@trans-express-eu.icu","subject":"Potvrdený CMR — vozidlo SPZ BL-129XY","body":"V prílohe podpísaný CMR a list o sprostredkovaní. Prosím o úhradu zálohy 30 % na účet IBAN SI56 ... pred naložením.","cta":"Otvoriť CMR.pdf"}'::jsonb),
  ('bf04208f-7914-52a7-9a7f-b930cf0b6154', 'single', 'Si majiteľ e-shopu. Príde objednávka cez e-mail (nie cez admin panel). Reakcia?', '[{"id":"a","label":"Pošlem faktúru a IBAN — veľká objednávka, šéf bude rád","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — objednávky idú cez e-shop, žiadnu B2B robím cez ORSR-overený subjekt","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Roman Kováč","fromEmail":"roman.kovac.firma@outlook.com","subject":"Hromadná objednávka — 25× notebook ASUS, súrne","body":"Dobrý deň, sme firma z DE, potrebujeme 25 ks notebookov ASUS na zajtra. Súrne, klient čaká. Pošlite faktúru a údaje na úhradu. PO bude poslané neskôr.","cta":"Odpovedať s IBAN"}'::jsonb),
  ('ee11bb97-f0a6-5076-a0c3-07cc2bd6a690', 'single', 'Customer-care e-mail v admin paneli e-shopu. Akcia?', '[{"id":"a","label":"Pošlem refund na nový IBAN — zákazník má nárok","correct":false,"severity":"critical"},{"id":"b","label":"Refund len na pôvodný IBAN použitý pri platbe; požiadam o doloženie zo skladu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Anna Novakova","fromEmail":"anna.novak1991@gmail.com","subject":"Reklamácia objednávky #45821 — chýbajúce položky","body":"Dobrý deň, v zásielke chýbajú 2 položky (mobilný kryt + kábel). Mám fotku. Prosím refund 47,80 EUR na nový IBAN SK00 0900 ... — pôvodný účet je zablokovaný. Faktúru pošlite e-mailom.","cta":"Vrátiť peniaze"}'::jsonb),
  ('254ca883-432c-55e5-9db9-276c65f3add6', 'single', 'E-mail od dodávateľa s aktualizovanou faktúrou. Reakcia?', '[{"id":"a","label":"Zmením IBAN v účtovnom systéme a zaplatím","correct":false,"severity":"critical"},{"id":"b","label":"Zavolám dodávateľa na číslo z webu a osobne overím zmenu IBAN","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"Účtovníctvo — Logistika SK","fromEmail":"uctovnictvo@logistika-sk.com","subject":"Aktualizovaná faktúra č. 2026/0428 — zmena bankového účtu","body":"Dobrý deň, prikladám aktualizovanú faktúru. Prosíme o úhradu na NOVÝ IBAN: SK56 1100 ... (pôvodný účet bol zrušený kvôli reorganizácii). Splatnosť zostáva 5 dní.","cta":"Otvoriť faktúru.pdf"}'::jsonb),
  ('cafdc340-b861-59d0-92c4-6495208beb9b', 'single', 'E-mail od „Shoptetu“ administrátorovi e-shopu. Akcia?', '[{"id":"a","label":"Prihlásim sa cez link — nechcem prísť o e-shop","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem link; otvorím Shoptet ručne cez záložku a skontrolujem aktívne prihlásenia","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Shoptet Security","fromEmail":"security@shoptet-admin-sk.com","subject":"Detegované neoprávnené prihlásenie — overte konto do 24h","body":"Dobrý deň, váš admin účet bude pozastavený do 24h kvôli podozrivému prihláseniu. Pre obnovu sa prihláste tu a potvrďte 2FA.","cta":"Overiť konto"}'::jsonb),
  ('1e4c95ef-50fd-5544-8308-7bfdb6dd1764', 'single', 'Reštaurácia dostane email s veľkou skupinovou rezerváciou. Otvoríš prílohu?', '[{"id":"a","label":"Otvorím prílohu — chcem si pozrieť požiadavky","correct":false,"severity":"critical"},{"id":"b","label":"Odpíšem s prosbou o telefonický kontakt; prílohu neotvorím bez overenia","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Eventes Bratislava","fromEmail":"events@eventes-bratislava.online","subject":"Rezervácia 50 osôb — firemná oslava 15.05.2026","body":"Dobrý deň, chceme rezervovať celú reštauráciu pre 50 osôb. V prílohe menu_preferences.docx s našimi požiadavkami a kontakt na koordinátora.","cta":"Otvoriť menu_preferences.docx"}'::jsonb),
  ('69e9ed0f-3e42-59d9-bec0-7a4330ffca12', 'single', 'Volanie pre prevádzkara reštaurácie. Reakcia?', '[{"id":"a","label":"Diktovám ID a PIN — bez POS nemôžem fungovať","correct":false,"severity":"critical"},{"id":"b","label":"Položím a zavolám Verifone na číslo z faktúry / web stránky výrobcu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"call","caller":"„Technik Verifone“","number":"neznáme číslo","hint":"Tvrdí, že je nutná diaľková aktualizácia POS terminálu — potrebuje ID terminálu a PIN správcu, inak prestane fungovať."}'::jsonb),
  ('48766657-4d9f-501f-8f25-ac4da528a3d6', 'single', 'Nový dodávateľ čerstvých produktov pre kuchyňu pošle e-mail. Reakcia?', '[{"id":"a","label":"Pošlem IČO/DIČ a objednám — výhodná cena","correct":false,"severity":"critical"},{"id":"b","label":"Overím farmu cez ORSR + štátny veterinárny register pred akoukoľvek komunikáciou","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Bio Farma Záhorie","fromEmail":"objednavky@biofarma-zahorie.shop","subject":"Špeciálna ponuka — bio mäso o 30 % lacnejšie","body":"Dobrý deň, sme nová bio farma so Záhoria. Ponúkame mäso o 30 % lacnejšie ako konkurencia. Stačí poslať objednávku a IČO/DIČ na predfaktúru — tovar dovezieme do 48h.","cta":"Objednať"}'::jsonb),
  ('517fb81a-3e7a-5477-93bf-d31dc47738e0', 'single', 'Email pre autoservis od „klienta“. Reakcia?', '[{"id":"a","label":"Pošlem históriu — kupujúci má právo vedieť","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — záznamy posielam len overenému majiteľovi (občiansky + technický preukaz)","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"email","from":"Peter — kupujúci","fromEmail":"kupujem.skoda@protonmail.com","subject":"Žiadosť o overenie histórie servisu — VIN TMBJG7NE5L0123456","body":"Dobrý deň, kupujem ojazdené auto a chcel by som overiť, či bolo servisované u vás. Pošlite prosím všetky záznamy o servise + meno predávajúceho a jeho telefón."}'::jsonb),
  ('a4f9e3c4-cc27-525c-be40-5b27ff4caa5a', 'single', 'Pneuservisu napíše neznáme číslo na WhatsApp.', '[{"id":"a","label":"Pošlem IBAN — predfaktúra je v pohode","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem WhatsApp objednávky; len osobne, alebo cez náš e-shop s 3DS platbou","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'easy', 'published', '{"kind":"sms","sender":"+44 7700 900882","body":"Dobry den, potrebujem 4 ks letnych pneu Continental 205/55 R16 na zajtra. Plat predfakturou. Postlite IBAN."}'::jsonb),
  ('3ec7ff1b-127e-57d1-afae-c1803a5c9805', 'single', 'Volanie autoservisu týždeň po veľkej oprave. Reakcia?', '[{"id":"a","label":"Pošlem 2 800 EUR — nechcem mať problém","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — všetky reklamácie cez poistku a písomne, žiadne priame platby tretej strane","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', '{"kind":"call","caller":"„Klient — pán Horváth“","number":"neznáme číslo","hint":"Tvrdí, že po vašej oprave brzdí motorom narazil do iného auta. Druhý vodič žiada 2 800 EUR. „Klient“ chce, aby ste poslali peniaze priamo druhému vodičovi cez IBAN, vyhne sa tým súdu."}'::jsonb),
  ('fe5e6d7d-379f-5b7f-b6f8-9d2f84661736', 'single', 'GitHub-bot e-mail vývojárovi. Reakcia?', '[{"id":"a","label":"Prihlásim sa cez link — pekná dôvera v kolegu","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem; otvorím npmjs.com ručne cez záložku a skontrolujem invitations","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"email","from":"npm support","fromEmail":"support@npmjs-helpdesk.com","subject":"You''ve been added as maintainer to package `react-utils-pro`","body":"Hi, user `m4int4iner` has added you as a maintainer to react-utils-pro (12k weekly downloads). To accept and publish your first release, sign in here with your npm token.","cta":"Accept maintainer role"}'::jsonb),
  ('ddd3cb73-b3d7-55f7-8c34-71c7eb928ea3', 'single', 'GitHub OAuth consent obrazovka. Schváliš?', '[{"id":"a","label":"Schválim — je to github.com a chcem to skúsiť","correct":false,"severity":"critical"},{"id":"b","label":"Odmietnem — `delete_repo` + `workflow` scope na neznámu app je no-go","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'hard', 'published', '{"kind":"url","url":"https://github.com/login/oauth/authorize?client_id=8a3d&scope=repo,workflow,delete_repo","secure":true}'::jsonb),
  ('2b7152be-9719-5320-adea-b8cae89fe0ec', 'single', 'LinkedIn DM od recruitera. Klikneš na repo s test assignmentom?', '[{"id":"a","label":"Klonujem a spustím — chcem prácu","correct":false,"severity":"critical"},{"id":"b","label":"Najprv overím profil recruitera + spoločnosť cez LinkedIn s 2nd-degree connections; repo NEspúšťam bez sandboxu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'phishing', 'medium', 'published', '{"kind":"text","label":"LinkedIn DM","body":"Hi! We have a Senior Backend role at a US fintech ($120k–$160k remote). First round is a 90-min coding assignment — clone this repo and run `npm install && npm start`, then submit a PR. Repo: github.com/jobs-backend-tasks/payment-api-v2"}'::jsonb),
  ('330064e6-53e2-51f3-a9dd-b034c84678bf', 'single', 'Email od banky, naozaj urgentný tón. Reakcia?', '[{"id":"a","label":"Legit — `tatrabanka.sk` je oficiálna doména, postup vedie do appky","correct":true,"severity":null},{"id":"b","label":"Phishing — banka nikdy neposiela urgentné maily","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"email","from":"Tatra banka — bezpečnosť","fromEmail":"bezpecnost@tatrabanka.sk","subject":"Nezvyčajné prihlásenie z nového zariadenia (Linz, AT)","body":"Dnes o 03:14 sa niekto pokúsil prihlásiť na váš účet z nového zariadenia v Linzi. Ak to nebol(a) ste vy, prihláste sa do Internet bankingu a v sekcii „Aktívne zariadenia\" zariadenie odhláste. Heslo zmeňte cez aplikáciu Tatra banka."}'::jsonb),
  ('0424f276-54cc-5853-b437-8e52cb4d7d96', 'single', 'Email po pokuse o prihlásenie. Klikneš?', '[{"id":"a","label":"Legit — vlastnoručne som sa prihlasoval z nového notebooku","correct":true,"severity":null},{"id":"b","label":"Phishing — `verify` linky sú vždy podozrivé","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"email","from":"GitHub","fromEmail":"noreply@github.com","subject":"[GitHub] Please verify your device","body":"We''ve detected a sign-in to your account from a new device. To continue, click the verification link below. If this wasn''t you, change your password.","cta":"Verify device"}'::jsonb),
  ('466aace9-0258-5c6a-937c-ac4b40fca5aa', 'single', 'Email od kuriéra so suspect tónom. Reakcia?', '[{"id":"a","label":"Legit — `dhl.com` a `mydhl.express.dhl` sú oficiálne, otvorím ručne","correct":true,"severity":null},{"id":"b","label":"Phishing — push na termín = scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"email","from":"DHL Express","fromEmail":"noreply@dhl.com","subject":"Doručenie sa nepodarilo — zásielka bude vrátená","body":"Pri doručovaní vašej zásielky 7891234567 sa nepodarilo zastihnúť adresáta. Bez akcie do 5 dní sa zásielka vráti odosielateľovi. Pre prebookovanie navštívte mydhl.express.dhl."}'::jsonb),
  ('0e9f6b47-bfd9-513e-b275-21619980ca0a', 'single', 'Email od Stripe podnikateľovi. Reakcia?', '[{"id":"a","label":"Legit — Stripe takto upozorňuje, otvorím dashboard.stripe.com ručne","correct":true,"severity":null},{"id":"b","label":"Phishing — kto by od podnikateľa pýtal IBAN","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"email","from":"Stripe","fromEmail":"no-reply@stripe.com","subject":"Akcia potrebná: aktualizácia bankového účtu pre payouts","body":"Aby sme mohli pokračovať vo výplatách, musíme overiť aktuálny IBAN. Prihláste sa na dashboard.stripe.com a v Settings → Payouts overte / aktualizujte bankový účet."}'::jsonb),
  ('ad44e56f-cd9c-54c6-b779-7eef7fca2ff5', 'single', 'Email od Microsoftu IT-správcovi. Reakcia?', '[{"id":"a","label":"Legit — `microsoft.com` doména, smeruje na `portal.azure.com` ručne","correct":true,"severity":null},{"id":"b","label":"Phishing — vážne MS by neposielal také urgentné maily","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"email","from":"Microsoft Azure","fromEmail":"azure-noreply@microsoft.com","subject":"Action required: subscription will be disabled in 3 days","body":"Your Azure subscription has reached the spending limit. Without billing review, services will be paused on 2026-05-01. Manage in Azure portal (portal.azure.com)."}'::jsonb),
  ('2a30efa2-6f92-577c-987e-528fc918c187', 'single', 'Email z Finančnej správy. Reakcia?', '[{"id":"a","label":"Legit — doména `financnasprava.sk`, smeruje na PFS ručné prihlásenie","correct":true,"severity":null},{"id":"b","label":"Phishing — neprihlásim sa nikam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"email","from":"Finančná správa SR","fromEmail":"noreply@financnasprava.sk","subject":"Doručené potvrdenie podania na portáli FS","body":"Vaše elektronické podanie typu DPH bolo prijaté dňa 28.04.2026, identifikátor PDF-2026-091823. Detail v Osobnej internetovej zóne na pfs.financnasprava.sk po prihlásení."}'::jsonb),
  ('cdca6f4e-97dc-5825-bf13-cb2e3073527c', 'single', 'Email od e-shopu. Reakcia?', '[{"id":"a","label":"Legit — moja objednávka, skopírujem si tracking číslo","correct":true,"severity":null},{"id":"b","label":"Phishing — neklikám na nič v emailoch","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"email","from":"Alza.sk","fromEmail":"obchod@alza.sk","subject":"Vaša objednávka 8821547 bola odoslaná","body":"Balík odoslal kuriér Packeta, sledovacie číslo Z9981234. Sledovanie cez packeta.sk po zadaní čísla. Detail objednávky v účte na alza.sk."}'::jsonb),
  ('36c1b946-70e3-5c1d-9831-aa3179920279', 'single', 'Email od IT v korporácii. Reakcia?', '[{"id":"a","label":"Legit — vnútorná IT komunikácia, doména firmy","correct":true,"severity":null},{"id":"b","label":"Phishing — IT mi nikdy nepíše","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"email","from":"IT Helpdesk","fromEmail":"helpdesk@firma.sk","subject":"Naplánovaná údržba VPN — restart connection","body":"Dnes 22:00–23:00 prebehne reštart VPN concentratorov. Po reštarte budete musieť znovu pripojiť VPN klienta. Žiadne prihlasovacie údaje sa nemenia."}'::jsonb),
  ('028e8720-8dc2-5bd4-8b8e-b91106903206', 'single', 'Email od recruitera na LinkedIn. Reakcia?', '[{"id":"a","label":"Legit — `profesia.sk` doména, žiadny urgent push","correct":true,"severity":null},{"id":"b","label":"Phishing — recruiteri sú scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"email","from":"Anna Tomeková (Profesia)","fromEmail":"anna.tomekova@profesia.sk","subject":"Pozícia Senior Backend Developer — záujem o rozhovor?","body":"Dobrý deň. Hľadáme seniora pre nášho klienta (banka, BA). Plat 4200–5500 EUR. Ak má zmysel, pošlem detail a CV pošlite mi prosím cez profesia.sk profil."}'::jsonb),
  ('de056883-e882-5f44-bced-fa2038dd064a', 'single', 'Email od Googlu. Reakcia?', '[{"id":"a","label":"Legit — moje vlastné prihlásenie z iPhonu","correct":true,"severity":null},{"id":"b","label":"Phishing — zabezpečenie cez link je scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"email","from":"Google","fromEmail":"no-reply@accounts.google.com","subject":"Nové prihlásenie na vaše Google konto","body":"Práve sa niekto prihlásil na vaše Google konto z nového zariadenia (iPhone, Bratislava). Ak ste to boli vy, ignorujte. Ak nie, zabezpečte konto na myaccount.google.com."}'::jsonb),
  ('1bf373f0-e74e-56ca-8432-92bc7c72628d', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — moja žiadosť, ja som im dal číslo. Overím cez minv.sk callback","correct":true,"severity":null},{"id":"b","label":"Vishing — polícia takto netelefonuje","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"call","caller":"PZ SR — Bratislava","number":"0961 100 200","hint":"Predstavujú sa: por. Krátka, OO PZ Bratislava-Staré Mesto. Pýtajú sa ohľadom mojej včerajšej žiadosti o nový OP."}'::jsonb),
  ('338e02a3-0c07-57c9-bec3-40531112ab9c', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — fraud team reálne tieto veci rieši, ale moje údaje nedávam, zavolám späť cez 0800 zo zadnej strany karty","correct":true,"severity":null},{"id":"b","label":"Vishing — banka nikdy nevolá","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"call","caller":"Tatra banka — fraud team","number":"+421 2 5919 1000","hint":"Pýtajú sa, či som naozaj zaplatil 1230 EUR cez kartu na Aliexpress dnes ráno. Tvrdí, že to vyzerá ako fraud."}'::jsonb),
  ('4949aac9-3da2-55c7-ae5d-ed2024e885e0', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — ambulancia, ja zavolám späť na pevnú linku, ktorú si overím","correct":true,"severity":null},{"id":"b","label":"Vishing — nikomu zo seba neodpovedám","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"call","caller":"Sestra ambulancie","number":"0905 ... (mobilný)","hint":"„Volám z ambulancie MUDr. Halmádyho. Doktor sa chce ozvať ohľadom vašich výsledkov, prosím, zavolajte mu späť na pevnú linku 02/...\""}'::jsonb),
  ('eec07cbc-4ceb-527e-930c-389911ccec8a', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — DÚ takto reálne pýta dôkazy, ale ja zavolám späť cez ústredné číslo","correct":true,"severity":null},{"id":"b","label":"Vishing — FS nikdy netelefonuje","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"call","caller":"Daňový úrad Bratislava","number":"+421 2 4827 1810","hint":"Inšpektorka pýta upresnenie pri mojom DPH priznaní (chýba potvrdenie zo zahraničia)."}'::jsonb),
  ('67922472-8ac7-5209-b1e5-a02a8ab0ca4e', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — kuriér naozaj často volá z mobilu, žiadne údaje nepýta","correct":true,"severity":null},{"id":"b","label":"Vishing — kuriéri sú scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"call","caller":"Kuriér DPD","number":"0905 ... (mobilný)","hint":"„Som pred bytom, neviem nájsť zvonček. Volám z mobilu, aby som vás zastihol.\""}'::jsonb),
  ('acf525a1-dcfb-5bd5-be06-a2cf4bbbdcf6', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — SP takto reálne pracuje, ja zavolám späť cez socpoist.sk callback","correct":true,"severity":null},{"id":"b","label":"Vishing — SP mi nemá čo volať","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"call","caller":"Sociálna poisťovňa — pobočka","number":"+421 2 ... (pevná)","hint":"Žiadajú dovysvetliť údaj v mojom oznámení o zmene zamestnávateľa."}'::jsonb),
  ('9e9cb7a4-d813-5280-b142-dd3d5f010b57', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — moja firma, doménu portálu si overím cez intranet","correct":true,"severity":null},{"id":"b","label":"Vishing — HR nikomu nedôverujem","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"call","caller":"HR — moja firma","number":"+421 2 ... (firemné ústredie)","hint":"HR pýta podpísať novú dohodu a posiela link na dokumenty cez interný portál."}'::jsonb),
  ('6920e712-e7b2-510a-9049-34ff907f6fc9', 'single', 'Volanie. Reakcia?', '[{"id":"a","label":"Legit — ZSE 0850 číslo je oficiálne, len informačný hovor","correct":true,"severity":null},{"id":"b","label":"Vishing — energetické firmy sú scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"call","caller":"ZSE — zákaznícka linka","number":"0850 111 555","hint":"Avizujú výpadok elektriny v mojej oblasti dňa 30.04 (plánovaný odpočet/údržba)."}'::jsonb),
  ('4db15fd5-df5c-59ce-80ba-aa18b125d9ca', 'single', 'Inzerát na Bazoš. Reakcia?', '[{"id":"a","label":"Legit — nízka cena má reálny dôvod (sťahovanie), platba klasicky pri prevode na DI","correct":true,"severity":null},{"id":"b","label":"Scam — všetko pod cenou je podvod","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"listing","site":"bazos.sk","title":"Auto Škoda Octavia 2018, 120 000 km — RÝCHLO","price":"8 500 EUR","location":"Bratislava — sťahujem sa do zahraničia","description":"Stav výborný, servisná knižka, 1 majiteľ. Predávam súrne kvôli sťahovaniu do Rakúska. Auto si môžete prísť pozrieť, kúpa cez kúpnopredajnú zmluvu na DI."}'::jsonb),
  ('8f4cf863-0326-547d-a5c5-cc6fa1f0a562', 'single', 'Inzerát z dedičstva. Reakcia?', '[{"id":"a","label":"Legit — pozostalosť je reálny scenár, nízka cena má dôvod","correct":true,"severity":null},{"id":"b","label":"Scam — pozostalosť je vždy scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"listing","site":"bazos.sk","title":"Vintage hodinky Omega Seamaster — z pozostalosti otca","price":"350 EUR","location":"Trnava — osobné prevzatie","description":"Otec zomrel, predávam jeho zbierku. Hodinky funkčné, originálna škatuľka. Cenu som dal nižšiu, lebo nemám prehľad o trhu. Stretnutie u mňa doma alebo v meste."}'::jsonb),
  ('e3b60a32-a5be-5c24-8b4b-aa2a9243e004', 'single', 'Prenájom bytu — pôsobí podozrivo nízko. Reakcia?', '[{"id":"a","label":"Legit — pod-trh, ale s dôvodom (po deduške) + zmluva cez realitku","correct":true,"severity":null},{"id":"b","label":"Scam — byty pod 600 € sú scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"listing","site":"nehnutelnosti.sk","title":"2-izbový byt 55 m² Petržalka","price":"550 EUR / mesiac","location":"BA — Petržalka, blízko Aupark","description":"Hľadáme dlhodobého nájomcu, byt po deduške, doplníme len pár vecí. Obhliadka tento týždeň. Zmluva cez realitnú kanceláriu Reality Plus."}'::jsonb),
  ('5f115a86-c9f5-572d-8e3b-1e255891a4dc', 'single', 'Inzerát s neobvykle nízkou cenou. Reakcia?', '[{"id":"a","label":"Legit — drobnosti z domova predávajú často symbolicky","correct":true,"severity":null},{"id":"b","label":"Scam — nízka cena = scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"listing","site":"bazos.sk","title":"Modranská keramika — sada 6 ks z pozostalosti","price":"20 EUR","location":"Pezinok — osobné prevzatie","description":"Mama vyhadzuje, ja by som rád, aby to niekto využil. Sada talieriov mierny škrabanec. Iba osobne, ja nepošlem."}'::jsonb),
  ('bb93ae54-cc96-5c77-aa97-592d349ea4b3', 'single', 'Inzerát bicykla — pôsobí súrne. Reakcia?', '[{"id":"a","label":"Legit — dôvod (odchod do USA) + osobné prevzatie + doklad","correct":true,"severity":null},{"id":"b","label":"Scam — všetko súrne je scam","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"listing","site":"bazos.sk","title":"Horský bicykel CUBE Stereo 27.5 — kúpený 2022","price":"850 EUR","location":"Žilina — osobné prevzatie","description":"Predávam, lebo idem na štúdium do USA, do 14 dní. Originálna cena 2200 €, používaný ~10×. Stretnutie tento víkend, pri kúpe doklad o pôvode."}'::jsonb),
  ('154c28d4-ddcd-554c-9cdd-d16cacfe990d', 'single', 'Pohovka zadarmo. Reakcia?', '[{"id":"a","label":"Legit — nábytok zadarmo pri sťahovaní je bežné","correct":true,"severity":null},{"id":"b","label":"Scam — nič nie je zadarmo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"listing","site":"bazos.sk","title":"ZADARMO sedacia súprava — odvoz dnes/zajtra","price":"0 EUR","location":"Bratislava — Dúbravka, 3. poschodie bez výťahu","description":"Sťahujeme sa, sedačku už nepotrebujeme. Odvoz si zariadi nový majiteľ. Stav slušný, mierne použitá."}'::jsonb),
  ('9deb1fb1-956f-5e7c-8f90-f12b581bc5e2', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — moja jazda, len info","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"Bolt","body":"Vodic Marek (BL-742EE) je 2 min od miesta vyzdvihnutia. Cena jazdy 6,80 EUR."}'::jsonb),
  ('bc197e63-75d4-555a-aed1-20ba9aaf70ef', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — moja objednávka, sleduje stav","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'easy', 'published', '{"kind":"sms","sender":"Wolt","body":"Tvoj kurier prevzal objednavku z Hostinec U Lipy. Doruci do 22 minut."}'::jsonb),
  ('367593b0-d497-5cee-a573-3fdb9d40ff1f', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — práve som sa prihlasoval do appky","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"Uber","body":"Verifikacny kod: 4821. Nikomu ho neposielajte."}'::jsonb),
  ('1ba1ce8e-ec52-5010-8f4c-90a2295da088', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — moja jazda, beriem na vedomie","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"Yango","body":"Tvoja jazda je dokoncena. Cena 5,40 EUR strhnuta z karty *6628. Hodnotenie v aplikacii."}'::jsonb),
  ('56919a4f-de70-5100-b6b9-2da40a4763ba', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — moja rezervácia, otvorím appku ručne","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"sms","sender":"Airbnb","body":"Tvoja rezervacia HMA82B7K bola potvrdena. Detail v aplikacii."}'::jsonb),
  ('9824285e-a7d6-596a-85ff-ee5e02b8e6dc', 'single', 'Reagoval by si na túto SMS?', '[{"id":"a","label":"Áno — práve sa prihlasujem na novom MacBooku","correct":true,"severity":null},{"id":"b","label":"Nie — vyzerá podozrivo","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'hard', 'published', '{"kind":"sms","sender":"Apple","body":"Apple ID Verification Code: 728193. Nezdielajte. Platnost 10 min."}'::jsonb),
  ('43c37fd0-16aa-56b2-b915-a2c83858fa57', 'single', 'Na WhatsApp ti príde správa: „Ahoj Miro, posielam číslo od Tomáša, ale možno som sa pomýlil — ospravedlňujem sa!" Neznáme zahraničné číslo. Čo urobíš?', '[{"id":"a","label":"Odpoviem — to sa stáva, môže to byť zaujímavý človek","correct":false,"severity":"critical"},{"id":"b","label":"Správu ignorujem alebo odpoviem iba „Zlé číslo\" a nič viac","correct":true,"severity":null},{"id":"c","label":"Odpovedám a pýtam sa kde vzal moje číslo","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL),
  ('cba5ca06-154f-589e-b32d-708d52f978c9', 'single', 'Cudzinec ti píše na WhatsApp už 3 týždne, každý deň. Ponúka video hovor, ale vždy ho odkladá — „zlé spojenie", „pracovné stretnutie". Tvoja reakcia?', '[{"id":"a","label":"Viem, že má rušnú prácu — je to vážny človek","correct":false,"severity":"critical"},{"id":"b","label":"Bez živého videohovoru nedôverujem tejto osobe a finančné témy odmietam","correct":true,"severity":null},{"id":"c","label":"Pošlem mu najprv malú sumu — overí sa tým jeho zámer","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('130b27fd-ed75-5edf-beb6-c95132399d2e', 'single', 'Nový online "priateľ" ti odporučil investičnú platformu s odkazom, kde jeho portfólio vzrástlo o 180 % za 2 mesiace. Čo kontroluješ pred registráciou?', '[{"id":"a","label":"Nič — ak mu to funguje, prečo nie mne","correct":false,"severity":"critical"},{"id":"b","label":"Overím platformu v registri NBS / ESMA — či má licenciu na Slovensku","correct":true,"severity":null},{"id":"c","label":"Investujem malú sumu a uvidím","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('d8248b25-ea4a-5f24-b027-2a200cad1383', 'single', 'Priateľ z internetu ti poslal link na „overenú" investičnú platformu. Je táto URL v poriadku?', '[{"id":"a","label":"Áno — HTTPS a slovenský prefix sú dobré signály","correct":false,"severity":"critical"},{"id":"b","label":"Nie — žiadna regulovaná inštitúcia nemá takúto doménu","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', '{"kind":"url","url":"https://sk-invest-global-trade.com/dashboard","secure":true}'::jsonb),
  ('76327aa6-790f-5a76-96fe-f26ea16f85f0', 'single', 'Chceš vybrať "zisky" z online investičnej platformy. Platforma hovorí: „Pred výplatou 9 200 € musíte uhradiť daňovú zálohu 15 % (1 380 €) kryptomenou." Čo urobíš?', '[{"id":"a","label":"Zaplatím — chcem dostať zisky","correct":false,"severity":"critical"},{"id":"b","label":"Odmieta — toto je podvod, zálohu na daň pred výberom nikdy neplatím","correct":true,"severity":null},{"id":"c","label":"Zaplatím polovicu a uvidím","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('3d5f715e-e420-5a95-890c-cda9f6922094', 'single', 'Ktorý z týchto znakov naznačuje pig butchering (NIE legitímnu investičnú platformu)?', '[{"id":"a","label":"Prvý kontakt bol „omylná\" správa od cudzinca, potom romantické záujmy, potom investičná ponuka","correct":true,"severity":null},{"id":"b","label":"Platforma je registrovaná v NBS a má bankový prevod ako možnosť vkladu","correct":false,"severity":"minor"},{"id":"c","label":"Broker ponúka video konzultáciu s licencovaným poradcom na Slovensku","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'fake_vs_real', 'hard', 'published', NULL),
  ('03313d86-d2d3-5eb2-8a16-bc84e2db30e9', 'single', 'Po strate 4 000 € na falošnej investičnej platforme ti na Facebooku napíše: „Pomáhame obetiam podvodov získať kryptomeny späť — 80 % úspešnosť, poplatok iba po vrátení." Reaguješ?', '[{"id":"a","label":"Áno — nič nestrácam, poplatok platím až po vrátení","correct":false,"severity":"critical"},{"id":"b","label":"Nie — recovery scam je ďalší podvod na obetí predchádzajúceho","correct":true,"severity":null},{"id":"c","label":"Pošlem malú sumu ako test — ak vráti, pošlem viac","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'hard', 'published', NULL),
  ('30466482-abb0-565d-8c40-921a1867b428', 'single', 'Neznámy kontakt na Instagrame ti posiela správy 2 týždne — zaujíma sa o teba, komentuje fotky, pýta na prácu. Potom zmení tému: „Kamoška zarobila 5 000 € cez platformu, ukážem ti." Čo to je?', '[{"id":"a","label":"Možno naozaj chce pomôcť — spýtam sa viac","correct":false,"severity":"critical"},{"id":"b","label":"Pig butchering — budovanie dôvery pred investičným podvodom","correct":true,"severity":null},{"id":"c","label":"Multilevel marketing — budem opatrný, ale vypočujem si","correct":false,"severity":"medium"}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL),
  ('06030df1-0696-5597-81fe-f0b2a900cab4', 'single', 'Hľadaš „tatra banka prihlasenie" na Google. Prvý výsledok má štítok „Sponzorované" a URL je táto. Klikneš?', '[{"id":"a","label":"Áno — prvý výsledok vo vyhľadávači je vždy správny","correct":false,"severity":"critical"},{"id":"b","label":"Nie — pravá doména je tatrabanka.sk, nie tatrabanka-prihlasenie.sk","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'easy', 'published', '{"kind":"url","url":"https://tatrabanka-prihlasenie.sk/ib/login","secure":true}'::jsonb),
  ('2f4d2568-7977-59d9-86e8-f6a928a7d46b', 'single', 'Vo výsledkoch Google vidíš reklamu „VÚB Internetbanking — Prihlásenie". URL v reklame je táto. Je v poriadku?', '[{"id":"a","label":"Áno — VÚB je tam uvedená, určite je to ich stránka","correct":false,"severity":"critical"},{"id":"b","label":"Nie — VÚB je na vub.sk, nie vub-banking.online","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'easy', 'published', '{"kind":"url","url":"https://vub-banking.online/prihlasenie","secure":true}'::jsonb),
  ('c481d4fa-18dc-51ba-a37b-c5a3691d2c18', 'single', 'Bing ti ako sponzorovaný výsledok zobrazí prihlasovanie do Microsoft 365 na tejto adrese. Prihlósiš sa?', '[{"id":"a","label":"Áno — vidím Microsoft v adrese aj HTTPS","correct":false,"severity":"critical"},{"id":"b","label":"Nie — pravý M365 login je login.microsoftonline.com, nie login-secure.com","correct":true,"severity":null}]'::jsonb, '[1]'::jsonb, 'url', 'medium', 'published', '{"kind":"url","url":"https://microsoft365-sk.login-secure.com/oauth2","secure":true}'::jsonb),
  ('56547498-45c7-52da-9059-f3a56b56e5c5', 'single', 'Na Facebooku vidíš reklamu: „Slovenská sporiteľňa — krypto portál pre klientov SR. Garantovaný výnos 12 % mesačne." Čo s tým?', '[{"id":"a","label":"Kliknem — SLSP je dôveryhodná banka, to musí byť legitímne","correct":false,"severity":"critical"},{"id":"b","label":"Ignorujem — garantovaný výnos je zákonom zakázaný a SLSP krypto portál nemá","correct":true,"severity":null},{"id":"c","label":"Registrujem sa s malou sumou — uvidím","correct":false,"severity":"critical"}]'::jsonb, '[1]'::jsonb, 'scenario', 'medium', 'published', NULL),
  ('7da091ed-695a-5d84-ad77-5ddb44f05535', 'single', 'Vo výsledkoch Google vidíš reklamu „ČSOB — Prihlásenie do George". URL v reklamnom odkaze ukazuje na csob.sk. Prihlósiš sa?', '[{"id":"a","label":"Áno — csob.sk je pravá doména ČSOB","correct":true,"severity":null},{"id":"b","label":"Nie — reklamy sú vždy nebezpečné","correct":false,"severity":"minor"}]'::jsonb, '[0]'::jsonb, 'honeypot', 'medium', 'published', '{"kind":"url","url":"https://csob.sk/george/login","secure":true}'::jsonb),
  ('0e86480f-8b07-5c20-a890-4450af7f99df', 'single', 'Ako si najlepšie zabezpečiť, že nikdy neklikneš na falošnú Google reklamu na bankové prihlásenie?', '[{"id":"a","label":"Používam vždy Google — rýchlo nájdem čo potrebujem","correct":false,"severity":"medium"},{"id":"b","label":"Uložím si prihlasovanie do záložiek prehliadača a tieto záložky vždy používam","correct":true,"severity":null},{"id":"c","label":"Kontrolujem vždy, či reklama má štítok „Sponzorované\" — také preskočím","correct":false,"severity":"minor"}]'::jsonb, '[1]'::jsonb, 'scenario', 'easy', 'published', NULL)
ON CONFLICT (id) DO NOTHING;

-- quick_test_questions rows
INSERT INTO public.quick_test_questions (quick_test_config_id, question_id, order_index)
VALUES
  (1, 'd0c42316-c2d2-532e-9cde-2814adaa1398', 0),
  (1, 'd1085207-921d-55e5-b796-ccc9a18f68e5', 1),
  (1, 'ea5c587e-1163-512d-bb1d-4ac5839af252', 2),
  (1, 'f1ac728e-8d6f-59a0-b44e-b2bd928d76da', 3),
  (1, '9c71b5ce-cc71-5111-a7fb-8bef03776c94', 4),
  (1, '23d550d2-5586-55fa-b7d4-2b4917c83fb2', 5),
  (1, 'cc113595-caa2-5925-9e0f-7a1fe6ea53a7', 6),
  (1, '69f19901-6291-5607-a7f7-108a384bec7d', 7),
  (1, '1327585e-05e8-50b7-9f83-40e2c6b957f6', 8),
  (1, 'b3397560-b85e-511a-8369-a57318a3b3eb', 9),
  (1, '87f64998-50db-5d6d-8845-659860851939', 10),
  (1, 'e6875080-21f4-5c56-8f44-4b4f238aea14', 11),
  (1, '68e42fdc-82a7-515d-8acb-2cab6ab5f2df', 12),
  (1, 'dc04128f-7d7f-5d11-8c7e-a0bf65ace3db', 13),
  (1, '1e70576d-b484-57d5-9a6c-3fa2f8a4f7b2', 14),
  (1, 'ee23fe54-923e-5f07-ab63-f6e18cd722c9', 15),
  (1, 'ca4a271f-5d44-50c2-9a3a-b65c4b6ebd03', 16),
  (1, 'e847de09-5508-5d80-bdd0-45d212557449', 17),
  (1, '2872ee01-06dd-5e9f-91e4-4fcb98882d75', 18),
  (1, '2cf11779-9512-5f37-ae42-3c1eb344690d', 19),
  (1, '4521257a-6444-54d4-8c11-0bc1698a099d', 20),
  (1, '39e73a9f-0f42-57f9-8666-0853565dfdfc', 21),
  (1, '47c547ac-85ba-5b39-a9ce-b8706aec7fa6', 22),
  (1, '091b5809-1fd4-5234-b0f3-94eb839a283d', 23),
  (1, '891a3790-41ed-52ae-9551-d717b62b2bf4', 24),
  (1, 'cb1f6559-8c6a-528d-b724-6f74bb87d50b', 25),
  (1, 'cbcf9c6b-861b-5f3a-9b25-08b058ddb95d', 26),
  (1, '76abca68-1a07-527b-ada2-835ee8b28e5e', 27),
  (1, '98eabcb5-cfbb-5f99-b4c6-473e98c5ad7d', 28),
  (1, 'a37dca13-9544-55a7-ae60-732ebb588ec3', 29),
  (1, 'db2cddf9-20da-5ff8-923b-b4f56218d8c4', 30),
  (1, 'b6307537-86ab-5e38-88e4-3f017e258423', 31),
  (1, '25029db2-2517-5c41-9083-52b4b2507e21', 32),
  (1, 'cb600a25-4441-5a3c-a347-51c337890806', 33),
  (1, '2d5a2aa8-4ea5-5b54-bf0e-0f68d6efe160', 34),
  (1, '94a84bcd-673d-5404-ada0-478e9e2c88ab', 35),
  (1, '811a44e6-111a-5c1e-996b-5aaeee3cf817', 36),
  (1, 'c493ec4a-9b2f-524b-83c9-d807a8d223a4', 37),
  (1, '4023b60e-aaa7-511d-aaf2-fcb418430dbb', 38),
  (1, '6ed4c2ef-ebac-5600-b221-0352e6bd3f09', 39),
  (1, 'eca4000a-1bc2-5882-800c-53c9a1ac1eef', 40),
  (1, '89a5f706-78da-5914-b416-da5b3194d9c0', 41),
  (1, 'dcf08155-5676-5da5-8638-9d2b44c9b127', 42),
  (1, 'c13411fb-d083-54b6-adde-2c5b47b3fbfc', 43),
  (1, '7c34768e-ccdb-5b15-a45d-bb5bcdb239df', 44),
  (1, 'f29988a5-c553-52b4-bd14-86a1dd851b46', 45),
  (1, '0abf09fd-21c1-598d-bee9-5fcd84ef6f66', 46),
  (1, '69893d6e-6303-55e1-9972-8c8a2188c69c', 47),
  (1, '90a59e98-63c9-588e-8679-b715cc8eb878', 48),
  (1, '65158bc0-ec43-5233-93f9-81bd54d75460', 49),
  (1, 'd5c2d7dd-6f31-5370-8b30-f4d512c3d8a4', 50),
  (1, 'e5ec4150-aaed-5dba-8999-82009b3410ee', 51),
  (1, '3f83f65d-c960-5300-8e22-d1eaac4a964f', 52),
  (1, 'cf091954-21c8-539e-9e6d-c5ee4ce9ec67', 53),
  (1, '87bded60-d620-5595-8c61-39c8dfdc9bcd', 54),
  (1, '64108ffa-9b89-51a5-8f84-fa9082c5cbd9', 55),
  (1, '9b0c41fb-ba2e-5a5a-9d21-7932f4d7eee0', 56),
  (1, '19740138-fda3-53c5-8601-24aa50f3cd7f', 57),
  (1, '7407b22f-1b07-5882-9b2f-85cff44a25d0', 58),
  (1, 'b17bdc88-7678-58c7-acc9-13bbb44b5752', 59),
  (1, 'b4e3267e-447a-5648-9142-ac3c10f60e78', 60),
  (1, 'e445dee0-1de0-542f-80a0-fe63fbacff20', 61),
  (1, '6550013d-d06f-53eb-89e7-d445bdc4e3d2', 62),
  (1, '50ac723d-8e4d-59ff-8b8e-ec6811d1c57b', 63),
  (1, 'f95434ab-0a13-53be-aae5-b3f2f9e61e5a', 64),
  (1, '9205b0dd-8ae4-5af5-9628-ddb23685f7b7', 65),
  (1, 'f95622e0-e553-5a0a-9b70-0f62e954e940', 66),
  (1, '563a9098-4e08-550e-bd86-ed451f687721', 67),
  (1, '3be19514-0401-5f69-8a6b-98328ac144da', 68),
  (1, '9160f82b-9dbd-55c5-9908-5750603d03bd', 69),
  (1, '4238c64f-a51e-52fb-b56b-fe5b60a5c591', 70),
  (1, '4129cfb1-17f7-5ba9-9389-559e1da147f4', 71),
  (1, 'a6acbbd8-fd7d-5180-92f7-4d0d14b7e7f8', 72),
  (1, 'a10a84ad-eff5-539d-93df-e4e08b2fd9da', 73),
  (1, '61835464-3448-5b35-a07f-5112920d5f4a', 74),
  (1, '62be4536-f938-57c4-a072-994dfdca161b', 75),
  (1, '89f0daa7-2702-590d-99bd-002954b7ada6', 76),
  (1, '49797c3c-a518-5a8b-a323-25a609299965', 77),
  (1, '2c1219c7-2bcc-573b-8194-273270bfec7c', 78),
  (1, '8d0caaa0-2f0f-5284-b21f-b05d66e5491a', 79),
  (1, 'ef80e646-2411-5a23-98ab-166acd611195', 80),
  (1, '80d0323b-69bd-5518-bf6d-8a37bd17798d', 81),
  (1, '16996d4a-6bc7-58a4-a289-28c39c161881', 82),
  (1, '7d98e002-a223-5fac-af69-88e89f037718', 83),
  (1, 'e3b9c8e4-061b-58dc-828f-77722f6743b4', 84),
  (1, '5f06e6e2-7574-504e-b228-d25d454ae853', 85),
  (1, 'e1b3045c-2fd5-5b3f-80fa-6f8456ac826a', 86),
  (1, '558a78c5-f89d-5950-8681-e200ea08f0b3', 87),
  (1, '02655814-5b40-5d45-b1d1-1484598d5439', 88),
  (1, 'f938eec3-d425-5e9c-a285-6552cea0248c', 89),
  (1, 'e7a99388-440e-5f89-8e5f-caba827b75f7', 90),
  (1, '4dbbb1a3-00ca-57d1-ad4e-69f1adaa77eb', 91),
  (1, '5c7c47f3-bebe-5921-81ad-45e20f973865', 92),
  (1, 'e1b4b2c1-7f4d-54f7-8c28-ca5a8901d57a', 93),
  (1, '60638f52-27c8-58a6-ae7b-96668def55b2', 94),
  (1, 'f6adaae5-c05a-5204-ae1a-8fdd201a228f', 95),
  (1, 'f67b9dba-7a9a-58a7-8e7b-61abd26782cb', 96),
  (1, '5dfc48cb-217a-5d07-b725-79f6d56beabf', 97),
  (1, '83032416-9c7e-5a30-a4ae-a49e75907657', 98),
  (1, '996f45dc-d836-5fbb-9a1f-04ce99fb9502', 99),
  (1, '4fdacd73-cba6-5ea2-b24c-08601db5864e', 100),
  (1, 'bac067ec-c743-5152-bbd6-248b7eaa1606', 101),
  (1, 'db0d5a01-bb36-5c58-8289-a215518bc80b', 102),
  (1, '3e8d920c-1245-5c60-b81e-a67a0a7d0c92', 103),
  (1, '091c41ce-92a9-5d44-b36a-aee49f6f3115', 104),
  (1, '2ef518a4-d93e-5172-908b-b2030d900782', 105),
  (1, 'c1680e23-5259-521a-b11a-995d83c9cad8', 106),
  (1, 'e6121f5d-0c35-5a57-920a-38cff631ddd1', 107),
  (1, '99d211fa-63c9-57af-b41c-b94b597f550c', 108),
  (1, 'f6281bc6-5b23-5669-9847-e880fc185593', 109),
  (1, '78342189-823a-5701-a0b2-d9d57ef1fda9', 110),
  (1, '91fea79f-6da0-591b-96e4-78cff269341e', 111),
  (1, '19047939-717b-5c2b-8125-02cb7f38e7e0', 112),
  (1, 'e2427b05-4dd1-5965-beca-b5e5de68f9e1', 113),
  (1, '3f184c46-e05a-5188-b898-ff7045dcfb19', 114),
  (1, '7ba8c165-f49b-5e49-9461-1356e87c6c96', 115),
  (1, '176bd86d-ab7d-5cfd-9913-fdc0b3f93b3e', 116),
  (1, '8c2f0a7c-d4dc-5d57-bfe1-5c65bb680476', 117),
  (1, '3b490e46-9157-5a5e-ac90-290e0b010c99', 118),
  (1, 'fe6cea6e-4354-56f9-a34f-f4926fcda071', 119),
  (1, 'a7778446-8dba-5598-8568-257cf1110d58', 120),
  (1, '863c8d6b-c347-53cc-8f08-d344438bad08', 121),
  (1, 'bf2fcdaa-b324-5422-8658-987ef724f78c', 122),
  (1, '91cc7a44-d331-50bb-b67c-c007a9d27e09', 123),
  (1, 'b0974b8f-c471-595c-ac36-a8e895f177b2', 124),
  (1, '4fd5c4c1-f8ed-563d-bf28-08faa7cb498e', 125),
  (1, 'c331bc83-fb2d-52e8-bf12-b5c81a352ed3', 126),
  (1, '0f6d47b6-670b-5adf-9458-f37f17857247', 127),
  (1, 'd5fb3bda-1e3b-557d-9cfd-b6b0801c8f06', 128),
  (1, 'd4955cfb-d34c-50ea-a845-689c76ea7570', 129),
  (1, '66e0b679-af88-5c17-ba83-1adb6b3095ec', 130),
  (1, '3369e50f-a2f2-52cf-8c46-819a9038e32f', 131),
  (1, '6caed0cb-63e3-5983-93d6-8931d656a272', 132),
  (1, 'e067c53c-1de3-5ef2-a403-5477f1cb05d2', 133),
  (1, '3e6585ec-6be6-5fbb-82f8-44316adc5796', 134),
  (1, 'e314522d-3278-5c3f-b413-c80fbe2f7275', 135),
  (1, 'cec3899c-a90a-5304-a6ee-dd623339d115', 136),
  (1, 'bba74625-f3e3-5993-b8f6-e304e4a41e4f', 137),
  (1, '009397cd-12b2-5525-9756-20be8d9c78e0', 138),
  (1, '684bc731-ab5e-577f-89f2-302e39405506', 139),
  (1, '16e4eca3-e949-5585-9d0a-0bc500547b72', 140),
  (1, 'e95e81be-9477-5fd8-a8bc-0fcc74a4a6c2', 141),
  (1, '74438156-c08e-59fd-9a1a-198ebcb59d83', 142),
  (1, 'd2130da0-20f7-550c-8e60-7dc1a8ebd098', 143),
  (1, 'c707b0fe-ec76-5d64-b2c4-419a4f90cbf3', 144),
  (1, '67bcbefb-a353-5b93-b5f0-1217f64d7a6a', 145),
  (1, '48460164-ebdc-5818-9eb5-38599577ac39', 146),
  (1, 'd9c622d6-32b3-581b-a6d9-c9f0c0031516', 147),
  (1, 'b0b98a60-6572-5e77-9028-ba813e596411', 148),
  (1, 'd7ce9c72-4d89-568c-909b-1751d05141a5', 149),
  (1, 'c36012bd-cc9c-5d52-93f0-47a4242091de', 150),
  (1, '09c1eaaa-be17-59b2-aa30-149f2be8bc0f', 151),
  (1, '753bd60f-cf99-578b-ba0f-28a6d7587af8', 152),
  (1, 'a7229636-2611-53fd-862a-7c722c1ecae6', 153),
  (1, 'e9ae9fff-1c18-51b8-9ec6-ec7dfd615ed0', 154),
  (1, 'd2c95a2d-9d8a-510e-b5b3-a7f7bc5efb52', 155),
  (1, '63935c7d-4b0c-5918-bb07-a8c4774ce4fc', 156),
  (1, '5049fa99-75d0-5d61-bebc-e1557d750863', 157),
  (1, 'a6fc816f-aaf5-5ade-bf7b-c7123ef6ac79', 158),
  (1, '32e8ed3c-bbf3-5262-929a-c788652c0ed0', 159),
  (1, '1320bfe3-94ab-54e6-859f-b82fbcdbb5cd', 160),
  (1, '9b981ed2-4397-5f58-920c-8b602827d098', 161),
  (1, '9f9f5461-540d-51f1-b877-0be69620b3d5', 162),
  (1, 'c1f427e6-e929-5be5-8496-786e032da6c1', 163),
  (1, '1a6cc616-eb24-54a4-a2ae-807338cef4e9', 164),
  (1, 'f62b78cb-90cd-5ef2-ab4c-c34358c6cc6d', 165),
  (1, 'eb19cafa-6dd4-52fb-a7cd-db8c9d413e16', 166),
  (1, 'a591a585-6fe9-58ef-a6cc-031e29343ac2', 167),
  (1, '7644c1c4-d285-5ab1-8ea3-593fc943b98b', 168),
  (1, '97392731-70b2-528c-af03-d76b3b67c338', 169),
  (1, '4a9269ed-ea97-5599-b6e4-914b57391f2d', 170),
  (1, 'ae91d5ae-b6b6-52ff-8e55-361ee71f31a4', 171),
  (1, '4bd3d488-7bab-5f3c-907f-4cd39f3f7203', 172),
  (1, 'a610af3b-0745-538b-ba8a-e4f59b8412ee', 173),
  (1, 'b0003b2a-17fd-52ac-bedc-f4dd415abbcf', 174),
  (1, '1021aee2-181a-5b32-8ef2-cb294d1187c7', 175),
  (1, '1baba37f-bc46-5c68-89f4-52dde89bed93', 176),
  (1, 'beeb425b-e5c4-5278-8cca-6e4b84d40ff9', 177),
  (1, 'c8339e43-9d4e-5d83-8574-b236ebc2e59e', 178),
  (1, '2044a48f-9b1b-5b88-9ee0-53bf07b8c35d', 179),
  (1, '47499fde-302d-5d0c-b9b5-88e44b7000dc', 180),
  (1, 'bf04208f-7914-52a7-9a7f-b930cf0b6154', 181),
  (1, 'ee11bb97-f0a6-5076-a0c3-07cc2bd6a690', 182),
  (1, '254ca883-432c-55e5-9db9-276c65f3add6', 183),
  (1, 'cafdc340-b861-59d0-92c4-6495208beb9b', 184),
  (1, '1e4c95ef-50fd-5544-8308-7bfdb6dd1764', 185),
  (1, '69e9ed0f-3e42-59d9-bec0-7a4330ffca12', 186),
  (1, '48766657-4d9f-501f-8f25-ac4da528a3d6', 187),
  (1, '517fb81a-3e7a-5477-93bf-d31dc47738e0', 188),
  (1, 'a4f9e3c4-cc27-525c-be40-5b27ff4caa5a', 189),
  (1, '3ec7ff1b-127e-57d1-afae-c1803a5c9805', 190),
  (1, 'fe5e6d7d-379f-5b7f-b6f8-9d2f84661736', 191),
  (1, 'ddd3cb73-b3d7-55f7-8c34-71c7eb928ea3', 192),
  (1, '2b7152be-9719-5320-adea-b8cae89fe0ec', 193),
  (1, '330064e6-53e2-51f3-a9dd-b034c84678bf', 194),
  (1, '0424f276-54cc-5853-b437-8e52cb4d7d96', 195),
  (1, '466aace9-0258-5c6a-937c-ac4b40fca5aa', 196),
  (1, '0e9f6b47-bfd9-513e-b275-21619980ca0a', 197),
  (1, 'ad44e56f-cd9c-54c6-b779-7eef7fca2ff5', 198),
  (1, '2a30efa2-6f92-577c-987e-528fc918c187', 199),
  (1, 'cdca6f4e-97dc-5825-bf13-cb2e3073527c', 200),
  (1, '36c1b946-70e3-5c1d-9831-aa3179920279', 201),
  (1, '028e8720-8dc2-5bd4-8b8e-b91106903206', 202),
  (1, 'de056883-e882-5f44-bced-fa2038dd064a', 203),
  (1, '1bf373f0-e74e-56ca-8432-92bc7c72628d', 204),
  (1, '338e02a3-0c07-57c9-bec3-40531112ab9c', 205),
  (1, '4949aac9-3da2-55c7-ae5d-ed2024e885e0', 206),
  (1, 'eec07cbc-4ceb-527e-930c-389911ccec8a', 207),
  (1, '67922472-8ac7-5209-b1e5-a02a8ab0ca4e', 208),
  (1, 'acf525a1-dcfb-5bd5-be06-a2cf4bbbdcf6', 209),
  (1, '9e9cb7a4-d813-5280-b142-dd3d5f010b57', 210),
  (1, '6920e712-e7b2-510a-9049-34ff907f6fc9', 211),
  (1, '4db15fd5-df5c-59ce-80ba-aa18b125d9ca', 212),
  (1, '8f4cf863-0326-547d-a5c5-cc6fa1f0a562', 213),
  (1, 'e3b60a32-a5be-5c24-8b4b-aa2a9243e004', 214),
  (1, '5f115a86-c9f5-572d-8e3b-1e255891a4dc', 215),
  (1, 'bb93ae54-cc96-5c77-aa97-592d349ea4b3', 216),
  (1, '154c28d4-ddcd-554c-9cdd-d16cacfe990d', 217),
  (1, '9deb1fb1-956f-5e7c-8f90-f12b581bc5e2', 218),
  (1, 'bc197e63-75d4-555a-aed1-20ba9aaf70ef', 219),
  (1, '367593b0-d497-5cee-a573-3fdb9d40ff1f', 220),
  (1, '1ba1ce8e-ec52-5010-8f4c-90a2295da088', 221),
  (1, '56919a4f-de70-5100-b6b9-2da40a4763ba', 222),
  (1, '9824285e-a7d6-596a-85ff-ee5e02b8e6dc', 223),
  (1, '43c37fd0-16aa-56b2-b915-a2c83858fa57', 224),
  (1, 'cba5ca06-154f-589e-b32d-708d52f978c9', 225),
  (1, '130b27fd-ed75-5edf-beb6-c95132399d2e', 226),
  (1, 'd8248b25-ea4a-5f24-b027-2a200cad1383', 227),
  (1, '76327aa6-790f-5a76-96fe-f26ea16f85f0', 228),
  (1, '3d5f715e-e420-5a95-890c-cda9f6922094', 229),
  (1, '03313d86-d2d3-5eb2-8a16-bc84e2db30e9', 230),
  (1, '30466482-abb0-565d-8c40-921a1867b428', 231),
  (1, '06030df1-0696-5597-81fe-f0b2a900cab4', 232),
  (1, '2f4d2568-7977-59d9-86e8-f6a928a7d46b', 233),
  (1, 'c481d4fa-18dc-51ba-a37b-c5a3691d2c18', 234),
  (1, '56547498-45c7-52da-9059-f3a56b56e5c5', 235),
  (1, '7da091ed-695a-5d84-ad77-5ddb44f05535', 236),
  (1, '0e86480f-8b07-5c20-a890-4450af7f99df', 237)
ON CONFLICT (quick_test_config_id, question_id) DO NOTHING;

-- ============================================================================
-- Phase 3 — profile_preferences (educator onboarding state)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_preferences (
  user_id            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  audience_kind      text,
  scam_interests     text[] DEFAULT '{}',
  digest_cadence     text DEFAULT 'weekly',
  digest_quiet_weeks boolean DEFAULT false,
  onboarded_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_preferences
  ADD CONSTRAINT profile_prefs_audience_kind_check
  CHECK (audience_kind IS NULL OR audience_kind IN ('class', 'colleagues', 'clients', 'other'));

ALTER TABLE public.profile_preferences
  ADD CONSTRAINT profile_prefs_digest_cadence_check
  CHECK (digest_cadence IN ('weekly', 'monthly', 'off'));

CREATE OR REPLACE FUNCTION public.touch_profile_preferences()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER profile_preferences_touch
  BEFORE UPDATE ON public.profile_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_profile_preferences();

ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_prefs_owner_select ON public.profile_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY profile_prefs_owner_insert ON public.profile_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY profile_prefs_owner_update ON public.profile_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.profile_preferences TO authenticated;

-- Phase 7b — optional pseudonym for shareable peer-card PNG (opt-in).
ALTER TABLE public.profile_preferences
  ADD COLUMN IF NOT EXISTS share_handle text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prefs_share_handle_check'
  ) THEN
    ALTER TABLE public.profile_preferences
      ADD CONSTRAINT prefs_share_handle_check
      CHECK (share_handle IS NULL OR (length(share_handle) BETWEEN 2 AND 32));
  END IF;
END $$;

-- ============================================================================
-- Phase 4 — user_digests (weekly retention digest, signal-gated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_digests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  stats         jsonb NOT NULL DEFAULT '{}',
  generated_at  timestamptz NOT NULL DEFAULT now(),
  opened_at     timestamptz,
  UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS user_digests_user_id_period_idx
  ON public.user_digests (user_id, period_start DESC);

ALTER TABLE public.user_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_digests_owner_select ON public.user_digests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_digests_owner_update ON public.user_digests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.user_digests TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_weekly_digests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period_start date := current_date - 7;
  v_period_end   date := current_date;
  v_count        integer := 0;
BEGIN
  WITH window_sessions AS (
    SELECT
      t.owner_id,
      s.id              AS session_id,
      s.test_id,
      s.status,
      s.finished_at,
      t.title           AS test_title
    FROM public.tests t
    JOIN public.sessions s ON s.test_id = t.id
    WHERE s.finished_at IS NOT NULL
      AND s.finished_at >= v_period_start
      AND s.finished_at <  v_period_end
  ),
  top_tests AS (
    SELECT DISTINCT ON (owner_id)
      owner_id,
      test_id,
      test_title,
      COUNT(*) OVER (PARTITION BY owner_id, test_id) AS test_sessions
    FROM window_sessions
    ORDER BY owner_id, test_sessions DESC, test_id
  ),
  aggregated AS (
    SELECT
      ws.owner_id,
      COUNT(ws.session_id)                                        AS sessions_count,
      ROUND(
        100.0 * COUNT(ws.session_id) FILTER (WHERE ws.status = 'completed')
        / NULLIF(COUNT(ws.session_id), 0)
      , 1)                                                        AS completion_rate
    FROM window_sessions ws
    GROUP BY ws.owner_id
    HAVING COUNT(ws.session_id) >= 1
  )
  INSERT INTO public.user_digests (user_id, period_start, period_end, stats)
  SELECT
    a.owner_id,
    v_period_start,
    v_period_end,
    jsonb_build_object(
      'sessions_count',  a.sessions_count,
      'completion_rate', COALESCE(a.completion_rate, 0),
      'top_test_id',     tt.test_id,
      'top_test_title',  tt.test_title
    )
  FROM aggregated a
  LEFT JOIN top_tests tt ON tt.owner_id = a.owner_id
  ON CONFLICT (user_id, period_start) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.notifications (user_id, event_type, title, body)
  SELECT
    ud.user_id,
    'daily_summary',
    'Týždenný súhrn',
    'Týždenný súhrn: ' || (ud.stats ->> 'sessions_count') || ' nových odpovedí.'
  FROM public.user_digests ud
  WHERE ud.period_start = v_period_start
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = ud.user_id
        AND n.event_type = 'daily_summary'
        AND n.created_at::date = v_period_end
    );

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.generate_weekly_digests() TO service_role;

-- pg_cron (activate manually in prod):
-- SELECT cron.schedule(
--   'generate-weekly-digests',
--   '0 6 * * 1',
--   $$ SELECT public.generate_weekly_digests(); $$
-- );

-- ============================================================================
-- Phase 5 — course_recommendations (poor-result-triggered course nudge)
-- ============================================================================

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS slug              text,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

CREATE UNIQUE INDEX IF NOT EXISTS trainings_slug_unique_idx
  ON public.trainings (slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.course_recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_id   uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  reason_key    text NOT NULL CHECK (reason_key IN ('low_score_branch', 'new_content', 'peer_popular')),
  score_at_rec  numeric(5,2),
  branch_slug   text,
  dismissed_at  timestamptz,
  clicked_at    timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id, branch_slug)
);

CREATE INDEX IF NOT EXISTS course_rec_user_active_idx
  ON public.course_recommendations (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.course_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_rec_owner_select ON public.course_recommendations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY course_rec_owner_update ON public.course_recommendations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.course_recommendations TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_course_recommendations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.course_recommendations (user_id, training_id, reason_key, score_at_rec, branch_slug)
  SELECT
    t.owner_id,
    tr.id,
    'low_score_branch',
    ROUND((AVG(sa.is_correct::int) * 100.0)::numeric, 2),
    q.branch_slug
  FROM public.session_answers sa
  JOIN public.sessions s   ON s.id = sa.session_id
  JOIN public.tests t      ON t.id = s.test_id
  JOIN public.questions q  ON q.id = sa.question_id
  JOIN public.trainings tr ON tr.topic_slug = q.branch_slug AND tr.status = 'published'
  WHERE s.status = 'completed'
    AND s.finished_at IS NOT NULL
    AND s.finished_at >= current_date - 30
    AND q.branch_slug IS NOT NULL
    AND sa.is_correct IS NOT NULL
  GROUP BY t.owner_id, tr.id, q.branch_slug
  HAVING AVG(sa.is_correct::int) <= 0.50
  ON CONFLICT (user_id, training_id, branch_slug) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.generate_course_recommendations() TO service_role;

-- pg_cron (activate manually in prod):
-- SELECT cron.schedule(
--   'generate-course-recommendations',
--   '0 3 * * *',
--   $$ SELECT public.generate_course_recommendations(); $$
-- );

-- ============================================================================
-- Phase 6 — retest_reminders (90-day retest cycle for completed tests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.retest_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id         uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  last_score      numeric(5,2),
  sessions_count  integer NOT NULL DEFAULT 0,
  last_session_at timestamptz NOT NULL,
  remind_after    date NOT NULL,
  dismissed_at    timestamptz,
  snoozed_until   date,
  retested_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);

CREATE INDEX IF NOT EXISTS retest_user_active_idx
  ON public.retest_reminders (user_id, remind_after)
  WHERE dismissed_at IS NULL AND retested_at IS NULL;

ALTER TABLE public.retest_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY retest_owner_select ON public.retest_reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY retest_owner_update ON public.retest_reminders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.retest_reminders TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_retest_reminders()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS retest_reminders_touch ON public.retest_reminders;
CREATE TRIGGER retest_reminders_touch
  BEFORE UPDATE ON public.retest_reminders
  FOR EACH ROW EXECUTE FUNCTION public.touch_retest_reminders();

CREATE OR REPLACE FUNCTION public.refresh_retest_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH last_sessions AS (
    SELECT
      t.owner_id                                  AS user_id,
      t.id                                        AS test_id,
      MAX(s.finished_at)                          AS last_session_at,
      COUNT(s.id)                                 AS sessions_count,
      ROUND(AVG(COALESCE(s.score, 0))::numeric, 2) AS last_score
    FROM public.tests t
    JOIN public.sessions s ON s.test_id = t.id
    WHERE s.status = 'completed'
      AND s.finished_at IS NOT NULL
      AND s.finished_at >= now() - interval '365 days'
    GROUP BY t.owner_id, t.id
  )
  INSERT INTO public.retest_reminders
    (user_id, test_id, last_score, sessions_count, last_session_at, remind_after)
  SELECT
    user_id, test_id, last_score, sessions_count, last_session_at,
    (last_session_at + interval '90 days')::date
  FROM last_sessions
  ON CONFLICT (user_id, test_id) DO UPDATE
  SET
    last_score      = EXCLUDED.last_score,
    sessions_count  = EXCLUDED.sessions_count,
    last_session_at = EXCLUDED.last_session_at,
    remind_after    = EXCLUDED.remind_after,
    updated_at      = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.refresh_retest_reminders() TO service_role;

-- pg_cron (activate manually in prod):
-- SELECT cron.schedule(
--   'refresh-retest-reminders',
--   '0 4 * * *',
--   $$ SELECT public.refresh_retest_reminders(); $$
-- );

-- ============================================================================
-- Phase 7a — get_peer_card RPC (educator audience vs. anonymous cohort)
-- ============================================================================
-- Returns the educator's audience performance vs. an anonymous cohort
-- baseline. Cohort reads ONLY from public.attempts_anon (PII-stripped
-- view). k-anonymity guard at cohort_size < 10.

CREATE OR REPLACE FUNCTION public.get_peer_card(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id         uuid;
  v_user_score      numeric;
  v_user_attempts   integer;
  v_cohort_avg      numeric;
  v_cohort_size     integer;
  v_user_percentile integer;
  v_branch_ranks    jsonb;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('has_data', false, 'reason', 'no_user');
  END IF;

  SELECT
    ROUND(AVG(COALESCE(s.score, 0))::numeric, 1),
    COUNT(s.id)
  INTO v_user_score, v_user_attempts
  FROM public.sessions s
  JOIN public.tests t ON t.id = s.test_id
  WHERE t.owner_id = v_user_id
    AND s.status = 'completed'
    AND s.finished_at IS NOT NULL
    AND s.finished_at >= now() - interval '90 days';

  SELECT
    ROUND(AVG(final_score)::numeric, 1),
    COUNT(*)
  INTO v_cohort_avg, v_cohort_size
  FROM public.attempts_anon
  WHERE created_at >= now() - interval '90 days'
    AND final_score IS NOT NULL;

  IF COALESCE(v_cohort_size, 0) < 10 THEN
    RETURN jsonb_build_object('has_data', false, 'reason', 'insufficient_cohort');
  END IF;

  IF COALESCE(v_user_attempts, 0) = 0 THEN
    RETURN jsonb_build_object(
      'has_data', false,
      'reason', 'no_user_data',
      'cohort_avg', v_cohort_avg,
      'cohort_size', v_cohort_size
    );
  END IF;

  SELECT ROUND(
    100.0 * COUNT(*) FILTER (WHERE final_score < v_user_score)
    / GREATEST(COUNT(*), 1)
  )::integer
  INTO v_user_percentile
  FROM public.attempts_anon
  WHERE created_at >= now() - interval '90 days'
    AND final_score IS NOT NULL;

  SELECT jsonb_agg(branch_rank ORDER BY (branch_rank->>'user_score')::numeric DESC)
  INTO v_branch_ranks
  FROM (
    SELECT jsonb_build_object(
      'branch_slug',  user_branches.branch_slug,
      'user_score',   user_branches.user_score,
      'cohort_score', user_branches.cohort_score
    ) AS branch_rank
    FROM (
      SELECT
        q.branch_slug AS branch_slug,
        ROUND(AVG(CASE WHEN sa.is_correct THEN 100 ELSE 0 END)::numeric, 1) AS user_score,
        (
          SELECT ROUND(AVG(CASE WHEN sa2.is_correct THEN 100 ELSE 0 END)::numeric, 1)
          FROM public.session_answers sa2
          JOIN public.questions q2 ON q2.id = sa2.question_id
          WHERE q2.branch_slug = q.branch_slug
        ) AS cohort_score
      FROM public.session_answers sa
      JOIN public.sessions s ON s.id = sa.session_id
      JOIN public.tests t    ON t.id = s.test_id
      JOIN public.questions q ON q.id = sa.question_id
      WHERE t.owner_id = v_user_id
        AND s.status = 'completed'
        AND s.finished_at IS NOT NULL
        AND s.finished_at >= now() - interval '90 days'
        AND q.branch_slug IS NOT NULL
      GROUP BY q.branch_slug
      HAVING COUNT(*) >= 5
      ORDER BY user_score DESC
      LIMIT 3
    ) AS user_branches
  ) AS aggregated;

  RETURN jsonb_build_object(
    'has_data',        true,
    'user_score',      v_user_score,
    'user_attempts',   v_user_attempts,
    'user_percentile', v_user_percentile,
    'cohort_avg',      v_cohort_avg,
    'cohort_size',     v_cohort_size,
    'branch_ranks',    COALESCE(v_branch_ranks, '[]'::jsonb)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_peer_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_peer_card(uuid) TO service_role;

-- Phase 0 testing-coverage epic — security fix for get_peer_card.
--
-- The original function defaulted p_user_id to auth.uid() when NULL, but
-- accepted ANY uid from non-admin callers. A signed-in non-admin could
-- pass another user's id and read their cohort comparison. Tighten the
-- contract: if p_user_id resolves to a uid OTHER than auth.uid(), the
-- caller MUST have the 'admin' role; otherwise raise forbidden (42501).
--
-- Everything else (k-anonymity guard, branch ranks, return shape) is
-- preserved verbatim from 20260520500000_get_peer_card.sql.

CREATE OR REPLACE FUNCTION public.get_peer_card(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id         uuid;
  v_user_score      numeric;
  v_user_attempts   integer;
  v_cohort_avg      numeric;
  v_cohort_size     integer;
  v_user_percentile integer;
  v_branch_ranks    jsonb;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('has_data', false, 'reason', 'no_user');
  END IF;

  -- Cross-user lookups are admin-only. A non-admin can still call the
  -- function for their OWN user id (or omit p_user_id and fall through
  -- to auth.uid()), but cannot peek at another user's cohort numbers.
  IF v_user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- User's audience: completed sessions on tests they own, last 90 days.
  SELECT
    ROUND(AVG(COALESCE(s.score, 0))::numeric, 1),
    COUNT(s.id)
  INTO v_user_score, v_user_attempts
  FROM public.sessions s
  JOIN public.tests t ON t.id = s.test_id
  WHERE t.owner_id = v_user_id
    AND s.status = 'completed'
    AND s.finished_at IS NOT NULL
    AND s.finished_at >= now() - interval '90 days';

  -- Cohort baseline: anonymous public-quiz attempts, last 90 days.
  -- attempts_anon already strips PII (excludes rows with respondent_name).
  SELECT
    ROUND(AVG(final_score)::numeric, 1),
    COUNT(*)
  INTO v_cohort_avg, v_cohort_size
  FROM public.attempts_anon
  WHERE created_at >= now() - interval '90 days'
    AND final_score IS NOT NULL;

  -- k-anonymity guard
  IF COALESCE(v_cohort_size, 0) < 10 THEN
    RETURN jsonb_build_object(
      'has_data', false,
      'reason', 'insufficient_cohort'
    );
  END IF;

  IF COALESCE(v_user_attempts, 0) = 0 THEN
    RETURN jsonb_build_object(
      'has_data', false,
      'reason', 'no_user_data',
      'cohort_avg', v_cohort_avg,
      'cohort_size', v_cohort_size
    );
  END IF;

  SELECT ROUND(
    100.0 * COUNT(*) FILTER (WHERE final_score < v_user_score)
    / GREATEST(COUNT(*), 1)
  )::integer
  INTO v_user_percentile
  FROM public.attempts_anon
  WHERE created_at >= now() - interval '90 days'
    AND final_score IS NOT NULL;

  SELECT jsonb_agg(branch_rank ORDER BY (branch_rank->>'user_score')::numeric DESC)
  INTO v_branch_ranks
  FROM (
    SELECT jsonb_build_object(
      'branch_slug',  user_branches.branch_slug,
      'user_score',   user_branches.user_score,
      'cohort_score', user_branches.cohort_score
    ) AS branch_rank
    FROM (
      SELECT
        q.branch_slug                                                AS branch_slug,
        ROUND(AVG(CASE WHEN sa.is_correct THEN 100 ELSE 0 END)::numeric, 1) AS user_score,
        (
          SELECT ROUND(AVG(CASE WHEN sa2.is_correct THEN 100 ELSE 0 END)::numeric, 1)
          FROM public.session_answers sa2
          JOIN public.questions q2 ON q2.id = sa2.question_id
          WHERE q2.branch_slug = q.branch_slug
        )                                                            AS cohort_score
      FROM public.session_answers sa
      JOIN public.sessions s ON s.id = sa.session_id
      JOIN public.tests t    ON t.id = s.test_id
      JOIN public.questions q ON q.id = sa.question_id
      WHERE t.owner_id = v_user_id
        AND s.status = 'completed'
        AND s.finished_at IS NOT NULL
        AND s.finished_at >= now() - interval '90 days'
        AND q.branch_slug IS NOT NULL
      GROUP BY q.branch_slug
      HAVING COUNT(*) >= 5
      ORDER BY user_score DESC
      LIMIT 3
    ) AS user_branches
  ) AS aggregated;

  RETURN jsonb_build_object(
    'has_data',        true,
    'user_score',      v_user_score,
    'user_attempts',   v_user_attempts,
    'user_percentile', v_user_percentile,
    'cohort_avg',      v_cohort_avg,
    'cohort_size',     v_cohort_size,
    'branch_ranks',    COALESCE(v_branch_ranks, '[]'::jsonb)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_peer_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_peer_card(uuid) TO service_role;
-- Phase 0 testing-coverage epic — defense-in-depth for respondent RPCs.
--
-- Original respondent RPCs (start/submit/finalize) trusted the session
-- UUID as the sole capability token. An attacker who learned a
-- session_id (network log, leaked URL, etc.) could corrupt answers or
-- finalize the session with arbitrary score.
--
-- Mitigation: start_respondent_session now mints a separate session_token
-- (random uuid) and returns it alongside the session id. submit/finalize
-- accept an OPTIONAL p_session_token; the hash is checked against
-- respondent_session_tokens. 7-day backwards-compat window per D7 of
-- PLAN-2026-05-19-testing-coverage.md: while we are within the window
-- (`now() < cutoff_at`) a missing token is accepted; after cutoff a
-- missing or mismatched token raises 'session_token_required' /
-- 'invalid_session_token'.
--
-- Additionally, finalize_respondent_session now bounds p_score to
-- [0, 100] (the public scoring scale) to stop an anonymous caller from
-- submitting an out-of-range score like 999.
--
-- pgcrypto (used for sha256 digest) is already enabled by
-- 20260501000000_edu_mode.sql and 20260518000000_mfa_backup_codes.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.respondent_session_tokens (
  session_id  uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  cutoff_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS respondent_session_tokens_cutoff_idx
  ON public.respondent_session_tokens (cutoff_at);

-- Table is touched only by SECURITY DEFINER RPCs; no anon/auth RLS
-- policies. service_role retains direct access for ops queries.
ALTER TABLE public.respondent_session_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.respondent_session_tokens TO service_role;

-- ----------------------------------------------------------------------------
-- start_respondent_session: now returns jsonb { session_id, session_token }.
-- Drop the old uuid-returning signature first since return type cannot be
-- changed by CREATE OR REPLACE.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.start_respondent_session(text, jsonb, boolean, text);

CREATE FUNCTION public.start_respondent_session(
  p_share_id text,
  p_intake jsonb DEFAULT '{}'::jsonb,
  p_consent_given boolean DEFAULT false,
  p_segment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test_id uuid;
  v_version int;
  v_respondent_id uuid;
  v_session_id uuid;
  v_email text;
  v_display_name text;
  v_session_token uuid;
BEGIN
  SELECT id, version
    INTO v_test_id, v_version
    FROM public.tests
    WHERE share_id = p_share_id AND status = 'published';
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;

  v_email := NULLIF(p_intake ->> 'if_email', '');
  v_display_name := NULLIF(p_intake ->> 'if_name', '');

  IF v_email IS NOT NULL OR v_display_name IS NOT NULL THEN
    INSERT INTO public.respondents (email, display_name)
    VALUES (v_email, v_display_name)
    RETURNING id INTO v_respondent_id;
  END IF;

  INSERT INTO public.sessions (
    test_id, version, respondent_id, intake_data, consent_given,
    segment, status, started_at
  )
  VALUES (
    v_test_id, v_version, v_respondent_id, p_intake, p_consent_given,
    p_segment, 'in_progress', now()
  )
  RETURNING id INTO v_session_id;

  v_session_token := gen_random_uuid();
  INSERT INTO public.respondent_session_tokens (session_id, token_hash)
  VALUES (
    v_session_id,
    encode(digest(v_session_token::text, 'sha256'), 'hex')
  );

  RETURN jsonb_build_object(
    'session_id',    v_session_id,
    'session_token', v_session_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_respondent_session(text, jsonb, boolean, text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- submit_respondent_answer: optional p_session_token, enforced after cutoff.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_respondent_answer(uuid, uuid, text, boolean, int);

CREATE FUNCTION public.submit_respondent_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_value text,
  p_is_correct boolean DEFAULT NULL,
  p_time_ms int DEFAULT NULL,
  p_session_token uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status     public.session_status;
  v_token_hash text;
  v_cutoff_at  timestamptz;
  v_now        timestamptz := now();
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  SELECT token_hash, cutoff_at
    INTO v_token_hash, v_cutoff_at
    FROM public.respondent_session_tokens
    WHERE session_id = p_session_id;

  IF p_session_token IS NULL THEN
    IF v_token_hash IS NOT NULL AND v_now >= v_cutoff_at THEN
      RAISE EXCEPTION 'session_token_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_token_hash IS NULL
       OR v_token_hash <> encode(digest(p_session_token::text, 'sha256'), 'hex') THEN
      RAISE EXCEPTION 'invalid_session_token' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
  VALUES (p_session_id, p_question_id, p_value, p_is_correct, p_time_ms)
  ON CONFLICT (session_id, question_id) DO UPDATE
    SET value = EXCLUDED.value,
        is_correct = EXCLUDED.is_correct,
        time_ms = EXCLUDED.time_ms;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_respondent_answer(uuid, uuid, text, boolean, int, uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- finalize_respondent_session: optional p_session_token + bounded p_score.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finalize_respondent_session(uuid, numeric);

CREATE FUNCTION public.finalize_respondent_session(
  p_session_id uuid,
  p_score numeric DEFAULT NULL,
  p_session_token uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status     public.session_status;
  v_token_hash text;
  v_cutoff_at  timestamptz;
  v_now        timestamptz := now();
BEGIN
  IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
    RAISE EXCEPTION 'invalid_score'
      USING ERRCODE = '22023',
            MESSAGE = 'p_score must be between 0 and 100';
  END IF;

  SELECT status INTO v_status FROM public.sessions WHERE id = p_session_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  SELECT token_hash, cutoff_at
    INTO v_token_hash, v_cutoff_at
    FROM public.respondent_session_tokens
    WHERE session_id = p_session_id;

  IF p_session_token IS NULL THEN
    IF v_token_hash IS NOT NULL AND v_now >= v_cutoff_at THEN
      RAISE EXCEPTION 'session_token_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_token_hash IS NULL
       OR v_token_hash <> encode(digest(p_session_token::text, 'sha256'), 'hex') THEN
      RAISE EXCEPTION 'invalid_session_token' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.sessions
    SET status = 'completed',
        finished_at = now(),
        score = p_score
    WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_respondent_session(uuid, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_respondent_session(uuid, numeric, uuid) TO anon, authenticated;

-- ============================================================================
-- E16.1 — Blog content engine schema (mirror of 20260520000000_blog_schema.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_authors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio          text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  sort_order      int  NOT NULL DEFAULT 100,
  seo_title       text,
  seo_description text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  language        text NOT NULL DEFAULT 'sk',
  category_id     uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE RESTRICT,
  author_id       uuid NOT NULL REFERENCES public.blog_authors(id)    ON DELETE RESTRICT,
  pillar_post_id  uuid          REFERENCES public.blog_posts(id)      ON DELETE SET NULL,
  title           text NOT NULL,
  subtitle        text,
  excerpt         text NOT NULL,
  body_mdx        text NOT NULL,
  hero_image_url  text,
  og_image_url    text,
  seo_title       text,
  seo_description text,
  canonical_url   text,
  primary_keyword text,
  search_intent   text,
  reading_minutes int,
  faq_jsonb       jsonb,
  status          public.test_status NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON public.blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON public.blog_posts (category_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pillar     ON public.blog_posts (pillar_post_id) WHERE pillar_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag    ON public.blog_post_tags (tag_id);

CREATE OR REPLACE FUNCTION public.tg_blog_posts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_blog_posts_set_updated_at();

ALTER TABLE public.blog_authors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_read_published"     ON public.blog_posts;
DROP POLICY IF EXISTS "blog_authors_read_all"         ON public.blog_authors;
DROP POLICY IF EXISTS "blog_categories_read_all"      ON public.blog_categories;
DROP POLICY IF EXISTS "blog_tags_read_all"            ON public.blog_tags;
DROP POLICY IF EXISTS "blog_post_tags_read_via_post"  ON public.blog_post_tags;
DROP POLICY IF EXISTS "blog_posts_admin_all"          ON public.blog_posts;
DROP POLICY IF EXISTS "blog_authors_admin_all"        ON public.blog_authors;
DROP POLICY IF EXISTS "blog_categories_admin_all"     ON public.blog_categories;
DROP POLICY IF EXISTS "blog_tags_admin_all"           ON public.blog_tags;
DROP POLICY IF EXISTS "blog_post_tags_admin_all"      ON public.blog_post_tags;

CREATE POLICY "blog_posts_read_published"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());

CREATE POLICY "blog_authors_read_all"     ON public.blog_authors    FOR SELECT USING (true);
CREATE POLICY "blog_categories_read_all"  ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "blog_tags_read_all"        ON public.blog_tags       FOR SELECT USING (true);

CREATE POLICY "blog_post_tags_read_via_post"
  ON public.blog_post_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = blog_post_tags.post_id
        AND p.status = 'published'
        AND p.published_at IS NOT NULL
        AND p.published_at <= now()
    )
  );

CREATE POLICY "blog_posts_admin_all"
  ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_authors_admin_all"
  ON public.blog_authors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_categories_admin_all"
  ON public.blog_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_tags_admin_all"
  ON public.blog_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_post_tags_admin_all"
  ON public.blog_post_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.blog_authors (slug, display_name, bio)
VALUES (
  'subenai-editorial',
  'subenai editorial',
  'Tím subenai píše o internetových podvodoch, digitálnej bezpečnosti a tom, ako rozpoznať scam skôr, než ťa dostane.'
)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.blog_authors
SET display_name = 'subenai editorial',
    bio = 'Tím subenai píše o internetových podvodoch, digitálnej bezpečnosti a tom, ako rozpoznať scam skôr, než ťa dostane.'
WHERE slug = 'subenai-editorial'
  AND (display_name <> 'subenai editorial'
       OR bio <> 'Tím subenai píše o internetových podvodoch, digitálnej bezpečnosti a tom, ako rozpoznať scam skôr, než ťa dostane.');

INSERT INTO public.blog_categories (slug, name, sort_order, description) VALUES
  ('phishing-a-emaily',    'Phishing a emailové podvody',          10, 'Ako rozpoznať podvodné e-maily a chrániť svoje účty.'),
  ('sms-a-telefon',        'Scam SMS a telefonické podvody',       20, 'Podvodné SMS, vishing a deepfake hlasové útoky.'),
  ('fake-eshopy',          'Fake e-shopy a marketplace podvody',   30, 'Ako identifikovať podvodné obchody pred nákupom.'),
  ('socialne-siete',       'Sociálne siete a manipulácia',         40, 'Podvody na Facebooku, Instagrame a TikToku.'),
  ('ai-scamy',             'AI a moderné online podvody',          50, 'Deepfake, voice cloning a AI-generované scamy.'),
  ('digitalna-bezpecnost', 'Digitálna bezpečnosť pre bežných ľudí', 60, 'Heslá, 2FA, VPN a základné návyky online bezpečnosti.'),
  ('kvizy',                'Kvízy a interaktívne články',          70, 'Otestujte svoje schopnosti rozpoznať scam.'),
  ('pribehy',              'Príbehy reálnych podvodov',            80, 'Skutočné prípady scamov a poučenia z nich.'),
  ('rodicia-a-seniori',    'Bezpečnosť pre rodičov a seniorov',    90, 'Ako chrániť deti a starších rodinných príslušníkov online.'),
  ('psychologia',          'Psychológia podvodov',                100, 'Prečo nám manipulácia funguje a ako sa brániť.'),
  ('bezpecne-nakupovanie', 'Bezpečné nakupovanie online',         110, 'Sprievodca bezpečnými online nákupmi.'),
  ('cyber-hygiena',        'Cyber hygiene a návyky',              120, 'Každodenné návyky pre lepšiu online bezpečnosť.'),
  ('tech-explainers',      'Tech explainers jednoducho',          130, 'Bezpečnostné pojmy vysvetlené normálnym jazykom.'),
  ('news-a-trendy',        'News & aktuálne scam trendy',         140, 'Najnovšie podvodné kampane a trendy.'),
  ('studenti',             'Internet safety pre študentov',       150, 'Bezpečnosť na internete pre žiakov a študentov.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "blog_images_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_insert"  ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_update"  ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_delete"  ON storage.objects;

CREATE POLICY "blog_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "blog_images_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_images_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_images_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- E16.2 — sources_jsonb column on blog_posts (mirror of 20260520010000)
-- ============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS sources_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_sources_jsonb_is_array'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_sources_jsonb_is_array
      CHECK (jsonb_typeof(sources_jsonb) = 'array');
  END IF;
END;
$$;

-- ============================================================================
-- E17.1 — related_course_slug column on blog_posts (mirror of 20260520020000)
-- ============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS related_course_slug TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_related_course_slug_format'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_related_course_slug_format
      CHECK (related_course_slug IS NULL OR related_course_slug ~ '^[a-z0-9-]+$');
  END IF;
END;
$$;

-- ============================================================================
-- E25 Phase 3 — related_test_slug column on blog_posts (mirror of 20260521000000)
-- ============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS related_test_slug TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_related_test_slug_format'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_related_test_slug_format
      CHECK (related_test_slug IS NULL OR related_test_slug ~ '^[a-z0-9-]+$');
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_blog_posts_related_test_slug
  ON public.blog_posts (related_test_slug, published_at DESC)
  WHERE related_test_slug IS NOT NULL;

-- ============================================================================
-- HOTFIX 2026-05-20 — hash_test_set_password reapplied (P0 from /schools
-- contract test: prod /api/test-sets returned hash_failed because the
-- original 20260501000000_edu_mode.sql migration was missing or service_role
-- lost EXECUTE permission on the RPC). Idempotent. See
-- supabase/migrations/20260521100000_hash_test_set_password_prod_hotfix.sql.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.hash_test_set_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF password IS NULL OR length(password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

REVOKE ALL ON FUNCTION public.hash_test_set_password(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hash_test_set_password(TEXT) TO service_role;

DO $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := public.hash_test_set_password('hotfix-probe');
  IF v_hash IS NULL OR length(v_hash) < 50 OR v_hash NOT LIKE '$2%' THEN
    RAISE EXCEPTION 'hash_test_set_password smoke test failed: got %', v_hash;
  END IF;
END$$;

-- ============================================================================
-- E38 — Retention crons + auto-anonymisation (20260521120000, 20260521130000)
-- ============================================================================
-- Two new SECURITY DEFINER functions for the GitHub Actions daily
-- retention cron (`.github/workflows/retention-cron.yml`). pg_cron is
-- not used (Supabase Free tier doesn't have it). See tasks/E38-runbook.md.

CREATE OR REPLACE FUNCTION public.anonymize_expired_anticheat()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  touched_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.attempts
    SET
      flags = '[]'::jsonb,
      total_time_ms = NULL
    WHERE created_at < (now() - interval '12 months')
      AND (
        (flags IS NOT NULL AND flags <> '[]'::jsonb)
        OR total_time_ms IS NOT NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO touched_count FROM updated;
  RETURN touched_count;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_expired_anticheat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_expired_anticheat() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_anticheat() TO service_role;

CREATE OR REPLACE FUNCTION public.anonymize_expired_edu_respondents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  touched_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.attempts
    SET
      respondent_name = NULL,
      respondent_email = NULL
    WHERE created_at < (now() - interval '12 months')
      AND (respondent_name IS NOT NULL OR respondent_email IS NOT NULL)
    RETURNING 1
  )
  SELECT count(*) INTO touched_count FROM updated;
  RETURN touched_count;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_expired_edu_respondents() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_expired_edu_respondents() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_edu_respondents() TO service_role;

-- ============================================================================
-- E42 — GDPR Art. 15 + Art. 20 self-service export (20260521140000)
-- ============================================================================
-- SECURITY DEFINER RPC returning a JSON snapshot of every record we
-- hold under the calling user's auth.uid(). Anonymous callers are
-- rejected. Used by /api/account/export-data + DataExportCard UI.

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text;
  v_payload jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501', HINT = 'GDPR Art. 15 export requires an authenticated session';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;

  v_payload := jsonb_build_object(
    'generated_at', now(),
    'subject',      jsonb_build_object('user_id', v_user_id, 'email', v_email),
    'rights', jsonb_build_object(
      'access',      'GDPR Art. 15',
      'portability', 'GDPR Art. 20',
      'erasure',     'GDPR Art. 17 — see /app/account/profile for delete'
    ),
    'records', jsonb_build_object(
      'profile',
        COALESCE(
          (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_user_id),
          'null'::jsonb
        ),
      'dsr_requests',
        COALESCE(
          (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
             FROM public.dsr_requests d
             WHERE v_email IS NOT NULL AND d.requester_email = v_email),
          '[]'::jsonb
        ),
      'attempts_note',
        'Anonymous quiz attempts are not linked to your user account. '
        'Your share link (/r/<share_id>) is the access surface for those rows. '
        'Edu-mode attempts where you were the respondent are owned by the '
        'test author; exercise Art. 15 with them.'
    )
  );

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ============================================================================
-- E44.1 — Templates v2 ownership (mirror of 20260520210000_templates_v2_ownership.sql)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.template_visibility AS ENUM ('private', 'public', 'unlisted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_license AS ENUM ('cc-by-4.0');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_age_rating AS ENUM ('all', 'thirteen_plus', 'sixteen_plus', 'eighteen_plus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility public.template_visibility NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS fork_of uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.template_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS license public.template_license NOT NULL DEFAULT 'cc-by-4.0',
  ADD COLUMN IF NOT EXISTS author_display_name text,
  ADD COLUMN IF NOT EXISTS age_rating public.template_age_rating NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS templates_owner_visibility_idx
  ON public.templates (owner_id, visibility) WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS templates_public_published_idx
  ON public.templates (visibility, status) WHERE visibility = 'public' AND status = 'published';

CREATE INDEX IF NOT EXISTS templates_fork_of_idx
  ON public.templates (fork_of) WHERE fork_of IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS templates_touch_updated_at ON public.templates;
CREATE TRIGGER templates_touch_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_templates_updated_at();

-- Defense in depth on top of RLS: platform defaults (owner_id IS NULL) are
-- locked from non-admin writes even if a future policy regression widens
-- the surface. service_role bypass keeps cron jobs / admin server-fns
-- functional; admin role bypass keeps the moderation queue (Phase C) live.
CREATE OR REPLACE FUNCTION public.forbid_default_template_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Platform default templates (owner_id IS NULL) are read-only for non-admin callers';
END;
$$;

DROP TRIGGER IF EXISTS templates_forbid_default_mutation ON public.templates;
CREATE TRIGGER templates_forbid_default_mutation
  BEFORE UPDATE OR DELETE ON public.templates
  FOR EACH ROW WHEN (OLD.owner_id IS NULL)
  EXECUTE FUNCTION public.forbid_default_template_mutation();

DROP POLICY IF EXISTS templates_auth_read ON public.templates;
DROP POLICY IF EXISTS templates_admin_write ON public.templates;
DROP POLICY IF EXISTS templates_read_defaults ON public.templates;
DROP POLICY IF EXISTS templates_read_own ON public.templates;
DROP POLICY IF EXISTS templates_read_public_published ON public.templates;
DROP POLICY IF EXISTS templates_insert_own ON public.templates;
DROP POLICY IF EXISTS templates_update_own ON public.templates;
DROP POLICY IF EXISTS templates_delete_own ON public.templates;
DROP POLICY IF EXISTS templates_admin_all ON public.templates;

CREATE POLICY templates_read_defaults ON public.templates
  FOR SELECT TO authenticated USING (owner_id IS NULL);

CREATE POLICY templates_read_own ON public.templates
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY templates_read_public_published ON public.templates
  FOR SELECT TO authenticated USING (visibility = 'public' AND status = 'published');

CREATE POLICY templates_insert_own ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND visibility IN ('private', 'unlisted'));

CREATE POLICY templates_update_own ON public.templates
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND visibility IN ('private', 'unlisted'));

CREATE POLICY templates_delete_own ON public.templates
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY templates_admin_all ON public.templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- question_ids deliberately seeded empty: Phase A defaults are catalog rows;
-- users fork+edit to attach real questions. Avoids fragile uuid pinning to
-- the questions table from a schema migration.
INSERT INTO public.templates (
  id, title, description, question_ids, gdpr_purpose,
  visibility, status, slug, age_rating, published_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Onboarding kolegov',
   'Základná bezpečnostná hygiena pre nový tím.',
   ARRAY[]::uuid[], 'internal_training', 'public', 'published',
   'onboarding-kolegov', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'Phishing 101',
   'Najčastejšie útoky e-mailom a ako ich rozpoznať.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'phishing-101', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'SMS podvody',
   'Smishing scenáre pre širokú verejnosť.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'sms-podvody', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'Senior — základ',
   'Pre rodičov a starých rodičov: bezpečný internet od základov.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'senior-zaklad', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000005', 'HR recruitment screen',
   'Posúdenie security awareness uchádzača.',
   ARRAY[]::uuid[], 'recruitment', 'public', 'published',
   'hr-recruitment-screen', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'BEC — podvodný e-mail od šéfa',
   'Business Email Compromise: ako rozpoznať falošnú požiadavku CEO.',
   ARRAY[]::uuid[], 'internal_training', 'public', 'published',
   'bec-podvodny-email-od-sefa', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'Ransomware — prvá pomoc',
   'Čo robiť (a nerobiť) keď ti zašifrujú firemné dáta.',
   ARRAY[]::uuid[], 'internal_training', 'public', 'published',
   'ransomware-prva-pomoc', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'Sociálne inžinierstvo',
   'Manipulačné techniky útočníkov: telefón, e-mail, osobný kontakt.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'socialne-inzinierstvo', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000009', 'Hygiena hesiel a 2FA',
   'Silné heslá, manažér hesiel, dvojfaktorové overovanie v praxi.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'hygiena-hesiel-a-2fa', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000010', 'Smishing — pokročilý',
   'SMS phishing pre IT a bezpečnostné tímy: detailné scenáre.',
   ARRAY[]::uuid[], 'internal_training', 'public', 'published',
   'smishing-pokrocily', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000011', 'Vishing — telefonické podvody',
   'Voice phishing: falošní bankári, polícia, technická podpora.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'vishing-telefonicke-podvody', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000012', 'Deepfake a AI podvody',
   'Falošné videá, klonované hlasy a ako ich rozoznať.',
   ARRAY[]::uuid[], 'research', 'public', 'published',
   'deepfake-a-ai-podvody', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000013', 'Romance scam',
   'Citové podvody na zoznamkách a sociálnych sieťach.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'romance-scam', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000014', 'Investičné podvody',
   'Falošné investičné platformy, krypto scamy, pump-and-dump.',
   ARRAY[]::uuid[], 'education', 'public', 'published',
   'investicne-podvody', 'all', now(), now()),
  ('00000000-0000-4000-8000-000000000015', 'Phishing pre účtáreň',
   'Falošné faktúry, zmeny bankového účtu, podvodné dodávateľské e-maily.',
   ARRAY[]::uuid[], 'internal_training', 'public', 'published',
   'phishing-pre-uctaren', 'all', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- E44.6 — Template submissions (mirror of 20260521150000_template_submissions.sql)
-- ============================================================================

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
  author_display_name text NOT NULL,
  age_rating_declared public.template_age_rating NOT NULL,
  license public.template_license NOT NULL DEFAULT 'cc-by-4.0',
  status public.template_submission_status NOT NULL DEFAULT 'pending',
  precheck jsonb,
  precheck_passed boolean,
  precheck_at timestamptz,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.template_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS template_submissions_template_idx
  ON public.template_submissions (template_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS template_submissions_author_idx
  ON public.template_submissions (author_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS template_submissions_admin_queue_idx
  ON public.template_submissions (status, submitted_at)
  WHERE status = 'pending';

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

DROP POLICY IF EXISTS template_submissions_author_read ON public.template_submissions;
CREATE POLICY template_submissions_author_read ON public.template_submissions
  FOR SELECT TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS template_submissions_author_insert ON public.template_submissions;
CREATE POLICY template_submissions_author_insert ON public.template_submissions
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS template_submissions_author_withdraw ON public.template_submissions;
CREATE POLICY template_submissions_author_withdraw ON public.template_submissions
  FOR UPDATE TO authenticated
    USING (author_id = auth.uid() AND status = 'pending')
    WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS template_submissions_admin_all ON public.template_submissions;
CREATE POLICY template_submissions_admin_all ON public.template_submissions
  FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 20260521200000_dpa_requests.sql (E40.1)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.dpa_requests (
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

CREATE INDEX IF NOT EXISTS dpa_requests_created_at_idx
  ON public.dpa_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS dpa_requests_school_name_trgm_idx
  ON public.dpa_requests USING gin (school_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS dpa_requests_status_idx
  ON public.dpa_requests (status)
  WHERE status <> 'cancelled';

DROP POLICY IF EXISTS dpa_requests_admin_read ON public.dpa_requests;
CREATE POLICY dpa_requests_admin_read ON public.dpa_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS dpa_requests_admin_update ON public.dpa_requests;
CREATE POLICY dpa_requests_admin_update ON public.dpa_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

-- ============================================================================
-- 20260521230000_admin_user_data_rpcs.sql (E46.1)
-- ============================================================================
-- pending_erasures + 4 RPCs (export_user_data_admin, erase_user_data,
-- cancel_pending_erasure, assert_no_active_sponsorship). Admin GDPR
-- fulfilment engine. See tasks/PLAN-2026-05-21-E46-admin-user-data-manager.md.

CREATE TABLE IF NOT EXISTS public.pending_erasures (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy       text NOT NULL CHECK (strategy IN ('hard_delete')),
  execute_at     timestamptz NOT NULL,
  initiated_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  audit_log_id   uuid,
  pre_delete_snapshot jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_erasures ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pending_erasures_execute_at_idx
  ON public.pending_erasures (execute_at);

DROP POLICY IF EXISTS pending_erasures_admin_read ON public.pending_erasures;
CREATE POLICY pending_erasures_admin_read ON public.pending_erasures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.export_user_data_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_email    text;
  v_payload  jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
  END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  v_payload := jsonb_build_object(
    'generated_at', now(),
    'generated_by', v_caller,
    'subject', jsonb_build_object('user_id', p_user_id, 'email', v_email),
    'rights', jsonb_build_object(
      'access', 'GDPR Art. 15',
      'portability', 'GDPR Art. 20',
      'erasure', 'GDPR Art. 17',
      'rectification', 'GDPR Art. 16'
    ),
    'records', jsonb_build_object(
      'profile', COALESCE((SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = p_user_id), 'null'::jsonb),
      'profile_preferences', COALESCE((SELECT to_jsonb(pp) FROM public.profile_preferences pp WHERE pp.user_id = p_user_id), 'null'::jsonb),
      'user_roles', COALESCE((SELECT jsonb_agg(to_jsonb(ur) ORDER BY ur.role) FROM public.user_roles ur WHERE ur.user_id = p_user_id), '[]'::jsonb),
      'dsr_requests', COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC) FROM public.dsr_requests d WHERE v_email IS NOT NULL AND d.requester_email = v_email), '[]'::jsonb),
      'dpa_requests', COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC) FROM public.dpa_requests d WHERE v_email IS NOT NULL AND d.contact_email = v_email), '[]'::jsonb),
      'pending_erasure', COALESCE((SELECT to_jsonb(pe) FROM public.pending_erasures pe WHERE pe.user_id = p_user_id), 'null'::jsonb)
    )
  );
  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.export_user_data_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_user_data_admin(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_no_active_sponsorship(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO v_count
    FROM public.subscriptions s
    JOIN public.sponsors sp ON sp.id = s.sponsor_id
    WHERE s.cancelled_at IS NULL
      AND s.status = 'active'
      AND (sp.display_name = v_email OR sp.display_message ILIKE '%' || v_email || '%');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'stripe_subscription_active: % active sponsorship(s) found', v_count
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_no_active_sponsorship(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_no_active_sponsorship(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_no_active_sponsorship(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.erase_user_data(p_user_id uuid, p_strategy text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_target_email  text;
  v_execute_at    timestamptz;
  v_snapshot      jsonb;
  v_n_profiles    integer := 0;
  v_n_dsr         integer := 0;
  v_n_dpa         integer := 0;
  v_n_attempts    integer := 0;
  v_n_respondents integer := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023'; END IF;
  IF p_strategy NOT IN ('anonymize', 'hard_delete') THEN
    RAISE EXCEPTION 'invalid_strategy: %', p_strategy USING ERRCODE = '22023';
  END IF;
  IF p_user_id = v_caller THEN
    RAISE EXCEPTION 'cannot_target_self' USING ERRCODE = 'P0001';
  END IF;
  PERFORM public.assert_no_active_sponsorship(p_user_id);
  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_user_id;
  IF p_strategy = 'anonymize' THEN
    UPDATE public.profiles SET email = NULL, display_name = NULL, avatar_initials = NULL WHERE id = p_user_id;
    GET DIAGNOSTICS v_n_profiles = ROW_COUNT;
    IF v_target_email IS NOT NULL THEN
      UPDATE public.dsr_requests SET requester_email = NULL, note = NULL WHERE requester_email = v_target_email;
      GET DIAGNOSTICS v_n_dsr = ROW_COUNT;
      UPDATE public.dpa_requests SET contact_email = NULL, contact_name = NULL, anonymized_at = COALESCE(anonymized_at, now()) WHERE contact_email = v_target_email;
      GET DIAGNOSTICS v_n_dpa = ROW_COUNT;
    END IF;
    UPDATE public.attempts SET respondent_email = NULL, respondent_name = NULL
      WHERE respondent_email = v_target_email
         OR (respondent_name IS NOT NULL AND v_target_email IS NOT NULL AND respondent_email IS NULL);
    GET DIAGNOSTICS v_n_attempts = ROW_COUNT;
    UPDATE public.respondents SET email = NULL, display_name = NULL WHERE email = v_target_email;
    GET DIAGNOSTICS v_n_respondents = ROW_COUNT;
    RETURN jsonb_build_object(
      'strategy', 'anonymize',
      'executed_at', now(),
      'rows_affected', jsonb_build_object(
        'profiles', v_n_profiles, 'dsr_requests', v_n_dsr,
        'dpa_requests', v_n_dpa, 'attempts', v_n_attempts, 'respondents', v_n_respondents
      )
    );
  END IF;
  v_snapshot := public.export_user_data_admin(p_user_id);
  v_execute_at := now() + interval '5 minutes';
  INSERT INTO public.pending_erasures (user_id, strategy, execute_at, initiated_by, pre_delete_snapshot)
  VALUES (p_user_id, 'hard_delete', v_execute_at, v_caller, v_snapshot)
  ON CONFLICT (user_id) DO UPDATE
    SET execute_at = EXCLUDED.execute_at, initiated_by = EXCLUDED.initiated_by,
        pre_delete_snapshot = EXCLUDED.pre_delete_snapshot, created_at = now();
  RETURN jsonb_build_object(
    'strategy', 'hard_delete', 'enqueued_at', now(),
    'execute_at', v_execute_at, 'grace_window_minutes', 5
  );
END;
$$;

REVOKE ALL ON FUNCTION public.erase_user_data(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erase_user_data(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_user_data(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_pending_erasure(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.pending_erasures WHERE user_id = p_user_id AND execute_at > now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_erasure(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_pending_erasure(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_erasure(uuid) TO authenticated;

-- ============================================================================
-- 20260521210000_test_question_order_mode.sql (E45.1)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_question_order_mode') THEN
    CREATE TYPE public.test_question_order_mode AS ENUM ('fixed', 'random');
  END IF;
END$$;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS question_order_mode public.test_question_order_mode
    NOT NULL DEFAULT 'fixed';

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS source_template_id UUID
    REFERENCES public.templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tests_source_template_id_idx
  ON public.tests (source_template_id)
  WHERE source_template_id IS NOT NULL;

-- ============================================================================
-- 20260521220000_test_password_v2.sql (E45 Phase 2 — password gate)
-- ============================================================================

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS password_hash_version INT NOT NULL DEFAULT 0;

UPDATE public.tests
  SET password_hash_version = 1
  WHERE password_hash IS NOT NULL
    AND password_hash_version = 0;

DROP FUNCTION IF EXISTS public.hash_test_password(UUID, TEXT);

CREATE FUNCTION public.hash_test_password(test_id UUID, password TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _owner UUID;
  _old_hash TEXT;
  _new_hash TEXT;
  _new_pv INT;
  _op TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF test_id IS NULL OR password IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;
  IF length(password) < 8 THEN
    RAISE EXCEPTION 'password_too_short';
  END IF;
  IF length(password) > 256 THEN
    RAISE EXCEPTION 'password_too_long';
  END IF;

  SELECT owner_id, password_hash INTO _owner, _old_hash
    FROM public.tests
    WHERE id = test_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  _new_hash := crypt(password, gen_salt('bf', 10));
  IF substr(_new_hash, 1, 4) NOT IN ('$2a$', '$2b$', '$2y$') THEN
    RAISE EXCEPTION 'unexpected_hash_prefix';
  END IF;

  UPDATE public.tests
    SET password_hash = _new_hash,
        password_hash_version = password_hash_version + 1,
        updated_at = now()
    WHERE id = test_id
    RETURNING password_hash_version INTO _new_pv;

  _op := CASE WHEN _old_hash IS NULL THEN 'set' ELSE 'change' END;

  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
    VALUES (
      auth.uid(),
      'template_password_set',
      'test',
      test_id::text,
      false,
      jsonb_build_object('op', _op, 'pv', _new_pv)
    );

  RETURN _new_pv;
END;
$$;

REVOKE ALL ON FUNCTION public.hash_test_password(UUID, TEXT) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.clear_test_password(UUID);

CREATE FUNCTION public.clear_test_password(test_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _owner UUID;
  _new_pv INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF test_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  SELECT owner_id INTO _owner
    FROM public.tests
    WHERE id = test_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  UPDATE public.tests
    SET password_hash = NULL,
        password_hash_version = password_hash_version + 1,
        updated_at = now()
    WHERE id = test_id
    RETURNING password_hash_version INTO _new_pv;

  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
    VALUES (
      auth.uid(),
      'template_password_set',
      'test',
      test_id::text,
      false,
      jsonb_build_object('op', 'clear', 'pv', _new_pv)
    );

  RETURN _new_pv;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_test_password(UUID) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.verify_test_password(TEXT, TEXT);

CREATE FUNCTION public.verify_test_password(p_share_id TEXT, p_password TEXT)
RETURNS TABLE (verified BOOLEAN, current_pv INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash TEXT;
  _pv INT;
BEGIN
  IF p_share_id IS NULL OR p_password IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;
  IF length(p_password) > 256 THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  SELECT password_hash, password_hash_version
    INTO _hash, _pv
    FROM public.tests
    WHERE share_id = p_share_id;

  IF _hash IS NULL THEN
    RETURN QUERY SELECT false, COALESCE(_pv, 0);
    RETURN;
  END IF;

  RETURN QUERY SELECT crypt(p_password, _hash) = _hash, _pv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_test_password(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 20260521230000_test_question_modified_audit.sql (E45 security review §L1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_test_question_modified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _op TEXT;
  _question_id UUID;
  _test_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _op := 'add';
    _question_id := NEW.question_id;
    _test_id := NEW.test_id;
  ELSIF TG_OP = 'DELETE' THEN
    _op := 'remove';
    _question_id := OLD.question_id;
    _test_id := OLD.test_id;
  ELSE
    _op := 'update';
    _question_id := NEW.question_id;
    _test_id := NEW.test_id;
  END IF;

  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
    VALUES (
      auth.uid(),
      'test_question_modified',
      'test',
      _test_id::text,
      false,
      jsonb_build_object('op', _op, 'question_id', _question_id::text)
    );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_test_question_modified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS test_questions_modified_audit ON public.test_questions;
CREATE TRIGGER test_questions_modified_audit
  AFTER INSERT OR DELETE OR UPDATE
  ON public.test_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_test_question_modified();

-- ============================================================================
-- Verification — run after the script completes
-- ============================================================================
SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as public_tables,
  (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace) as public_functions,
  (SELECT count(*) FROM pg_policy) as policies,
  (SELECT count(*) FROM public.questions) as seeded_questions;
-- Expected (approximate):
--   public_tables ≈ 50+
--   public_functions ≈ 15+ (has_role, is_team_member, is_team_owner,
--     log_audit_event, start_respondent_session, submit_respondent_answer,
--     finalize_respondent_session, get_quick_test_questions,
--     generate_mfa_backup_codes, consume_mfa_backup_code, handle_new_user, ...)
--   policies ≈ 70+
--   seeded_questions = 238
