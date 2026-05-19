#!/usr/bin/env node
// Seed blog posts from src/content/blog/*.mdx into Supabase.
//
// Per locked decision #3 in tasks/PLAN-2026-05-19-blog-content-engine.md,
// the DB is the source of truth and these MDX files are one-time seed
// input. Each frontmatter row maps 1:1 to blog_posts columns.
//
// Behaviour:
//   - Parses every src/content/blog/*.mdx file via gray-matter.
//   - Validates the frontmatter shape (slug, title, excerpt, category_slug,
//     author_slug, sources). Aborts the whole batch if any file is malformed.
//   - Resolves category_slug → category_id and author_slug → author_id via
//     the seeded blog_categories / blog_authors rows.
//   - UPSERTs by slug. If the row exists AND is `status = 'published'`,
//     SKIPS it (never overwrite a live article). Drafts and archived rows
//     are updated in place.
//   - Inserts always land as `status = 'draft'` (publish happens in
//     /admin/blog/$id, not from this script).
//
// Usage:
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//     npm run seed-blog
//
// Dry-run (no writes, just report what would happen):
//   DRY_RUN=1 npm run seed-blog
//
// SECURITY: SUPABASE_SERVICE_ROLE_KEY bypasses RLS. NEVER commit it,
// never ship it in client bundles. Use a local .env or pass on the
// command line. The script reads it from process.env only.

import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONTENT_DIR = resolve(ROOT, "src/content/blog");
const DRY_RUN = process.env.DRY_RUN === "1";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (or DRY_RUN=1).");
    process.exit(1);
  }
}

const REQUIRED_KEYS = [
  "slug",
  "title",
  "excerpt",
  "category_slug",
  "author_slug",
  "primary_keyword",
  "search_intent",
  "seo_title",
  "seo_description",
  "sources",
];

function validateFrontmatter(file, data) {
  const missing = REQUIRED_KEYS.filter((k) => data[k] === undefined || data[k] === null);
  if (missing.length > 0) {
    throw new Error(`${file}: missing required frontmatter keys: ${missing.join(", ")}`);
  }
  if (!Array.isArray(data.sources)) {
    throw new Error(`${file}: 'sources' must be an array`);
  }
  const isPillar = data.pillar === true;
  const minSources = isPillar ? 4 : 3;
  if (data.sources.length < minSources) {
    throw new Error(
      `${file}: ${isPillar ? "pillar" : "cluster"} requires ≥${minSources} sources, found ${data.sources.length}`,
    );
  }
  for (const [i, s] of data.sources.entries()) {
    if (typeof s.label !== "string" || typeof s.url !== "string") {
      throw new Error(`${file}: sources[${i}] must have string label + url`);
    }
  }
}

async function loadPosts() {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".mdx"));
  const posts = [];
  for (const file of files) {
    const fullPath = resolve(CONTENT_DIR, file);
    const raw = await readFile(fullPath, "utf8");
    const { data, content } = matter(raw);
    validateFrontmatter(file, data);
    posts.push({ file, frontmatter: data, body: content.trim() });
  }
  return posts;
}

async function buildLookups(supabase) {
  const { data: categories, error: catErr } = await supabase
    .from("blog_categories")
    .select("id, slug");
  if (catErr) throw catErr;
  const { data: authors, error: authErr } = await supabase.from("blog_authors").select("id, slug");
  if (authErr) throw authErr;
  return {
    categoryBySlug: Object.fromEntries(categories.map((c) => [c.slug, c.id])),
    authorBySlug: Object.fromEntries(authors.map((a) => [a.slug, a.id])),
  };
}

async function upsertOne(supabase, lookups, post) {
  const fm = post.frontmatter;
  const categoryId = lookups.categoryBySlug[fm.category_slug];
  const authorId = lookups.authorBySlug[fm.author_slug];
  if (!categoryId) throw new Error(`${post.file}: unknown category_slug '${fm.category_slug}'`);
  if (!authorId) throw new Error(`${post.file}: unknown author_slug '${fm.author_slug}'`);

  const { data: existing, error: lookupErr } = await supabase
    .from("blog_posts")
    .select("id, status")
    .eq("slug", fm.slug)
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  if (existing && existing.status === "published") {
    return { file: post.file, slug: fm.slug, action: "skipped-published" };
  }

  const row = {
    slug: fm.slug,
    title: fm.title,
    subtitle: fm.subtitle ?? null,
    excerpt: fm.excerpt,
    body_mdx: post.body,
    category_id: categoryId,
    author_id: authorId,
    pillar_post_id: null,
    hero_image_url: fm.hero_image_url ?? null,
    og_image_url: fm.og_image_url ?? null,
    seo_title: fm.seo_title,
    seo_description: fm.seo_description,
    canonical_url: fm.canonical_url ?? null,
    primary_keyword: fm.primary_keyword,
    search_intent: fm.search_intent,
    reading_minutes: fm.reading_minutes ?? null,
    sources_jsonb: fm.sources,
    status: "draft",
    published_at: null,
  };

  if (existing) {
    const { error } = await supabase.from("blog_posts").update(row).eq("id", existing.id);
    if (error) throw error;
    return { file: post.file, slug: fm.slug, action: "updated-draft" };
  }
  const { error } = await supabase.from("blog_posts").insert(row);
  if (error) throw error;
  return { file: post.file, slug: fm.slug, action: "inserted-draft" };
}

const posts = await loadPosts();
console.log(`Parsed ${posts.length} MDX files from ${CONTENT_DIR}`);

if (DRY_RUN) {
  for (const p of posts) {
    const pillar = p.frontmatter.pillar === true ? "[pillar]" : "[cluster]";
    const wordCount = p.body.split(/\s+/).length;
    console.log(
      `  ${pillar} ${p.frontmatter.slug} — ${wordCount} words, ${p.frontmatter.sources.length} sources`,
    );
  }
  console.log("\nDRY_RUN=1 — no writes. Unset DRY_RUN to seed.");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const lookups = await buildLookups(supabase);
console.log(
  `Resolved ${Object.keys(lookups.categoryBySlug).length} categories, ${Object.keys(lookups.authorBySlug).length} authors`,
);

const results = [];
for (const p of posts) {
  const r = await upsertOne(supabase, lookups, p);
  results.push(r);
  console.log(`  ${r.action.padEnd(20)} ${r.slug}`);
}

const summary = results.reduce((acc, r) => {
  acc[r.action] = (acc[r.action] ?? 0) + 1;
  return acc;
}, {});
console.log("\nDone:", summary);
