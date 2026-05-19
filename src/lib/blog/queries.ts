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
