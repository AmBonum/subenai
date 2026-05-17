// Loader for /s/$slug public CMS pages.
//
// AH-9.7 — mock-flagged. Reads from the in-memory mock store; returns a
// safe-column projection (no `owner_id`, no audit columns).
// TODO(AH-11): swap inner read to supabaseAdmin with same projection.
// TODO(AH-11): enumerate published slugs for sitemap generation.

import { getPageBySlug, type CmsBlock } from "@/lib/admin/cms-mock-store";

export interface PublicCmsPage {
  id: string;
  slug: string;
  title: string;
  seo_description: string;
  content_blocks: CmsBlock[];
  published_at: string;
}

export function getPublicCmsPage(slug: string): PublicCmsPage | null {
  const row = getPageBySlug(slug);
  if (!row) return null;
  if (row.status !== "published" || !row.published_at) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    seo_description: row.seo_description,
    content_blocks: row.content_blocks.map((b) => ({ ...b })),
    published_at: row.published_at,
  };
}
