-- Retention jobs move from the GitHub Actions cron (retention-cron.yml) into
-- pg_cron. The Actions job never had its SUPABASE_URL / service-role secrets,
-- so the three anonymisation RPCs below had not run since they shipped; the
-- /privacy retention promises depend on them. pg_cron runs inside Supabase:
-- no secrets leave the database and no Actions minutes are spent.
-- purge_expired_attempts is already scheduled (20260426110000).
DO $$
DECLARE
  job record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron is not enabled: retention jobs NOT scheduled. Enable it in Database -> Extensions and re-run this migration.';
    RETURN;
  END IF;

  FOR job IN
    SELECT * FROM (VALUES
      ('anonymize_expired_anticheat_daily', '41 3 * * *', 'SELECT public.anonymize_expired_anticheat();'),
      ('anonymize_expired_edu_respondents_daily', '47 3 * * *', 'SELECT public.anonymize_expired_edu_respondents();'),
      ('anonymize_expired_dpa_requests_daily', '53 3 * * *', 'SELECT public.anonymize_expired_dpa_requests();')
    ) AS t(name, schedule, command)
  LOOP
    PERFORM cron.unschedule(job.name) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = job.name);
    PERFORM cron.schedule(job.name, job.schedule, job.command);
  END LOOP;
END $$;
