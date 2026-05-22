-- Reference only. Tests use tests/fixtures/seed-tickets.ts which builds these rows programmatically.
--
-- This file documents what the programmatic seed helper inserts. It is NOT
-- executed by CI or any test runner. Useful for manual inspection, schema
-- verification, or reconstructing rows in a local Supabase instance.
--
-- Worker isolation: each parallel Playwright worker uses a unique index N
-- so subjects are prefixed [E2E-SEED-WN]. Cleanup matches LIKE '[E2E-SEED-WN]%'.
--
-- Distribution per worker (20 rows total):
--   5x new          | categories rotate: bug, question, feature_request, billing, gdpr, other
--   5x in_progress  |
--   3x waiting_user |
--   4x resolved     |
--   2x reopened     |
--   1x archived     |
--
-- ~1/3 of rows have requester_name = NULL (anonymous submitters).
-- created_at is spread over the last 90 days (seq % 90 + 1 days ago).

-- Example for worker 0 (replace 0 with actual worker index):
INSERT INTO support_tickets (subject, status, category, requester_name, requester_email, body, created_at)
VALUES
  ('[E2E-SEED-W0] new 1 — bug',            'new',          'bug',             'Test User 1',  'seed-w0-1@example.test',  'Automated seed ticket #1 for worker 0. Status: new.',          NOW() - INTERVAL '2 days'),
  ('[E2E-SEED-W0] new 2 — question',       'new',          'question',        NULL,           'seed-w0-2@example.test',  'Automated seed ticket #2 for worker 0. Status: new.',          NOW() - INTERVAL '3 days'),
  ('[E2E-SEED-W0] new 3 — feature_request','new',          'feature_request', 'Test User 3',  'seed-w0-3@example.test',  'Automated seed ticket #3 for worker 0. Status: new.',          NOW() - INTERVAL '4 days'),
  ('[E2E-SEED-W0] new 4 — billing',        'new',          'billing',         'Test User 4',  'seed-w0-4@example.test',  'Automated seed ticket #4 for worker 0. Status: new.',          NOW() - INTERVAL '5 days'),
  ('[E2E-SEED-W0] new 5 — gdpr',           'new',          'gdpr',            NULL,           'seed-w0-5@example.test',  'Automated seed ticket #5 for worker 0. Status: new.',          NOW() - INTERVAL '6 days'),
  ('[E2E-SEED-W0] in_progress 1 — other',  'in_progress',  'other',           'Test User 6',  'seed-w0-6@example.test',  'Automated seed ticket #6 for worker 0. Status: in_progress.',  NOW() - INTERVAL '7 days'),
  ('[E2E-SEED-W0] in_progress 2 — bug',    'in_progress',  'bug',             'Test User 7',  'seed-w0-7@example.test',  'Automated seed ticket #7 for worker 0. Status: in_progress.',  NOW() - INTERVAL '8 days'),
  ('[E2E-SEED-W0] in_progress 3 — question','in_progress', 'question',        NULL,           'seed-w0-8@example.test',  'Automated seed ticket #8 for worker 0. Status: in_progress.',  NOW() - INTERVAL '9 days'),
  ('[E2E-SEED-W0] in_progress 4 — feature_request','in_progress','feature_request','Test User 9','seed-w0-9@example.test','Automated seed ticket #9 for worker 0. Status: in_progress.', NOW() - INTERVAL '10 days'),
  ('[E2E-SEED-W0] in_progress 5 — billing','in_progress',  'billing',         'Test User 10', 'seed-w0-10@example.test', 'Automated seed ticket #10 for worker 0. Status: in_progress.', NOW() - INTERVAL '11 days'),
  ('[E2E-SEED-W0] waiting_user 1 — gdpr',  'waiting_user', 'gdpr',            NULL,           'seed-w0-11@example.test', 'Automated seed ticket #11 for worker 0. Status: waiting_user.', NOW() - INTERVAL '12 days'),
  ('[E2E-SEED-W0] waiting_user 2 — other', 'waiting_user', 'other',           'Test User 12', 'seed-w0-12@example.test', 'Automated seed ticket #12 for worker 0. Status: waiting_user.', NOW() - INTERVAL '13 days'),
  ('[E2E-SEED-W0] waiting_user 3 — bug',   'waiting_user', 'bug',             'Test User 13', 'seed-w0-13@example.test', 'Automated seed ticket #13 for worker 0. Status: waiting_user.', NOW() - INTERVAL '14 days'),
  ('[E2E-SEED-W0] resolved 1 — question',  'resolved',     'question',        NULL,           'seed-w0-14@example.test', 'Automated seed ticket #14 for worker 0. Status: resolved.',     NOW() - INTERVAL '15 days'),
  ('[E2E-SEED-W0] resolved 2 — feature_request','resolved','feature_request', 'Test User 15', 'seed-w0-15@example.test', 'Automated seed ticket #15 for worker 0. Status: resolved.',     NOW() - INTERVAL '16 days'),
  ('[E2E-SEED-W0] resolved 3 — billing',   'resolved',     'billing',         'Test User 16', 'seed-w0-16@example.test', 'Automated seed ticket #16 for worker 0. Status: resolved.',     NOW() - INTERVAL '17 days'),
  ('[E2E-SEED-W0] resolved 4 — gdpr',      'resolved',     'gdpr',            'Test User 17', 'seed-w0-17@example.test', 'Automated seed ticket #17 for worker 0. Status: resolved.',     NOW() - INTERVAL '18 days'),
  ('[E2E-SEED-W0] reopened 1 — other',     'reopened',     'other',           NULL,           'seed-w0-18@example.test', 'Automated seed ticket #18 for worker 0. Status: reopened.',     NOW() - INTERVAL '19 days'),
  ('[E2E-SEED-W0] reopened 2 — bug',       'reopened',     'bug',             'Test User 19', 'seed-w0-19@example.test', 'Automated seed ticket #19 for worker 0. Status: reopened.',     NOW() - INTERVAL '20 days'),
  ('[E2E-SEED-W0] archived 1 — question',  'archived',     'question',        'Test User 20', 'seed-w0-20@example.test', 'Automated seed ticket #20 for worker 0. Status: archived.',     NOW() - INTERVAL '21 days');

-- Cleanup (CASCADE handles support_ticket_messages + support_ticket_attachments):
-- DELETE FROM support_tickets WHERE subject LIKE '[E2E-SEED-W0]%';
-- DELETE FROM support_tickets WHERE subject LIKE '[E2E-SEED-W%]%';
