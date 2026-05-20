-- E38.2 — 12-month edu mode auto-anonymisation.
--
-- `/privacy` s8 declares: "Doba uchovávania: 12 mesiacov od vytvorenia
-- záznamu, potom automaticky meno a e-mail anonymizujeme (skóre +
-- odpovede zostávajú pre štatistiku autora)."
--
-- The edu PII lives on `attempts.respondent_name` + `.respondent_email`,
-- added by `20260501000000_edu_mode.sql`. Non-edu rows have both
-- columns NULL by default. This function sets BOTH to NULL on edu
-- rows older than 12 months, preserving everything else (score,
-- answers, share_id) so the author dashboard keeps working.
--
-- Called daily by the GitHub Actions retention-cron workflow.

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

COMMENT ON FUNCTION public.anonymize_expired_edu_respondents() IS
  'E38.2 — NULL respondent_name + respondent_email on attempts older '
  'than 12 months. Called daily by the GH Actions retention-cron '
  'workflow. Preserves final_score, share_id, breakdown, answers.';
