-- Phase 7a of /app redesign — peer comparison card RPC.
--
-- Returns the educator's audience performance vs. an anonymous cohort
-- baseline. PII-safe: cohort reads ONLY from public.attempts_anon (a
-- view that already filters respondent_name IS NULL and omits the
-- respondent_name / respondent_email columns).
--
-- Schema adaptations vs. the original plan:
--   * cohort column is `final_score` (not `score`).
--   * cohort timestamp column is `created_at` (not `finished_at`).
--   * `sessions.score numeric(5,2)` (0..100) and `attempts_anon.final_score`
--     are both on the 0..100 scale, so a direct comparison is meaningful.
--
-- k-anonymity: cohort_size must be ≥ 10 before the function returns
-- any user-comparable numbers. Below the threshold the function still
-- returns shape, but `has_data = false` and `reason = insufficient_cohort`.

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

  -- No user data yet — return cohort-only baseline so the UI can show
  -- "this is what the average looks like; send a test to see your
  -- comparison".
  IF COALESCE(v_user_attempts, 0) = 0 THEN
    RETURN jsonb_build_object(
      'has_data', false,
      'reason', 'no_user_data',
      'cohort_avg', v_cohort_avg,
      'cohort_size', v_cohort_size
    );
  END IF;

  -- Approximate percentile: fraction of cohort attempts beaten by the
  -- user's audience-average score.
  SELECT ROUND(
    100.0 * COUNT(*) FILTER (WHERE final_score < v_user_score)
    / GREATEST(COUNT(*), 1)
  )::integer
  INTO v_user_percentile
  FROM public.attempts_anon
  WHERE created_at >= now() - interval '90 days'
    AND final_score IS NOT NULL;

  -- Top 3 branches by the user's audience score, with cohort comparison
  -- (cohort branch score = average is_correct across ALL session_answers
  -- for that branch, all-time — the cohort here is "everyone who has
  -- answered a question in this branch", not the public-quiz pool).
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
