// E16.4 — admin-side TanStack Query hooks for the blog domain. Reads use
// the anon Supabase client; the admin RLS policy (has_role) on blog_posts
// grants SELECT/INSERT/UPDATE/DELETE on all rows including drafts.
//
// Mutations invalidate ["blog", "admin"] cache root after success so the
// list refreshes immediately.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

import type { BlogPostSource } from "./queries";

export type BlogPostStatus = "draft" | "published" | "archived";

export interface AdminBlogPostListItem {
  id: string;
  slug: string;
  title: string;
  status: BlogPostStatus;
  published_at: string | null;
  updated_at: string;
  category: { slug: string; name: string };
  author: { slug: string; display_name: string };
}

export interface AdminBlogPostDetail extends AdminBlogPostListItem {
  language: string;
  category_id: string;
  author_id: string;
  pillar_post_id: string | null;
  subtitle: string | null;
  excerpt: string;
  body_mdx: string;
  hero_image_url: string | null;
  og_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  primary_keyword: string | null;
  search_intent: string | null;
  reading_minutes: number | null;
  faq_jsonb: unknown;
  sources_jsonb: BlogPostSource[];
  related_course_slug: string | null;
}

function parseSources(raw: unknown): BlogPostSource[] {
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

export function useAdminBlogPostList() {
  return useQuery({
    queryKey: ["blog", "admin", "list"],
    queryFn: async (): Promise<AdminBlogPostListItem[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `id, slug, title, status, published_at, updated_at,
           category:blog_categories!inner(slug, name),
           author:blog_authors!inner(slug, display_name)`,
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminBlogPostListItem[];
    },
  });
}

export function useAdminBlogPost(id: string) {
  return useQuery({
    queryKey: ["blog", "admin", "post", id],
    enabled: id.length > 0,
    queryFn: async (): Promise<AdminBlogPostDetail | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "*, category:blog_categories!inner(slug, name), author:blog_authors!inner(slug, display_name)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Omit<AdminBlogPostDetail, "sources_jsonb"> & {
        sources_jsonb: unknown;
      };
      return { ...row, sources_jsonb: parseSources(row.sources_jsonb) };
    },
  });
}

export interface AdminBlogPostInput {
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  body_mdx: string;
  category_id: string;
  author_id: string;
  pillar_post_id: string | null;
  hero_image_url: string | null;
  og_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  primary_keyword: string | null;
  search_intent: string | null;
  reading_minutes: number | null;
  sources_jsonb: BlogPostSource[];
  related_course_slug: string | null;
  status: BlogPostStatus;
  published_at: string | null;
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminBlogPostInput): Promise<{ id: string }> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(input as unknown as TablesInsert<"blog_posts">)
        .select("id")
        .single();
      if (error) throw error;
      return { id: (data as { id: string }).id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog"] }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<AdminBlogPostInput>;
    }): Promise<void> => {
      const { error } = await supabase
        .from("blog_posts")
        .update(patch as unknown as TablesUpdate<"blog_posts">)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog"] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog"] }),
  });
}

export function usePublishBlogPost() {
  const update = useUpdateBlogPost();
  return {
    ...update,
    mutate: (id: string) =>
      update.mutate({
        id,
        patch: { status: "published", published_at: new Date().toISOString() },
      }),
    mutateAsync: (id: string) =>
      update.mutateAsync({
        id,
        patch: { status: "published", published_at: new Date().toISOString() },
      }),
  };
}

export function useUnpublishBlogPost() {
  const update = useUpdateBlogPost();
  return {
    ...update,
    mutate: (id: string) => update.mutate({ id, patch: { status: "draft", published_at: null } }),
    mutateAsync: (id: string) =>
      update.mutateAsync({ id, patch: { status: "draft", published_at: null } }),
  };
}

export function useArchiveBlogPost() {
  const update = useUpdateBlogPost();
  return {
    ...update,
    mutate: (id: string) => update.mutate({ id, patch: { status: "archived" } }),
    mutateAsync: (id: string) => update.mutateAsync({ id, patch: { status: "archived" } }),
  };
}

// E16.5 — duplicate an existing article. Reads the full source row,
// clones every editable field, mutates slug + title to make the new
// row distinguishable, and forces status=draft + published_at=null so
// the duplicate never accidentally ships before the editor reviews it.
//
// Returns the new id so the caller can navigate to /admin/blog/<id>.
//
// The slug becomes `<source-slug>-kopia` on the first duplicate; if
// that slug is already taken (e.g. user duplicates twice), the unique
// CHECK on blog_posts.slug raises and the error bubbles up — caller
// surfaces it. We deliberately don't auto-suffix with -2/-3 because
// "kopia-kopia-kopia" file proliferation is worse than a clear
// "duplicate already exists, rename it first" failure.
export function useDuplicateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string): Promise<{ id: string }> => {
      const { data: source, error: readErr } = await supabase
        .from("blog_posts")
        .select(
          `slug, title, subtitle, excerpt, body_mdx, category_id, author_id,
           pillar_post_id, hero_image_url, og_image_url, seo_title, seo_description,
           canonical_url, primary_keyword, search_intent, reading_minutes,
           sources_jsonb, faq_jsonb, related_course_slug, language`,
        )
        .eq("id", sourceId)
        .single();
      if (readErr) throw readErr;
      const row = source as unknown as Record<string, unknown>;
      const insert = {
        ...row,
        slug: `${row.slug as string}-kopia`,
        title: `${row.title as string} (kópia)`,
        status: "draft" as const,
        published_at: null,
      };
      const { data: created, error: insertErr } = await supabase
        .from("blog_posts")
        .insert(insert as unknown as TablesInsert<"blog_posts">)
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      return { id: (created as { id: string }).id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog"] }),
  });
}

export function useBlogCategoriesList() {
  return useQuery({
    queryKey: ["blog", "categories", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("id, slug, name, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBlogAuthorsList() {
  return useQuery({
    queryKey: ["blog", "authors", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_authors")
        .select("id, slug, display_name")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
