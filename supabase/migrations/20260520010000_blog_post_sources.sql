-- ============================================================================
-- E16.2 — sources_jsonb column on blog_posts
-- ============================================================================
-- Structured citation list rendered at the end of every published article
-- (`<BlogPostSources>`). Per-article quality gate in
-- tasks/PLAN-2026-05-19-blog-content-engine.md requires ≥3 unique sources
-- for pillars and ≥3 for clusters; storing them in jsonb instead of inline
-- markdown makes the count programmatically verifiable and lets E16.3
-- surface them in Article JSON-LD via `citation`.
--
-- Source object shape (enforced at the application layer in
-- src/lib/blog/queries.ts):
--   { label: string, url: string, publisher?: string, accessed_at?: string }
-- The DB check constraint only enforces "is a JSON array" — per-object
-- shape validation lives in TypeScript so the writer can edit fields
-- without a migration.
-- ============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS sources_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_sources_jsonb_is_array'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_sources_jsonb_is_array
      CHECK (jsonb_typeof(sources_jsonb) = 'array');
  END IF;
END;
$$;
