-- ============================================================================
-- E55.1 — Academy: unify courses into the blog_posts content type.
-- Source: tasks/PLAN-2026-06-28-E55-academy-merge.md
-- ============================================================================
-- Additive + idempotent. The `content_type` default keeps every existing
-- blog_posts row an 'article'; the 31 static courses are imported later as
-- rows with content_type='lesson' (scripts/migrate-courses-to-db.mjs). No RLS
-- change — the existing anon-reads-published policy already covers these rows.
-- ============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'article'
    CHECK (content_type IN ('article', 'lesson')),
  ADD COLUMN IF NOT EXISTS difficulty text
    CHECK (difficulty IN ('beginner', 'advanced')),
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS hero_emoji text;

CREATE INDEX IF NOT EXISTS idx_blog_posts_content_type
  ON public.blog_posts (content_type);
