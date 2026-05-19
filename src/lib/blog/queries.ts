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
           faq_jsonb, reading_minutes, published_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as unknown as BlogPostDetail;
    },
  });
}
