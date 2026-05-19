// E16.2 — TanStack Query hooks for the public blog domain.
//
// All reads use the anon Supabase client. RLS limits blog_posts to
// status='published' AND published_at <= now(). blog_authors,
// blog_categories, blog_tags are publicly readable; blog_post_tags reads
// pass through to blog_posts.
//
// Query key convention: ["blog", <kind>, ...args].

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  hero_image_url: string | null;
  reading_minutes: number | null;
  published_at: string;
  category: { slug: string; name: string };
  author: { slug: string; display_name: string };
}

export interface BlogPostSource {
  label: string;
  url: string;
  publisher?: string;
  accessed_at?: string;
}

export interface BlogPostDetail extends BlogPostListItem {
  subtitle: string | null;
  body_mdx: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  pillar_post_id: string | null;
  primary_keyword: string | null;
  faq_jsonb: unknown;
  sources: BlogPostSource[];
  // E17.1 — optional slug of the matching course in
  // src/content/courses. Used by ContinueWithCourseCard on the
  // article page to drive readers from passive reading to active
  // training. NULL = no related course wired up.
  related_course_slug: string | null;
}

export function parseSources(raw: unknown): BlogPostSource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is { label: unknown; url: unknown; publisher?: unknown; accessed_at?: unknown } =>
        typeof s === "object" && s !== null,
    )
    .filter((s) => typeof s.label === "string" && typeof s.url === "string")
    .map((s) => ({
      label: s.label as string,
      url: s.url as string,
      publisher: typeof s.publisher === "string" ? s.publisher : undefined,
      accessed_at: typeof s.accessed_at === "string" ? s.accessed_at : undefined,
    }));
}

export function useBlogPostList() {
  return useQuery({
    queryKey: ["blog", "list"],
    queryFn: async (): Promise<BlogPostListItem[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlogPostListItem[];
    },
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ["blog", "post", slug],
    enabled: slug.length > 0,
    queryFn: async (): Promise<BlogPostDetail | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, subtitle, excerpt, body_mdx, hero_image_url, og_image_url,
           seo_title, seo_description, canonical_url, pillar_post_id, primary_keyword,
           faq_jsonb, sources_jsonb, related_course_slug, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Omit<BlogPostDetail, "sources"> & {
        sources_jsonb: unknown;
      };
      return { ...row, sources: parseSources(row.sources_jsonb) };
    },
  });
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}

export interface BlogAuthor {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

export function useBlogCategoryBySlug(slug: string) {
  return useQuery({
    queryKey: ["blog", "category", slug],
    enabled: slug.length > 0,
    queryFn: async (): Promise<BlogCategory | null> => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("id, slug, name, description, sort_order, seo_title, seo_description")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BlogCategory | null) ?? null;
    },
  });
}

export function useBlogAuthorBySlug(slug: string) {
  return useQuery({
    queryKey: ["blog", "author", slug],
    enabled: slug.length > 0,
    queryFn: async (): Promise<BlogAuthor | null> => {
      const { data, error } = await supabase
        .from("blog_authors")
        .select("id, slug, display_name, bio, avatar_url")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BlogAuthor | null) ?? null;
    },
  });
}

export function useBlogPostsByCategoryId(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["blog", "posts", "by-category", categoryId ?? ""],
    enabled: typeof categoryId === "string" && categoryId.length > 0,
    queryFn: async (): Promise<BlogPostListItem[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("category_id", categoryId as string)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlogPostListItem[];
    },
  });
}

// E17.3 — reverse lookup: which blog post links TO this course?
// Used on /courses/<slug> to render a "chceš tomu rozumieť do hĺbky"
// card pointing back at the related article. Returns at most one post
// (slug is logically unique per course in our editorial model — multiple
// articles linking to the same course is allowed in schema but the UI
// shows only the first match by published_at desc).
export function useBlogPostByRelatedCourse(courseSlug: string | undefined) {
  return useQuery({
    queryKey: ["blog", "post", "by-course", courseSlug ?? ""],
    enabled: typeof courseSlug === "string" && courseSlug.length > 0,
    queryFn: async (): Promise<BlogPostListItem | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("related_course_slug", courseSlug as string)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BlogPostListItem | null) ?? null;
    },
  });
}

// E25 Phase 2 — batched variant of useBlogPostByRelatedCourse for
// catalog pages (/courses index). Issues ONE Supabase query with
// `.in("related_course_slug", slugs)` instead of N parallel per-card
// queries, then groups results client-side by related_course_slug.
//
// Returns a map keyed by courseSlug — undefined when the query is
// in-flight, then {slug: post | null} after settle. Each CourseCard
// reads its slug from the map and renders the related-article slot
// only when a post exists.
//
// `__related_course_slug` is selected explicitly so we can group
// the rows back to their source course; the column is on blog_posts
// but is omitted from BlogPostListItem (consumers shouldn't depend
// on it). Cast through unknown to express that this query alone
// returns the extra field.
export function useBlogPostsByRelatedCourses(courseSlugs: string[]) {
  // Stable key derived from sorted slugs so re-orderings on the page
  // don't bust the cache.
  const cacheKey = [...courseSlugs].sort().join(",");
  return useQuery({
    queryKey: ["blog", "posts", "by-courses-batch", cacheKey],
    enabled: courseSlugs.length > 0,
    queryFn: async (): Promise<Record<string, BlogPostListItem | null>> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           related_course_slug,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .in("related_course_slug", courseSlugs)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<
        BlogPostListItem & { related_course_slug: string | null }
      >;
      const out: Record<string, BlogPostListItem | null> = {};
      for (const slug of courseSlugs) out[slug] = null;
      // First-seen wins per related_course_slug (rows are ordered
      // published_at desc, so the most recent article anchors each
      // course — matching the single-slug query's behavior).
      for (const row of rows) {
        const k = row.related_course_slug;
        if (k && out[k] === null) {
          const { related_course_slug: _drop, ...rest } = row;
          void _drop;
          out[k] = rest as BlogPostListItem;
        }
      }
      return out;
    },
  });
}

// E25 Phase 3 — reverse lookup: which blog post links TO this test pack?
//
// Mirror of useBlogPostByRelatedCourse — returns the most-recent
// published article whose related_test_slug = packSlug, or null when
// no article is tagged. Used on /tests/<slug> to render a "Read this
// before / after the test" card pointing back at the related article.
//
// Single-slug variant for per-detail-page consumption. For the catalog
// strip on /tests index, see useFeaturedBlogPostsForTests below.
export function useBlogPostByRelatedTest(packSlug: string | undefined) {
  return useQuery({
    queryKey: ["blog", "post", "by-test", packSlug ?? ""],
    enabled: typeof packSlug === "string" && packSlug.length > 0,
    queryFn: async (): Promise<BlogPostListItem | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("related_test_slug", packSlug as string)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BlogPostListItem | null) ?? null;
    },
  });
}

// E25 Phase 3 — featured-for-tests strip on /tests index.
//
// Returns the N most-recent published articles whose
// related_test_slug IS NOT NULL — i.e. articles that have been
// editorially tagged as "study material before/after a test". Order
// by published_at DESC so the most fresh content anchors the strip.
//
// Returns an empty array before any article is backfilled. The
// catalog renders the strip section conditionally on `data.length > 0`
// so the UI degrades gracefully until editorial fills the column.
export function useFeaturedBlogPostsForTests(limit = 4) {
  return useQuery({
    queryKey: ["blog", "posts", "featured-for-tests", limit],
    queryFn: async (): Promise<BlogPostListItem[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .not("related_test_slug", "is", null)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as BlogPostListItem[];
    },
  });
}

export function useBlogPostsByAuthorId(authorId: string | undefined) {
  return useQuery({
    queryKey: ["blog", "posts", "by-author", authorId ?? ""],
    enabled: typeof authorId === "string" && authorId.length > 0,
    queryFn: async (): Promise<BlogPostListItem[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("author_id", authorId as string)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlogPostListItem[];
    },
  });
}
