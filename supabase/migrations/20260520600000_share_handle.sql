-- Phase 7b of /app redesign — optional pseudonym for shareable peer-card PNG.
-- Opt-in handle shown next to user's percentile stats on the generated image.
-- NULL = anonymous (default).

ALTER TABLE public.profile_preferences
  ADD COLUMN IF NOT EXISTS share_handle text;

ALTER TABLE public.profile_preferences
  ADD CONSTRAINT prefs_share_handle_check
  CHECK (share_handle IS NULL OR (length(share_handle) BETWEEN 2 AND 32));
