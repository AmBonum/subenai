-- Phase 5 of /app redesign — course recommendations triggered after a
-- respondent scores poorly on a topic. Educator sees a dashboard card
-- with "send this 5-minute course to {respondent_name}".
--
-- Schema adaptations vs. the original plan:
--  * `trainings` has `topic_slug` (not `branch_slug`); we match against it.
--  * `trainings` lacks `slug` + `estimated_minutes` — added here so the
--    /app/recommendations route can deep-link to /courses/{slug} and render
--    the "5-minute course" label without joining additional metadata.
--  * `session_answers` carries `is_correct` (boolean), not a `score` numeric;
--    the generator derives a percentage score per (educator, branch) from
--    AVG(is_correct::int) * 100. `branch_slug` lives on `questions`, so we
--    join through it.
--  * `trainings` RLS uses `has_role(uid, 'admin')` (no recursion risk vs.
--    course_recommendations); generator runs SECURITY DEFINER anyway.

-- ---------------------------------------------------------------------------
-- Schema add-ons to `trainings` so recommendations can link & label.
-- ---------------------------------------------------------------------------
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS slug              text,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

CREATE UNIQUE INDEX IF NOT EXISTS trainings_slug_unique_idx
  ON public.trainings (slug)
  WHERE slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- course_recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_id   uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  reason_key    text NOT NULL CHECK (reason_key IN ('low_score_branch', 'new_content', 'peer_popular')),
  score_at_rec  numeric(5,2),       -- educator's audience score in the branch (0-100)
  branch_slug   text,               -- topic/branch the recommendation targets
  dismissed_at  timestamptz,
  clicked_at    timestamptz,
  sent_at       timestamptz,        -- when educator forwarded the course to a respondent
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
-- INSERT: service-role only (Edge Function or pg_cron); no policy needed.

GRANT SELECT, UPDATE ON public.course_recommendations TO authenticated;

-- ===========================================================================
-- Generator function — finds branches where the educator's audience scored
-- poorly, then recommends a matching training. Runs nightly (or on demand).
-- Signal-gated (≤50% AND ≥1 answer per branch) + idempotent via ON CONFLICT.
-- ===========================================================================
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
    t.owner_id                                                       AS user_id,
    tr.id                                                            AS training_id,
    'low_score_branch'                                               AS reason_key,
    ROUND((AVG(sa.is_correct::int) * 100.0)::numeric, 2)              AS score_at_rec,
    q.branch_slug                                                    AS branch_slug
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

-- pg_cron schedule (commented out per AH-1.8 convention; activate manually
-- in prod once verified end-to-end).
-- SELECT cron.schedule(
--   'generate-course-recommendations',
--   '0 3 * * *',  -- daily 03:00 UTC
--   $$ SELECT public.generate_course_recommendations(); $$
-- );
