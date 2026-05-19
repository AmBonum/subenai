-- E21.1 — Production backfill runbook for pillar cross-links + teacher pillar
--
-- Run order: paste the entire file into the Supabase SQL Editor on the prod
-- project, click Run. Idempotent — re-running is safe.
--
-- What this does:
--   1. Updates related_course_slug on the 10 existing published pillars
--      so the ContinueWithCourseCard component renders under each.
--   2. (Section commented out) Hint to use the seed script for the
--      teacher pillar — direct SQL INSERT is brittle because it needs
--      the body_mdx contents from the .mdx file, which the seed script
--      reads at runtime.
--
-- Source of truth: tasks/topic-content-map.md § "The grid"
-- Schema: supabase/migrations/20260520020000_blog_related_course.sql
--         adds the related_course_slug column + CHECK constraint.

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Pillar → course cross-link backfill
-- ───────────────────────────────────────────────────────────────────────────
-- Idempotent: re-running overwrites the same value. Safe on every pillar
-- that exists; rows that don't match the slug are silently no-op.

UPDATE public.blog_posts
SET related_course_slug = 'email-phishing'
WHERE slug = 'phishing-kompletny-sprievodca';

UPDATE public.blog_posts
SET related_course_slug = 'sms-smishing'
WHERE slug = 'scam-sms-a-podvodne-hovory';

UPDATE public.blog_posts
SET related_course_slug = 'marketplace-bazos-podvody'
WHERE slug = 'fake-eshopy-ako-odhalit';

UPDATE public.blog_posts
SET related_course_slug = 'kradez-kont-socialnych-sieti'
WHERE slug = 'podvody-na-socialnych-sietach';

UPDATE public.blog_posts
SET related_course_slug = 'ai-hlasove-a-deepfake-podvody'
WHERE slug = 'ai-a-moderne-podvody-deepfake-voice-cloning';

UPDATE public.blog_posts
SET related_course_slug = 'data-hygiene'
WHERE slug = 'digitalna-bezpecnost-kompletny-navod';

UPDATE public.blog_posts
SET related_course_slug = 'chran-svojich-blizkych'
WHERE slug = 'psychologia-internetovych-podvodov';

UPDATE public.blog_posts
SET related_course_slug = 'chran-svojich-blizkych'
WHERE slug = 'bezpecnost-pre-rodicov-deti-seniorov';

UPDATE public.blog_posts
SET related_course_slug = 'marketplace-bazos-podvody'
WHERE slug = 'bezpecne-nakupovanie-online-slovensko';

UPDATE public.blog_posts
SET related_course_slug = 'kradez-kont-socialnych-sieti'
WHERE slug = 'internet-safety-pre-studentov';

-- 11th pillar (teacher) is added by the seed script below — its row may
-- not exist yet, so this UPDATE is queued for re-run after the INSERT.
UPDATE public.blog_posts
SET related_course_slug = 'chran-svojich-blizkych'
WHERE slug = 'kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Verification — confirm cross-links are wired
-- ───────────────────────────────────────────────────────────────────────────
-- Expected output: 11 rows, related_course_slug filled (NULL only on
-- teacher pillar if the seed script hasn't been run yet).

SELECT slug, related_course_slug, status
FROM public.blog_posts
WHERE slug IN (
  'phishing-kompletny-sprievodca',
  'scam-sms-a-podvodne-hovory',
  'fake-eshopy-ako-odhalit',
  'podvody-na-socialnych-sietach',
  'ai-a-moderne-podvody-deepfake-voice-cloning',
  'digitalna-bezpecnost-kompletny-navod',
  'psychologia-internetovych-podvodov',
  'bezpecnost-pre-rodicov-deti-seniorov',
  'bezpecne-nakupovanie-online-slovensko',
  'internet-safety-pre-studentov',
  'kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov'
)
ORDER BY slug;

COMMIT;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Teacher pillar deployment — NOT via raw SQL
-- ───────────────────────────────────────────────────────────────────────────
-- The teacher pillar MDX file
-- (src/content/blog/kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov.mdx)
-- needs the body_mdx content from the file, which the seed script reads
-- at runtime. Direct SQL INSERT would require pasting the entire
-- ~12 KB body inline — fragile and easy to corrupt.
--
-- INSTEAD, run from a local clone of the repo:
--
--     SUPABASE_URL=<prod-url> \
--     SUPABASE_SERVICE_ROLE_KEY=<prod-service-role> \
--     node scripts/seed-blog-posts.mjs
--
-- The script will:
--   - Parse all *.mdx in src/content/blog/
--   - Insert any missing rows as status='draft'
--   - Update existing draft rows in place (skip published rows)
--   - Populate related_course_slug from frontmatter (fixed in commit
--     03a8acf — see scripts/seed-blog-posts.mjs:155)
--
-- After the seed, the teacher pillar row exists with status='draft'.
-- Publish via /admin/blog/<id> UI: click "Publikovať" button.
--
-- Final verification: re-run the SELECT in section 2 above. All 11 rows
-- should show their related_course_slug. The teacher row should show
-- status='draft' or 'published'.
