-- Phase 3 of /app redesign — educator onboarding preferences.
-- D4-approved: separate table instead of jsonb column on profiles.

CREATE TABLE IF NOT EXISTS public.profile_preferences (
  user_id            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  audience_kind      text,                  -- 'class' | 'colleagues' | 'clients' | 'other' (nullable: skipped)
  scam_interests     text[] DEFAULT '{}',   -- ['phishing', 'voice_clone', 'marketplace', ...]
  digest_cadence     text DEFAULT 'weekly', -- 'weekly' | 'monthly' | 'off'
  digest_quiet_weeks boolean DEFAULT false, -- send digest even when no signal?
  onboarded_at       timestamptz,           -- NULL until onboarding flow completes
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Check constraints
ALTER TABLE public.profile_preferences
  ADD CONSTRAINT profile_prefs_audience_kind_check
  CHECK (audience_kind IS NULL OR audience_kind IN ('class', 'colleagues', 'clients', 'other'));

ALTER TABLE public.profile_preferences
  ADD CONSTRAINT profile_prefs_digest_cadence_check
  CHECK (digest_cadence IN ('weekly', 'monthly', 'off'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_profile_preferences()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER profile_preferences_touch
  BEFORE UPDATE ON public.profile_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_profile_preferences();

-- RLS: owner-only read/write
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
