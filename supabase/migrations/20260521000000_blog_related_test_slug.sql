-- E25 Phase 3 — Cross-link blog articles to test packs.
--
-- Test packs live in TS modules (src/content/test-packs/*.ts) rather
-- than in the DB, so we cannot enforce a foreign key on this column.
-- The value is the pack slug (matches src/content/test-packs/<slug>.ts)
-- — schema validation happens at write time in the admin UI by looking
-- up the slug against TEST_PACKS from src/content/test-packs/index.ts.
--
-- NULL means "no related test pack" — the default for every existing
-- article. Backfill is editorial (per article, after migration apply).
--
-- Mirrors the existing related_course_slug column (added in
-- 20260520020000_blog_related_course.sql) so the two cross-link
-- directions stay symmetric.
--
-- Idempotent: this migration can be re-run safely.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS related_test_slug TEXT NULL;

-- Sanity constraint: when present, the slug must look like a slug.
-- Identical pattern to the related_course_slug constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_related_test_slug_format'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_related_test_slug_format
      CHECK (related_test_slug IS NULL OR related_test_slug ~ '^[a-z0-9-]+$');
  END IF;
END$$;

-- Index for the catalog "Učenie pred testom" strip on /tests, which
-- queries `WHERE related_test_slug IS NOT NULL ORDER BY published_at`.
-- Partial index — saves space because most rows have NULL.
CREATE INDEX IF NOT EXISTS idx_blog_posts_related_test_slug
  ON public.blog_posts (related_test_slug, published_at DESC)
  WHERE related_test_slug IS NOT NULL;

COMMENT ON COLUMN public.blog_posts.related_test_slug IS
  'Slug of the related test pack in src/content/test-packs/. NULL = no link. '
  'Not a FK because test packs live in TS modules — admin UI validates at write. '
  'Mirrors related_course_slug for the reverse cross-link direction.';
