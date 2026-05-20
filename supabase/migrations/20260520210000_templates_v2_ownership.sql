-- E44.1 Phase A — ownership/visibility/license/age-rating rewrite of public.templates
-- + 15 platform-default seed rows + RLS rewrite (7 policies) + defense-in-depth triggers.

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

-- Self-check after applying:
--   SELECT count(*) FROM public.templates WHERE owner_id IS NULL; -- expect 15
--   SELECT polname FROM pg_policies WHERE tablename = 'templates' ORDER BY polname; -- expect 7
--   SELECT indexname FROM pg_indexes WHERE tablename = 'templates' ORDER BY indexname;
