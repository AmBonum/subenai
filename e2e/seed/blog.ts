import { nextId, pad } from "./counters";

export interface BlogCategoryRow {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface BlogAuthorRow {
  id: string;
  slug: string;
  display_name: string;
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  updated_at: string;
  created_at: string;
  category_id: string;
  author_id: string;
  language: string;
  subtitle: string | null;
  excerpt: string;
  body_mdx: string;
  pillar_post_id: string | null;
  hero_image_url: string | null;
  og_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  primary_keyword: string | null;
  search_intent: string | null;
  reading_minutes: number | null;
  sources_jsonb: unknown[];
  faq_jsonb: unknown;
  related_course_slug: string | null;
  // Embedded FK objects — returned by PostgREST when the query uses
  // `blog_categories!inner(slug, name)` and `blog_authors!inner(...)`.
  // The mock returns rows as-is, so these must be present on the seed row.
  category: { slug: string; name: string };
  author: { slug: string; display_name: string };
}

export function seedBlogCategory(overrides: Partial<BlogCategoryRow> = {}): BlogCategoryRow {
  const n = nextId("blog_category");
  return {
    id: `bcat_e2e_${pad(n)}`,
    slug: `category-${n}`,
    name: `Category ${n}`,
    sort_order: n,
    ...overrides,
  };
}

export function seedBlogAuthor(overrides: Partial<BlogAuthorRow> = {}): BlogAuthorRow {
  const n = nextId("blog_author");
  return {
    id: `baut_e2e_${pad(n)}`,
    slug: `author-${n}`,
    display_name: `Author ${n}`,
    ...overrides,
  };
}

export function seedBlogPost(
  category: BlogCategoryRow,
  author: BlogAuthorRow,
  overrides: Partial<Omit<BlogPostRow, "category" | "author">> = {},
): BlogPostRow {
  const n = nextId("blog_post");
  const id = overrides.id ?? `bpst_e2e_${pad(n)}`;
  const slug = overrides.slug ?? `e2e-post-${n}`;
  return {
    id,
    slug,
    title: `E2E Post ${n}`,
    status: "draft",
    published_at: null,
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
    category_id: category.id,
    author_id: author.id,
    language: "sk",
    subtitle: null,
    excerpt: "",
    body_mdx: "",
    pillar_post_id: null,
    hero_image_url: null,
    og_image_url: null,
    seo_title: null,
    seo_description: null,
    canonical_url: null,
    primary_keyword: null,
    search_intent: null,
    reading_minutes: null,
    sources_jsonb: [],
    faq_jsonb: null,
    related_course_slug: null,
    ...overrides,
    // Always derive embedded objects from the canonical category/author
    // arguments so tests don't have to keep them in sync manually.
    category: { slug: category.slug, name: category.name },
    author: { slug: author.slug, display_name: author.display_name },
  };
}
