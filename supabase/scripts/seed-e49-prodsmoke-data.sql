-- ============================================================================
-- E49 Phase 1c-4 — prod-smoke canary data
-- ============================================================================
--
-- Provisions ONE published test + 3 questions + 3 sessions + 6 session_answers
-- owned by TU-A (e2e-e49-educator-a@subenai.test, id `e2e00001-e49a-4001-8001-
-- 0000aaaaaa01`) on PRODUCTION Supabase, so the post-merge prod-smoke
-- workflow can drive `/app/tests/*` end-to-end against the real CF Pages
-- bundle without a manual UI-seed step.
--
-- Idempotent: re-running `ON CONFLICT`-merges. Safe to paste verbatim into
-- the Supabase dashboard SQL editor.
--
-- ID convention (so teardown can `LIKE 'e2e-e49-prodsmoke-%'` cleanly):
--   - text PKs (`tests.slug`, `tests.share_id`) use the literal prefix
--     `e2e-e49-prodsmoke-`.
--   - uuid PKs (`tests.id`, `sessions.id`, `questions.id`,
--     `session_answers.session_id+question_id`) use the deterministic
--     `e2e00001-e49a-4001-8001-*` namespace shared with `e49-fixtures.ts`,
--     where the suffix carries a `cab` ("canary") tag so they never
--     collide with the live-integration fixtures. All 12 suffix chars
--     are valid hex per the uuid type constraint.
--
-- Teardown (also the body of the GitHub Actions teardown step):
--   BEGIN;
--   DELETE FROM public.session_answers
--    WHERE session_id IN (SELECT id FROM public.sessions WHERE test_id IN (
--      SELECT id FROM public.tests WHERE slug LIKE 'e2e-e49-prodsmoke-%'));
--   DELETE FROM public.sessions
--    WHERE test_id IN (SELECT id FROM public.tests WHERE slug LIKE 'e2e-e49-prodsmoke-%');
--   DELETE FROM public.test_questions
--    WHERE test_id IN (SELECT id FROM public.tests WHERE slug LIKE 'e2e-e49-prodsmoke-%');
--   DELETE FROM public.tests   WHERE slug   LIKE 'e2e-e49-prodsmoke-%';
--   DELETE FROM public.questions WHERE prompt LIKE 'E49 prod-smoke %';
--   COMMIT;
--
-- IMPORTANT: never touch audit-bot@subenai.test or any non-`e2e-e49-prodsmoke-*`
-- row. The DELETEs above are scoped to the prefix.

BEGIN;

-- 1. Questions — 3 published canaries with deterministic IDs.
INSERT INTO public.questions (id, type, prompt, options, correct, status, created_at)
VALUES
  (
    'e2e00001-e49a-4001-8001-7e57cab00501'::uuid,
    'single_choice',
    'E49 prod-smoke Q1',
    '["a", "b", "c"]'::jsonb,
    '["a"]'::jsonb,
    'published',
    now()
  ),
  (
    'e2e00001-e49a-4001-8001-7e57cab00502'::uuid,
    'single_choice',
    'E49 prod-smoke Q2',
    '["a", "b", "c"]'::jsonb,
    '["b"]'::jsonb,
    'published',
    now()
  ),
  (
    'e2e00001-e49a-4001-8001-7e57cab00503'::uuid,
    'single_choice',
    'E49 prod-smoke Q3',
    '["a", "b", "c"]'::jsonb,
    '["c"]'::jsonb,
    'published',
    now()
  )
ON CONFLICT (id) DO UPDATE
  SET prompt  = EXCLUDED.prompt,
      options = EXCLUDED.options,
      correct = EXCLUDED.correct,
      status  = EXCLUDED.status;

-- 2. The canary test — owned by TU-A, status = published.
INSERT INTO public.tests (
  id,
  slug,
  share_id,
  owner_id,
  title,
  description,
  status,
  version,
  segmentation,
  gdpr_purpose,
  intake_fields,
  branches,
  notif_config,
  published_at,
  created_at,
  updated_at
)
VALUES (
  'e2e00001-e49a-4001-8001-7e57cab00500'::uuid,
  'e2e-e49-prodsmoke-canary',
  'e2e-e49-prodsmoke-canary',
  'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
  'E49 prod-smoke canary',
  'Automated post-merge smoke canary. Do not delete manually — managed by '
    || 'the e49-prod-smoke GitHub Actions workflow.',
  'published',
  1,
  '{}',
  'research',
  '{}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
  SET title        = EXCLUDED.title,
      description  = EXCLUDED.description,
      status       = EXCLUDED.status,
      share_id     = EXCLUDED.share_id,
      slug         = EXCLUDED.slug,
      published_at = COALESCE(public.tests.published_at, EXCLUDED.published_at),
      updated_at   = now();

-- 3. test_questions — bind 3 questions to the canary.
INSERT INTO public.test_questions (test_id, question_id, position)
VALUES
  ('e2e00001-e49a-4001-8001-7e57cab00500'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00501'::uuid, 0),
  ('e2e00001-e49a-4001-8001-7e57cab00500'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00502'::uuid, 1),
  ('e2e00001-e49a-4001-8001-7e57cab00500'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00503'::uuid, 2)
ON CONFLICT (test_id, question_id) DO UPDATE
  SET position = EXCLUDED.position;

-- 4. Sessions — 1 completed named, 1 completed anonymous, 1 in_progress.
INSERT INTO public.sessions (
  id, test_id, version, intake_data, consent_given,
  started_at, finished_at, score, status, segment, ip_hash
)
VALUES
  (
    'e2e00001-e49a-4001-8001-5e55cab00501'::uuid,
    'e2e00001-e49a-4001-8001-7e57cab00500'::uuid,
    1,
    '{"name":"Prod Smoke Respondent","email":"prodsmoke@subenai.test"}'::jsonb,
    true,
    now() - interval '2 hours',
    now() - interval '1 hour 50 minutes',
    66.66,
    'completed',
    'prod-smoke',
    'e2e-e49-prodsmoke-iphash-001'
  ),
  (
    'e2e00001-e49a-4001-8001-5e55cab00502'::uuid,
    'e2e00001-e49a-4001-8001-7e57cab00500'::uuid,
    1,
    '{}'::jsonb,
    true,
    now() - interval '3 hours',
    now() - interval '2 hours 50 minutes',
    33.33,
    'completed',
    'prod-smoke',
    'e2e-e49-prodsmoke-iphash-002'
  ),
  (
    'e2e00001-e49a-4001-8001-5e55cab00503'::uuid,
    'e2e00001-e49a-4001-8001-7e57cab00500'::uuid,
    1,
    '{"name":"Prod Smoke In Progress"}'::jsonb,
    true,
    now() - interval '15 minutes',
    NULL,
    NULL,
    'in_progress',
    'prod-smoke',
    'e2e-e49-prodsmoke-iphash-003'
  )
ON CONFLICT (id) DO UPDATE
  SET intake_data = EXCLUDED.intake_data,
      status      = EXCLUDED.status,
      score       = EXCLUDED.score,
      started_at  = EXCLUDED.started_at,
      finished_at = EXCLUDED.finished_at,
      segment     = EXCLUDED.segment,
      ip_hash     = EXCLUDED.ip_hash;

-- 5. session_answers — 2 per completed session (4) + 2 partial for in_progress (6 total).
INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
VALUES
  ('e2e00001-e49a-4001-8001-5e55cab00501'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00501'::uuid, 'a', true,  3200),
  ('e2e00001-e49a-4001-8001-5e55cab00501'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00502'::uuid, 'a', false, 4100),
  ('e2e00001-e49a-4001-8001-5e55cab00502'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00501'::uuid, 'a', true,  5000),
  ('e2e00001-e49a-4001-8001-5e55cab00502'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00503'::uuid, 'a', false, 6000),
  ('e2e00001-e49a-4001-8001-5e55cab00503'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00501'::uuid, 'a', true,  2500),
  ('e2e00001-e49a-4001-8001-5e55cab00503'::uuid, 'e2e00001-e49a-4001-8001-7e57cab00502'::uuid, 'b', true,  3100)
ON CONFLICT (session_id, question_id) DO UPDATE
  SET value      = EXCLUDED.value,
      is_correct = EXCLUDED.is_correct,
      time_ms    = EXCLUDED.time_ms;

COMMIT;

-- ============================================================================
-- Verification (read-only)
-- ============================================================================
-- SELECT t.slug, t.title, t.status,
--        (SELECT count(*) FROM public.sessions s WHERE s.test_id = t.id)         AS sessions,
--        (SELECT count(*) FROM public.test_questions tq WHERE tq.test_id = t.id) AS questions
--   FROM public.tests t
--  WHERE t.slug LIKE 'e2e-e49-prodsmoke-%';
