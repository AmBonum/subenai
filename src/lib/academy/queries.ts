// E55.3 — TanStack Query hooks for the unified Academy domain. Backed by the
// same blog_* tables (E55 keeps the physical store; "Academy" is the surface).
// Rows are articles or lessons (`content_type`); lessons carry difficulty /
// estimated_minutes / hero_emoji. RLS limits reads to published rows.
//
// Query key convention: ["academy", <kind>, ...args].

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { parseSources, type BlogPostSource } from "@/lib/blog/queries";

export type AcademyContentType = "article" | "lesson";

export interface AcademyListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  hero_image_url: string | null;
  reading_minutes: number | null;
  published_at: string;
  content_type: AcademyContentType;
  difficulty: string | null;
  estimated_minutes: number | null;
  hero_emoji: string | null;
  category: { slug: string; name: string };
  author: { slug: string; display_name: string };
}

export interface AcademyEntryDetail extends AcademyListItem {
  subtitle: string | null;
  body_mdx: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  primary_keyword: string | null;
  faq_jsonb: unknown;
  sources: BlogPostSource[];
}

const LIST_COLS = `id, slug, title, excerpt, hero_image_url, reading_minutes, published_at,
  content_type, difficulty, estimated_minutes, hero_emoji,
  category:blog_categories!inner(slug, name),
  author:blog_authors!inner(slug, display_name)`;

export function useAcademyList() {
  return useQuery({
    queryKey: ["academy", "list"],
    queryFn: async (): Promise<AcademyListItem[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(LIST_COLS)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AcademyListItem[];
    },
  });
}

export function useAcademyEntry(slug: string) {
  return useQuery({
    queryKey: ["academy", "entry", slug],
    enabled: slug.length > 0,
    queryFn: async (): Promise<AcademyEntryDetail | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `${LIST_COLS}, subtitle, body_mdx, seo_title, seo_description, og_image_url,
           canonical_url, primary_keyword, faq_jsonb, sources_jsonb`,
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Omit<AcademyEntryDetail, "sources"> & {
        sources_jsonb: unknown;
      };
      return { ...row, sources: parseSources(row.sources_jsonb) };
    },
  });
}

// Route-loader fetch (non-hook) — feeds head()/JSON-LD before the lazy
// component mounts. Mirrors useAcademyEntry's query.
export async function fetchAcademyEntry(slug: string): Promise<AcademyEntryDetail | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      `${LIST_COLS}, subtitle, body_mdx, seo_title, seo_description, og_image_url,
       canonical_url, primary_keyword, faq_jsonb, sources_jsonb`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Omit<AcademyEntryDetail, "sources"> & { sources_jsonb: unknown };
  return { ...row, sources: parseSources(row.sources_jsonb) };
}

export interface AcademyCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export function useAcademyCategory(slug: string) {
  return useQuery({
    queryKey: ["academy", "category", slug],
    enabled: slug.length > 0,
    queryFn: async (): Promise<AcademyCategory | null> => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("id, slug, name, description, seo_title, seo_description")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AcademyCategory | null) ?? null;
    },
  });
}

export interface AcademyAuthor {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

export function useAcademyAuthor(slug: string) {
  return useQuery({
    queryKey: ["academy", "author", slug],
    enabled: slug.length > 0,
    queryFn: async (): Promise<AcademyAuthor | null> => {
      const { data, error } = await supabase
        .from("blog_authors")
        .select("id, slug, display_name, bio, avatar_url")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AcademyAuthor | null) ?? null;
    },
  });
}
