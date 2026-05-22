-- ============================================================================
-- E49 Phase 1c — e2e data fixtures (questions, tests, sessions, answers).
-- ============================================================================
--
-- Runs ONLY after `supabase/scripts/seed-e49-e2e-users.sql` has provisioned
-- the four TU-* accounts. Wrapped in a single transaction so partial seeds
-- never leak. Re-runnable: every row uses ON CONFLICT DO UPDATE / DO NOTHING
-- to converge to canonical state.
--
-- ID convention (matches `e2e/fixtures/e49-fixtures.ts`):
--   e2e00001-e49a-4001-8001-<suffix>
--     suffix `0000aaaaaa01..04`  -> users (already provisioned)
--     suffix `00007e57####`      -> tests
--     suffix `0000ffff####`      -> questions
--     suffix `00005555####`      -> sessions (symbolic) + generated ranges
--     suffix `1a19e<hex7>`       -> large-test sessions, index hex-encoded
--     suffix `a9c<hex9>`         -> archived-test sessions, index hex-encoded
--
-- Cleanup: `e2e/scripts/seed-e49-data.ts --cleanup` (see file header). The
-- cleanup script `.in(...)`s the explicit id sets from `e49-fixtures.ts`
-- because Postgres uuid columns don't support LIKE.

BEGIN;

-- ---------------------------------------------------------------------------
-- Questions library
-- ---------------------------------------------------------------------------

INSERT INTO public.questions (id, type, prompt, correct, status, author_id)
VALUES
  ('e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'single',
   'E49 Q1 — single choice', '["a"]'::jsonb, 'published',
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid),
  ('e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 'multi',
   'E49 Q2 — multi choice', '["a","b"]'::jsonb, 'published',
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid),
  ('e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'single',
   'E49 Q3 — single choice', '["c"]'::jsonb, 'published',
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid),
  ('e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 'short_text',
   'E49 Q4 — short text (string correct)', '"Bratislava"'::jsonb, 'published',
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid),
  ('e2e00001-e49a-4001-8001-0000ffff0005'::uuid, 'long_text',
   'E49 Q5 — long text (no correct answer)', NULL, 'published',
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid)
ON CONFLICT (id) DO UPDATE
  SET prompt  = EXCLUDED.prompt,
      type    = EXCLUDED.type,
      correct = EXCLUDED.correct,
      status  = EXCLUDED.status;

-- ---------------------------------------------------------------------------
-- Tests — 7 owned by TU-A, 2 owned by TU-B (foreign / IDOR universe).
-- ---------------------------------------------------------------------------

INSERT INTO public.tests (id, owner_id, slug, share_id, title, status, password_hash, published_at)
VALUES
  ('e2e00001-e49a-4001-8001-00007e570001'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-empty-published',  'e2e-e49-empty-published',
   'E49 — prázdny test',       'published', NULL,
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e570002'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-typical-published','e2e-e49-typical-published',
   'E49 — typický test',       'published', NULL,
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e570003'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-pw-protected',     'e2e-e49-pw-protected',
   'E49 — chránený heslom',    'published',
   -- bcrypt hash of "e49-pw-do-not-reuse" generated offline (cost 10). The
   -- live-Supabase tests recompute against this fixture; do not rotate
   -- without updating `e49-fixtures.ts` accordingly.
   '$2b$10$Wp1Tz0R9bV4lQXFh9Q6.WuY6JZ3jXFEPGRlPjQwsCq6HnvAa3uX0u',
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e570004'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-large-published',  'e2e-e49-large-published',
   'E49 — veľký test',         'published', NULL,
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e570005'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-archived',         'e2e-e49-archived',
   'E49 — archivovaný',        'archived', NULL,
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e570006'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-draft-empty',      'e2e-e49-draft-empty',
   'E49 — koncept',            'draft', NULL, NULL),
  ('e2e00001-e49a-4001-8001-00007e570007'::uuid,
   'e2e00001-e49a-4001-8001-0000aaaaaa01'::uuid,
   'e2e-e49-with-xss',         'e2e-e49-with-xss',
   'E49 — XSS-payload respondent', 'published', NULL,
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e57b001'::uuid,
   'e2e00001-e49a-4001-8001-0000bbbbbb02'::uuid,
   'e2e-e49-foreign-published','e2e-e49-foreign-published',
   'E49 — cudzí test',         'published', NULL,
   '2026-05-18T00:00:00.000Z'),
  ('e2e00001-e49a-4001-8001-00007e57b002'::uuid,
   'e2e00001-e49a-4001-8001-0000bbbbbb02'::uuid,
   'e2e-e49-foreign-w-sess',   'e2e-e49-foreign-w-sess',
   'E49 — cudzí test so session-mi', 'published', NULL,
   '2026-05-18T00:00:00.000Z')
ON CONFLICT (id) DO UPDATE
  SET title        = EXCLUDED.title,
      status       = EXCLUDED.status,
      owner_id     = EXCLUDED.owner_id,
      published_at = EXCLUDED.published_at;

-- ---------------------------------------------------------------------------
-- test_questions linkage.
--   * empty-published : 5 questions
--   * typical         : 5 questions
--   * pw-protected    : 5 questions
--   * large           : 5 questions (50 stated in plan, but TC coverage only
--                       exercises pagination over sessions; we keep the
--                       question count at 5 to match the shared question
--                       library — pagination is sessions-driven, not
--                       questions-driven).
--   * archived        : 5 questions
--   * draft-empty     : 0 questions
--   * with-xss        : 3 questions (q1..q3)
--   * foreign-*       : 5 questions each
-- ---------------------------------------------------------------------------

INSERT INTO public.test_questions (test_id, question_id, position)
SELECT t.id, q.id, q.position
FROM (
  VALUES
    ('e2e00001-e49a-4001-8001-00007e570001'::uuid),
    ('e2e00001-e49a-4001-8001-00007e570002'::uuid),
    ('e2e00001-e49a-4001-8001-00007e570003'::uuid),
    ('e2e00001-e49a-4001-8001-00007e570004'::uuid),
    ('e2e00001-e49a-4001-8001-00007e570005'::uuid),
    ('e2e00001-e49a-4001-8001-00007e57b001'::uuid),
    ('e2e00001-e49a-4001-8001-00007e57b002'::uuid)
) AS t(id)
CROSS JOIN (
  VALUES
    ('e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 0),
    ('e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 1),
    ('e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 2),
    ('e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 3),
    ('e2e00001-e49a-4001-8001-0000ffff0005'::uuid, 4)
) AS q(id, position)
ON CONFLICT (test_id, question_id) DO NOTHING;

INSERT INTO public.test_questions (test_id, question_id, position)
VALUES
  ('e2e00001-e49a-4001-8001-00007e570007'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 0),
  ('e2e00001-e49a-4001-8001-00007e570007'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 1),
  ('e2e00001-e49a-4001-8001-00007e570007'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 2)
ON CONFLICT (test_id, question_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sessions under typicalPublished — identity-shape variety.
-- ---------------------------------------------------------------------------

INSERT INTO public.sessions (id, test_id, intake_data, consent_given, started_at, finished_at, score, status, ip_hash)
VALUES
  ('e2e00001-e49a-4001-8001-000055550001'::uuid,
   'e2e00001-e49a-4001-8001-00007e570002'::uuid,
   '{"name":"Jana Nováková","email":"jana.novakova@example.com"}'::jsonb,
   true, '2026-05-19T10:00:00.000Z', '2026-05-19T10:05:30.000Z',
   85, 'completed', 'ab12cd34ef56gh78ij90kl'),
  ('e2e00001-e49a-4001-8001-000055550002'::uuid,
   'e2e00001-e49a-4001-8001-00007e570002'::uuid,
   '{"email":"anon-email@example.com"}'::jsonb,
   true, '2026-05-19T10:00:00.000Z', '2026-05-19T10:03:15.000Z',
   60, 'completed', 'zz99yy88xx77ww66vv55uu'),
  ('e2e00001-e49a-4001-8001-000055550003'::uuid,
   'e2e00001-e49a-4001-8001-00007e570002'::uuid,
   '{}'::jsonb,
   true, '2026-05-19T10:00:00.000Z', '2026-05-19T10:08:42.000Z',
   40, 'completed', '11223344556677889900aa'),
  ('e2e00001-e49a-4001-8001-000055550004'::uuid,
   'e2e00001-e49a-4001-8001-00007e570002'::uuid,
   '{"name":"Peter In-Progress"}'::jsonb,
   true, '2026-05-19T10:00:00.000Z', NULL,
   NULL, 'in_progress', NULL),
  ('e2e00001-e49a-4001-8001-000055550005'::uuid,
   'e2e00001-e49a-4001-8001-00007e570002'::uuid,
   '{"name":"Marek Abandoned"}'::jsonb,
   true, '2026-05-19T10:00:00.000Z', NULL,
   NULL, 'abandoned', 'deadbeefdeadbeefdeadbe'),
  -- Password-protected test — single completed session.
  ('e2e00001-e49a-4001-8001-0000555599a1'::uuid,
   'e2e00001-e49a-4001-8001-00007e570003'::uuid,
   '{"name":"Pw Respondent","email":"pw@example.com"}'::jsonb,
   true, '2026-05-19T11:00:00.000Z', '2026-05-19T11:06:00.000Z',
   75, 'completed', 'aaaaaabbbbbbcccccc1111'),
  -- XSS battery — 6 representative payloads in intake_data.name.
  ('e2e00001-e49a-4001-8001-0000555599b1'::uuid,
   'e2e00001-e49a-4001-8001-00007e570007'::uuid,
   '{"name":"<script>alert(1)</script>"}'::jsonb,
   true, '2026-05-19T12:00:00.000Z', '2026-05-19T12:02:00.000Z',
   50, 'completed', 'xss00000000000000000001'),
  ('e2e00001-e49a-4001-8001-0000555599b2'::uuid,
   'e2e00001-e49a-4001-8001-00007e570007'::uuid,
   '{"name":"\"><img src=x onerror=alert(1)>"}'::jsonb,
   true, '2026-05-19T12:00:00.000Z', '2026-05-19T12:02:00.000Z',
   50, 'completed', 'xss00000000000000000002'),
  ('e2e00001-e49a-4001-8001-0000555599b3'::uuid,
   'e2e00001-e49a-4001-8001-00007e570007'::uuid,
   '{"name":"‮gnirts.lams"}'::jsonb,
   true, '2026-05-19T12:00:00.000Z', '2026-05-19T12:02:00.000Z',
   50, 'completed', 'xss00000000000000000003'),
  ('e2e00001-e49a-4001-8001-0000555599b4'::uuid,
   'e2e00001-e49a-4001-8001-00007e570007'::uuid,
   '{"name":"=cmd|''/c calc''!A1"}'::jsonb,
   true, '2026-05-19T12:00:00.000Z', '2026-05-19T12:02:00.000Z',
   50, 'completed', 'xss00000000000000000004'),
  ('e2e00001-e49a-4001-8001-0000555599b5'::uuid,
   'e2e00001-e49a-4001-8001-00007e570007'::uuid,
   '{"name":"+1+2"}'::jsonb,
   true, '2026-05-19T12:00:00.000Z', '2026-05-19T12:02:00.000Z',
   50, 'completed', 'xss00000000000000000005'),
  ('e2e00001-e49a-4001-8001-0000555599b6'::uuid,
   'e2e00001-e49a-4001-8001-00007e570007'::uuid,
   '{"name":"@SUM(A1:A10)"}'::jsonb,
   true, '2026-05-19T12:00:00.000Z', '2026-05-19T12:02:00.000Z',
   50, 'completed', 'xss00000000000000000006'),
  -- Foreign-with-sessions — single session under TU-B's test (IDOR target).
  ('e2e00001-e49a-4001-8001-00005555f001'::uuid,
   'e2e00001-e49a-4001-8001-00007e57b002'::uuid,
   '{"name":"Foreign respondent"}'::jsonb,
   true, '2026-05-19T10:00:00.000Z', '2026-05-19T10:05:00.000Z',
   99, 'completed', 'ffffffffffffffffffff00')
ON CONFLICT (id) DO UPDATE
  SET intake_data = EXCLUDED.intake_data,
      status      = EXCLUDED.status,
      score       = EXCLUDED.score,
      finished_at = EXCLUDED.finished_at,
      ip_hash     = EXCLUDED.ip_hash;

-- ---------------------------------------------------------------------------
-- Sessions under largePublished — 47 generated via generate_series.
-- Status cycles completed/completed/completed/in_progress; score = 10..95.
-- ---------------------------------------------------------------------------

INSERT INTO public.sessions (id, test_id, intake_data, consent_given, started_at, finished_at, score, status, ip_hash)
SELECT
  ('e2e00001-e49a-4001-8001-1a19e' || lpad(to_hex(g.i), 7, '0'))::uuid,
  'e2e00001-e49a-4001-8001-00007e570004'::uuid,
  jsonb_build_object('name', 'Large Respondent ' || g.i),
  true,
  (timestamptz '2026-05-19T08:00:00.000Z') + (g.i * interval '1 minute'),
  CASE WHEN g.i % 4 = 3 THEN NULL
       ELSE (timestamptz '2026-05-19T08:00:00.000Z') + (g.i * interval '1 minute') + interval '4 minutes'
  END,
  CASE WHEN g.i % 4 = 3 THEN NULL
       ELSE 10 + ((g.i * 7) % 86)
  END,
  CASE WHEN g.i % 4 = 3 THEN 'in_progress'::session_status
       ELSE 'completed'::session_status
  END,
  lpad(to_hex(g.i), 22, 'l')
FROM generate_series(1, 47) AS g(i)
ON CONFLICT (id) DO UPDATE
  SET status      = EXCLUDED.status,
      score       = EXCLUDED.score,
      finished_at = EXCLUDED.finished_at;

-- ---------------------------------------------------------------------------
-- Sessions under archived — 12 frozen completed sessions.
-- ---------------------------------------------------------------------------

INSERT INTO public.sessions (id, test_id, intake_data, consent_given, started_at, finished_at, score, status, ip_hash)
SELECT
  ('e2e00001-e49a-4001-8001-a9c' || lpad(to_hex(g.i), 9, '0'))::uuid,
  'e2e00001-e49a-4001-8001-00007e570005'::uuid,
  jsonb_build_object('name', 'Archived Respondent ' || g.i),
  true,
  (timestamptz '2026-04-19T08:00:00.000Z') + (g.i * interval '1 hour'),
  (timestamptz '2026-04-19T08:00:00.000Z') + (g.i * interval '1 hour') + interval '5 minutes',
  20 + (g.i * 5),
  'completed'::session_status,
  lpad(to_hex(g.i), 22, 'a')
FROM generate_series(1, 12) AS g(i)
ON CONFLICT (id) DO UPDATE
  SET score       = EXCLUDED.score,
      finished_at = EXCLUDED.finished_at;

-- ---------------------------------------------------------------------------
-- session_answers — a handful per completed session under typicalPublished
-- (covers correct + wrong markers), plus minimal coverage for the password
-- + foreign + archived + large fixtures so cleanup and inserts both exercise
-- the join path.
-- ---------------------------------------------------------------------------

-- Five answers for the named-completed session (mix of correct + wrong).
INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
VALUES
  ('e2e00001-e49a-4001-8001-000055550001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'a',  true,  4200),
  ('e2e00001-e49a-4001-8001-000055550001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 'a,b',true,  6100),
  ('e2e00001-e49a-4001-8001-000055550001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'd',  false, 8500),
  ('e2e00001-e49a-4001-8001-000055550001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 'Bratislava', true, 5200),
  ('e2e00001-e49a-4001-8001-000055550001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0005'::uuid, 'No correct answer expected', NULL, 9000),
  -- email-only completed: 5 answers, all wrong.
  ('e2e00001-e49a-4001-8001-000055550002'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'b', false, 3000),
  ('e2e00001-e49a-4001-8001-000055550002'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 'c', false, 3000),
  ('e2e00001-e49a-4001-8001-000055550002'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'a', false, 3000),
  ('e2e00001-e49a-4001-8001-000055550002'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 'Brno', false, 3000),
  ('e2e00001-e49a-4001-8001-000055550002'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0005'::uuid, 'free-text', NULL, 3000),
  -- anon completed: minimal 3 answers.
  ('e2e00001-e49a-4001-8001-000055550003'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'a', true, 4000),
  ('e2e00001-e49a-4001-8001-000055550003'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'c', true, 4000),
  ('e2e00001-e49a-4001-8001-000055550003'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 'Trnava', false, 4000),
  -- in-progress: 2 of 5 answered (one correct, one wrong) — NOT zero.
  ('e2e00001-e49a-4001-8001-000055550004'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'a', true,  5500),
  ('e2e00001-e49a-4001-8001-000055550004'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'a', false, 7200),
  -- abandoned: 0 answers (no rows).
  -- pw-protected: 5 answers, 3 correct.
  ('e2e00001-e49a-4001-8001-0000555599a1'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'a', true,  4500),
  ('e2e00001-e49a-4001-8001-0000555599a1'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 'a,b',true,  6500),
  ('e2e00001-e49a-4001-8001-0000555599a1'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'c', true,  5000),
  ('e2e00001-e49a-4001-8001-0000555599a1'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 'Kosice', false, 5500),
  ('e2e00001-e49a-4001-8001-0000555599a1'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0005'::uuid, 'open answer', NULL, 8000),
  -- foreign-with-sessions — 5 answers under TU-B's session (IDOR fixture).
  ('e2e00001-e49a-4001-8001-00005555f001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0001'::uuid, 'a', true,  4000),
  ('e2e00001-e49a-4001-8001-00005555f001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0002'::uuid, 'a,b',true,  4000),
  ('e2e00001-e49a-4001-8001-00005555f001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0003'::uuid, 'c', true,  4000),
  ('e2e00001-e49a-4001-8001-00005555f001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0004'::uuid, 'Bratislava', true, 4000),
  ('e2e00001-e49a-4001-8001-00005555f001'::uuid,
   'e2e00001-e49a-4001-8001-0000ffff0005'::uuid, 'foreign open', NULL, 4000)
ON CONFLICT (session_id, question_id) DO UPDATE
  SET value       = EXCLUDED.value,
      is_correct  = EXCLUDED.is_correct,
      time_ms     = EXCLUDED.time_ms;

-- XSS sessions: 3 answers each (q1..q3) to make the answers join non-empty.
INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
SELECT s.id, q.id, 'xss-answer', true, 3000
FROM (
  VALUES
    ('e2e00001-e49a-4001-8001-0000555599b1'::uuid),
    ('e2e00001-e49a-4001-8001-0000555599b2'::uuid),
    ('e2e00001-e49a-4001-8001-0000555599b3'::uuid),
    ('e2e00001-e49a-4001-8001-0000555599b4'::uuid),
    ('e2e00001-e49a-4001-8001-0000555599b5'::uuid),
    ('e2e00001-e49a-4001-8001-0000555599b6'::uuid)
) AS s(id)
CROSS JOIN (
  VALUES
    ('e2e00001-e49a-4001-8001-0000ffff0001'::uuid),
    ('e2e00001-e49a-4001-8001-0000ffff0002'::uuid),
    ('e2e00001-e49a-4001-8001-0000ffff0003'::uuid)
) AS q(id)
ON CONFLICT (session_id, question_id) DO NOTHING;

-- Light coverage for large + archived: q1 only, so cleanup exercises a few
-- session_answers rows in the bulk range but doesn't bloat to ~250 rows.
INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
SELECT
  ('e2e00001-e49a-4001-8001-1a19e' || lpad(to_hex(g.i), 7, '0'))::uuid,
  'e2e00001-e49a-4001-8001-0000ffff0001'::uuid,
  CASE WHEN g.i % 2 = 0 THEN 'a' ELSE 'b' END,
  CASE WHEN g.i % 2 = 0 THEN true ELSE false END,
  4000 + g.i
FROM generate_series(1, 47) AS g(i)
WHERE g.i % 4 <> 3  -- skip in_progress rows
ON CONFLICT (session_id, question_id) DO NOTHING;

INSERT INTO public.session_answers (session_id, question_id, value, is_correct, time_ms)
SELECT
  ('e2e00001-e49a-4001-8001-a9c' || lpad(to_hex(g.i), 9, '0'))::uuid,
  'e2e00001-e49a-4001-8001-0000ffff0001'::uuid,
  'a',
  true,
  4500
FROM generate_series(1, 12) AS g(i)
ON CONFLICT (session_id, question_id) DO NOTHING;

COMMIT;
