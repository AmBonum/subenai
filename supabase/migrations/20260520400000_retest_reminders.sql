-- Phase 6 of /app redesign — retest reminders.
-- 90 days after a class completed a test, prompt the educator to resend
-- the same test and compare results. Frames retest as evidence of
-- teaching effectiveness — the educator's highest-leverage retention
-- motive (their impact, measured).
--
-- Schema adaptations vs. the original plan:
--  * `sessions` has a top-level numeric `score` (not a `summary` jsonb).
--    Audience-average score is computed via AVG(s.score) directly.
--  * `tests.owner_id` confirmed — used as the reminder owner.

CREATE TABLE IF NOT EXISTS public.retest_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id         uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  last_score      numeric(5,2),         -- audience avg score 0-100
  sessions_count  integer NOT NULL DEFAULT 0,
  last_session_at timestamptz NOT NULL,
  remind_after    date NOT NULL,         -- computed: last_session_at + 90 days
  dismissed_at    timestamptz,
  snoozed_until   date,
  retested_at     timestamptz,           -- educator clicked "Spustiť retest"
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
-- INSERT: service-role only (cron job)

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

-- ===========================================================================
-- Generator function — daily upsert based on each (educator, test)'s most
-- recent session. Idempotent via UNIQUE(user_id, test_id) + ON CONFLICT.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.refresh_retest_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- For every test owner with at least one completed session in the last
  -- 365 days, upsert a retest_reminders row computed from the test's most
  -- recent completed session.
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
    (last_session_at + interval '90 days')::date AS remind_after
  FROM last_sessions
  ON CONFLICT (user_id, test_id) DO UPDATE
  SET
    last_score      = EXCLUDED.last_score,
    sessions_count  = EXCLUDED.sessions_count,
    last_session_at = EXCLUDED.last_session_at,
    remind_after    = EXCLUDED.remind_after,
    -- DO NOT reset dismissed_at / retested_at / snoozed_until — educator's
    -- explicit signal must persist across regen.
    updated_at      = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.refresh_retest_reminders() TO service_role;

-- pg_cron schedule (commented out per AH-1.8 convention).
-- SELECT cron.schedule(
--   'refresh-retest-reminders',
--   '0 4 * * *',  -- daily 04:00 UTC
--   $$ SELECT public.refresh_retest_reminders(); $$
-- );
