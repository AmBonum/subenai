-- ============================================================================
-- E16.1 — Blog content engine schema
-- Source: tasks/PLAN-2026-05-19-blog-content-engine.md
-- ============================================================================
-- Five tables for the blog content engine (10 pillars + 70 cluster articles
-- shipped under /blog). DB is the authoritative source for body MDX; the
-- admin CMS edits these rows. anon reads only published rows; authenticated
-- admin (via has_role('admin')) does all writes.
--
-- Idempotent: every CREATE uses IF NOT EXISTS, every CREATE POLICY is
-- preceded by DROP POLICY IF EXISTS, every CREATE TRIGGER by
-- DROP TRIGGER IF EXISTS. Safe to re-run on a DB that has already had
-- DEPLOY_SETUP.sql applied (which is what happens in production setup).
--
-- Depends on (already present from AH-1, migration 20260517000000):
--   public.app_role enum, public.has_role(uuid, app_role) function,
--   public.test_status enum ('draft','published','archived')
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blog_authors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio          text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  sort_order      int  NOT NULL DEFAULT 100,
  seo_title       text,
  seo_description text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- language is reserved for E18 trilingual expansion (decision 4 in PLAN).
-- pillar_post_id self-ref encodes hub-and-spoke cluster graph; a pillar's
-- own pillar_post_id is NULL.
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  language        text NOT NULL DEFAULT 'sk',
  category_id     uuid NOT NULL REFERENCES public.blog_categories(id) ON DELETE RESTRICT,
  author_id       uuid NOT NULL REFERENCES public.blog_authors(id)    ON DELETE RESTRICT,
  pillar_post_id  uuid          REFERENCES public.blog_posts(id)      ON DELETE SET NULL,
  title           text NOT NULL,
  subtitle        text,
  excerpt         text NOT NULL,
  body_mdx        text NOT NULL,
  hero_image_url  text,
  og_image_url    text,
  seo_title       text,
  seo_description text,
  canonical_url   text,
  primary_keyword text,
  search_intent   text,
  reading_minutes int,
  faq_jsonb       jsonb,
  status          public.test_status NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON public.blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON public.blog_posts (category_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pillar     ON public.blog_posts (pillar_post_id) WHERE pillar_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag    ON public.blog_post_tags (tag_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_blog_posts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_blog_posts_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.blog_authors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_read_published"     ON public.blog_posts;
DROP POLICY IF EXISTS "blog_authors_read_all"         ON public.blog_authors;
DROP POLICY IF EXISTS "blog_categories_read_all"      ON public.blog_categories;
DROP POLICY IF EXISTS "blog_tags_read_all"            ON public.blog_tags;
DROP POLICY IF EXISTS "blog_post_tags_read_via_post"  ON public.blog_post_tags;
DROP POLICY IF EXISTS "blog_posts_admin_all"          ON public.blog_posts;
DROP POLICY IF EXISTS "blog_authors_admin_all"        ON public.blog_authors;
DROP POLICY IF EXISTS "blog_categories_admin_all"     ON public.blog_categories;
DROP POLICY IF EXISTS "blog_tags_admin_all"           ON public.blog_tags;
DROP POLICY IF EXISTS "blog_post_tags_admin_all"      ON public.blog_post_tags;

-- Public reads
CREATE POLICY "blog_posts_read_published"
  ON public.blog_posts FOR SELECT
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= now()
  );

CREATE POLICY "blog_authors_read_all"
  ON public.blog_authors FOR SELECT
  USING (true);

CREATE POLICY "blog_categories_read_all"
  ON public.blog_categories FOR SELECT
  USING (true);

CREATE POLICY "blog_tags_read_all"
  ON public.blog_tags FOR SELECT
  USING (true);

CREATE POLICY "blog_post_tags_read_via_post"
  ON public.blog_post_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = blog_post_tags.post_id
        AND p.status = 'published'
        AND p.published_at IS NOT NULL
        AND p.published_at <= now()
    )
  );

-- Admin writes (full CRUD via has_role)
CREATE POLICY "blog_posts_admin_all"
  ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_authors_admin_all"
  ON public.blog_authors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_categories_admin_all"
  ON public.blog_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_tags_admin_all"
  ON public.blog_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_post_tags_admin_all"
  ON public.blog_post_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------------------------------------------
-- Seed: single editorial author
-- ----------------------------------------------------------------------------

INSERT INTO public.blog_authors (slug, display_name, bio)
VALUES (
  'subenai-editorial',
  'subenai editorial',
  'Tím subenai píše o internetových podvodoch, digitálnej bezpečnosti a tom, ako rozpoznať scam skôr, než ťa dostane.'
)
ON CONFLICT (slug) DO NOTHING;

-- Catch-up update for any DB instance that ran an earlier draft of this
-- migration with `SubenAI editorial` + `vás dostane` copy. Aligns the
-- existing row with locked decisions #1 (lowercase subenai) and #2
-- (informal `ty` register) — see tasks/blog/voice-guide.md preamble.
UPDATE public.blog_authors
SET display_name = 'subenai editorial',
    bio = 'Tím subenai píše o internetových podvodoch, digitálnej bezpečnosti a tom, ako rozpoznať scam skôr, než ťa dostane.'
WHERE slug = 'subenai-editorial'
  AND (display_name <> 'subenai editorial'
       OR bio <> 'Tím subenai píše o internetových podvodoch, digitálnej bezpečnosti a tom, ako rozpoznať scam skôr, než ťa dostane.');

-- ----------------------------------------------------------------------------
-- Seed: 15 categories from the user brief
-- ----------------------------------------------------------------------------

INSERT INTO public.blog_categories (slug, name, sort_order, description) VALUES
  ('phishing-a-emaily',    'Phishing a emailové podvody',          10, 'Ako rozpoznať podvodné e-maily a chrániť svoje účty.'),
  ('sms-a-telefon',        'Scam SMS a telefonické podvody',       20, 'Podvodné SMS, vishing a deepfake hlasové útoky.'),
  ('fake-eshopy',          'Fake e-shopy a marketplace podvody',   30, 'Ako identifikovať podvodné obchody pred nákupom.'),
  ('socialne-siete',       'Sociálne siete a manipulácia',         40, 'Podvody na Facebooku, Instagrame a TikToku.'),
  ('ai-scamy',             'AI a moderné online podvody',          50, 'Deepfake, voice cloning a AI-generované scamy.'),
  ('digitalna-bezpecnost', 'Digitálna bezpečnosť pre bežných ľudí', 60, 'Heslá, 2FA, VPN a základné návyky online bezpečnosti.'),
  ('kvizy',                'Kvízy a interaktívne články',          70, 'Otestujte svoje schopnosti rozpoznať scam.'),
  ('pribehy',              'Príbehy reálnych podvodov',            80, 'Skutočné prípady scamov a poučenia z nich.'),
  ('rodicia-a-seniori',    'Bezpečnosť pre rodičov a seniorov',    90, 'Ako chrániť deti a starších rodinných príslušníkov online.'),
  ('psychologia',          'Psychológia podvodov',                100, 'Prečo nám manipulácia funguje a ako sa brániť.'),
  ('bezpecne-nakupovanie', 'Bezpečné nakupovanie online',         110, 'Sprievodca bezpečnými online nákupmi.'),
  ('cyber-hygiena',        'Cyber hygiene a návyky',              120, 'Každodenné návyky pre lepšiu online bezpečnosť.'),
  ('tech-explainers',      'Tech explainers jednoducho',          130, 'Bezpečnostné pojmy vysvetlené normálnym jazykom.'),
  ('news-a-trendy',        'News & aktuálne scam trendy',         140, 'Najnovšie podvodné kampane a trendy.'),
  ('studenti',             'Internet safety pre študentov',       150, 'Bezpečnosť na internete pre žiakov a študentov.')
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Storage bucket for blog images (hero + inline AI-generated visuals)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "blog_images_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_insert"  ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_update"  ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_delete"  ON storage.objects;

CREATE POLICY "blog_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "blog_images_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "blog_images_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "blog_images_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin')
  );
