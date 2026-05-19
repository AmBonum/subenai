-- Phase 4 of /app redesign — weekly digest table + signal-gated generator.
-- D5: weekly cadence, only if at least one new session finished in the window.
-- D3: surfaces as a dashboard card; /app/digest route renders detail viewer.

CREATE TABLE IF NOT EXISTS public.user_digests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  stats         jsonb NOT NULL DEFAULT '{}',
  -- stats shape: {
  --   sessions_count, completion_rate, top_test_id, top_test_title,
  --   weakest_question_text, weakest_question_score, new_courses, retest_suggestions
  -- }
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
-- INSERT: service-role only (cron job); no policy.

GRANT SELECT, UPDATE ON public.user_digests TO authenticated;

-- ===========================================================================
-- Generator function — signal-gated, weekly.
-- Returns the number of inserted rows. Idempotent per (user_id, period_start)
-- via ON CONFLICT DO NOTHING, so the cron job can be retried safely.
-- ===========================================================================
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
  -- Per user with finished sessions in the window, compute stats + insert.
  -- The HAVING clause is the D5 signal gate (>=1 finished session).
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

  -- Fire a notification row so the bell badge picks the digest up.
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

-- pg_cron schedule (commented out per AH-1.8 convention; activate manually
-- in prod once verified end-to-end).
-- SELECT cron.schedule(
--   'generate-weekly-digests',
--   '0 6 * * 1',  -- Monday 06:00 UTC = 07:00 CET / 08:00 CEST
--   $$ SELECT public.generate_weekly_digests(); $$
-- );
