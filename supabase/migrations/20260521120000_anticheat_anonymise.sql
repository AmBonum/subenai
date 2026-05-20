-- E38.1 — 12-month anti-cheat anonymisation.
--
-- `/privacy` s3 declares anti-cheat data retention of 12 months on the
-- legal basis of Art. 6(1)(f) (legitimate interest). The anti-cheat
-- payload lives inline in `attempts.flags` (JSONB) and
-- `attempts.total_time_ms`. Today there is no schedule that erases it
-- after 12 months — it rides with the 36-month `purge_expired_attempts`,
-- which means the actual retention is 3× the claim.
--
-- This function anonymises (NULL / empty) the anti-cheat columns on
-- attempts older than 12 months WITHOUT deleting the row. The score,
-- breakdown, personality, and percentile remain so the leaderboard
-- and share-link review continue to work; only the per-question
-- timing and flag payload is purged.
--
-- Called daily by the GitHub Actions retention-cron workflow
-- (`.github/workflows/retention-cron.yml`, E38.3) — pg_cron is not
-- available on Supabase Free tier.

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

-- Lock down. Only the service-role (used by the GH Actions cron) calls
-- this. PUBLIC / anon / authenticated have no business invoking it.
REVOKE ALL ON FUNCTION public.anonymize_expired_anticheat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_expired_anticheat() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_anticheat() TO service_role;

COMMENT ON FUNCTION public.anonymize_expired_anticheat() IS
  'E38.1 — NULL anti-cheat columns on attempts older than 12 months. '
  'Called daily by the GH Actions retention-cron workflow. '
  'Preserves score / breakdown / percentile (those remain on the row).';
