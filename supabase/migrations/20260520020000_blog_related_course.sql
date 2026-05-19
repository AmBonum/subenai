-- E17.1 — Cross-link articles to courses.
--
-- Courses live in TS modules (src/content/courses/*.ts) rather than in
-- the DB, so we cannot enforce a foreign key on this column. The value
-- is the course slug (matches src/content/courses/<slug>.ts) — schema
-- validation happens at write time in the admin UI by looking up the
-- slug against COURSES from src/content/courses/index.ts.
--
-- NULL means "no related course" — most cluster articles. Pillars
-- usually point at their primary course (e.g.
-- phishing-kompletny-sprievodca → email-phishing).
--
-- Idempotent: this migration can be re-run safely.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS related_course_slug TEXT NULL;

-- Sanity constraint: when present, the slug must look like a slug.
-- Identical pattern to the existing slug CHECK on blog_posts.slug.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_related_course_slug_format'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_related_course_slug_format
      CHECK (related_course_slug IS NULL OR related_course_slug ~ '^[a-z0-9-]+$');
  END IF;
END$$;

COMMENT ON COLUMN public.blog_posts.related_course_slug IS
  'Slug of the related course in src/content/courses/. NULL = no link. '
  'Not a FK because courses live in TS modules — admin UI validates at write.';
