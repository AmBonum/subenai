#!/usr/bin/env node
// Build-time sitemap generator. Run via `npm run sitemap` (also runs as
// part of `npm run build`). Writes public/sitemap.xml so Vite copies it
// into dist/client/sitemap.xml during the build.
//
// Static routes are hard-coded; course routes are loaded from the
// content registry so adding a new course updates the sitemap
// automatically on the next build.

import { writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ORIGIN = "https://subenai.sk";
const TODAY = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/tests", priority: "0.9", changefreq: "weekly" },
  { loc: "/courses", priority: "0.9", changefreq: "weekly" },
  { loc: "/cookies", priority: "0.3", changefreq: "yearly" },
  { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  { loc: "/about", priority: "0.5", changefreq: "monthly" },
  { loc: "/contact", priority: "0.5", changefreq: "yearly" },
  { loc: "/support", priority: "0.6", changefreq: "monthly" },
  { loc: "/sponsors", priority: "0.4", changefreq: "weekly" },
  { loc: "/sponsors/all", priority: "0.3", changefreq: "weekly" },
  { loc: "/manage-support", priority: "0.3", changefreq: "yearly" },
  { loc: "/changelog", priority: "0.4", changefreq: "weekly" },
  { loc: "/test/builder", priority: "0.7", changefreq: "monthly" },
  { loc: "/schools", priority: "0.7", changefreq: "monthly" },
  { loc: "/blog", priority: "0.8", changefreq: "daily" },
  { loc: "/sablony", priority: "0.8", changefreq: "weekly" },
];

// E16.3 — blog category archive pages. The 15 categories are seeded in
// supabase/migrations/20260520000000_blog_schema.sql; the same slug list
// lives here for the build-time sitemap. When new categories are added,
// update both files together. Per-article URLs land in a follow-up
// (dynamic /blog/sitemap.xml route querying Supabase at request time).
// Pillar slugs get higher sitemap priority (0.7) than clusters (0.5).
// Source of truth: each MDX file's `pillar: true` frontmatter — but DB
// rows don't have a `pillar` boolean column (seed script collapsed it
// into `pillar_post_id` which we then left null), so we maintain a
// hardcoded list here. If a new pillar lands, add its slug below.
const PILLAR_SLUGS = new Set([
  "phishing-kompletny-sprievodca",
  "scam-sms-a-podvodne-hovory",
  "fake-eshopy-ako-odhalit",
  "podvody-na-socialnych-sietach",
  "ai-a-moderne-podvody-deepfake-voice-cloning",
  "digitalna-bezpecnost-kompletny-navod",
  "psychologia-internetovych-podvodov",
  "bezpecnost-pre-rodicov-deti-seniorov",
  "bezpecne-nakupovanie-online-slovensko",
  "internet-safety-pre-studentov",
  "kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov",
]);

const BLOG_CATEGORY_SLUGS = [
  "phishing-a-emaily",
  "sms-a-telefon",
  "fake-eshopy",
  "socialne-siete",
  "ai-scamy",
  "digitalna-bezpecnost",
  "kvizy",
  "pribehy",
  "rodicia-a-seniori",
  "psychologia",
  "bezpecne-nakupovanie",
  "cyber-hygiena",
  "tech-explainers",
  "news-a-trendy",
  "studenti",
];

async function loadSlugs(dirRel) {
  // Use a quick TS-aware loader path. We can't import the TS file directly
  // from Node without a transpiler — but we know each module exports a
  // constant with `slug` + `updatedAt`. Grep slugs from file system.
  const { readdir, readFile } = await import("node:fs/promises");
  const dir = resolve(ROOT, dirRel);
  const files = await readdir(dir);
  const items = [];
  for (const file of files) {
    if (!file.endsWith(".ts") || file.startsWith("_") || file === "index.ts") continue;
    const src = await readFile(resolve(dir, file), "utf8");
    const slugMatch = src.match(/slug:\s*['"`]([a-z0-9-]+)['"`]/);
    const updatedMatch = src.match(/updatedAt:\s*['"`](\d{4}-\d{2}-\d{2})/);
    if (slugMatch) {
      items.push({
        slug: slugMatch[1],
        lastmod: updatedMatch ? updatedMatch[1] : TODAY,
      });
    }
  }
  return items;
}

const courses = await loadSlugs("src/content/courses");
const packs = await loadSlugs("src/content/test-packs");

// E30 — fetch published CMS slugs from Supabase at build time.
// Mirror of loadPublishedBlogPosts: env-var-guarded, graceful fallback.
// Returns Array<{slug, updated_at}> on success, null on missing creds
// or network failure (caller falls back to the mock-store seed).
async function loadCmsPublishedSlugsFromSupabase() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      "[sitemap] Skipping live CMS pages: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set; falling back to mock store",
    );
    return null;
  }
  const select = "slug,updated_at,published_at";
  const url = `${SUPABASE_URL}/rest/v1/cms_pages?status=eq.published&published_at=not.is.null&order=updated_at.desc&select=${encodeURIComponent(select)}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] Supabase fetch returned ${res.status}; falling back to mock store`);
      return null;
    }
    const rows = await res.json();
    return rows.map((r) => ({
      slug: r.slug,
      updated_at: r.updated_at ?? r.published_at ?? TODAY,
    }));
  } catch (err) {
    console.warn(`[sitemap] Supabase fetch failed: ${err.message}; falling back to mock store`);
    return null;
  }
}

// Mock-store fallback. Reads the seed slugs from the dev-only mock
// module — used when Supabase env vars are missing (local dev / CI
// without secrets / offline builds) so the committed sitemap.xml
// still includes the well-known /s/o-projekte-rozsirene entry.
async function loadCmsPublishedSlugsFromMock() {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(resolve(ROOT, "src/lib/admin/cms-mock-store.ts"), "utf8");
  const blockRe = /slug:\s*"([a-z0-9-]+)"[\s\S]*?status:\s*"(published|draft)"/g;
  const slugs = [];
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    if (m[2] === "published") slugs.push({ slug: m[1], updated_at: TODAY });
  }
  return slugs;
}

async function loadCmsPublishedSlugs() {
  const live = await loadCmsPublishedSlugsFromSupabase();
  if (live !== null) return live;
  return loadCmsPublishedSlugsFromMock();
}

const cmsSlugs = await loadCmsPublishedSlugs();

async function loadPublishedBlogPosts() {
  // E16.3 Phase 2: per-article URLs for the sitemap. Queries Supabase
  // PostgREST at build time (anon publishable key — RLS already filters
  // to status='published' AND published_at <= now()). If env vars are
  // missing (e.g. local dev offline), returns [] and the sitemap drops
  // blog article URLs — does NOT fail the build.
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      "[sitemap] Skipping blog posts: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set",
    );
    return [];
  }
  const select = "slug,published_at,updated_at,pillar_post_id";
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&order=published_at.desc&select=${encodeURIComponent(select)}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] Supabase fetch returned ${res.status}; skipping blog posts.`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[sitemap] Supabase fetch failed: ${err.message}; skipping blog posts.`);
    return [];
  }
}

const blogPosts = await loadPublishedBlogPosts();

// E44 Phase D — per-template /sablony/$slug entries. Anon-readable via
// the templates_anon_read_public_published RLS policy (Phase D
// migration 20260521170000). Returns slugs of every platform-default
// (owner_id IS NULL) plus admin-approved community template
// (visibility=public AND status=published) that has a non-null slug.
async function loadPublishedTemplateSlugs() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      "[sitemap] Skipping template slugs: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set",
    );
    return [];
  }
  // PostgREST `or=` syntax: defaults (owner_id IS NULL) OR community-approved.
  // Slug must be non-null to be linkable.
  const filter = "or=(owner_id.is.null,and(visibility.eq.public,status.eq.published))";
  const url = `${SUPABASE_URL}/rest/v1/templates?${filter}&slug=not.is.null&select=slug,updated_at,published_at`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] Supabase template fetch returned ${res.status}; skipping.`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[sitemap] Supabase template fetch failed: ${err.message}; skipping.`);
    return [];
  }
}

const templates = await loadPublishedTemplateSlugs();

const urls = [
  ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: TODAY })),
  ...courses.map((c) => ({
    loc: `/courses/${c.slug}`,
    priority: "0.8",
    changefreq: "monthly",
    lastmod: c.lastmod,
  })),
  ...packs.map((p) => ({
    loc: `/tests/${p.slug}`,
    priority: "0.85",
    changefreq: "monthly",
    lastmod: p.lastmod,
  })),
  ...cmsSlugs.map((c) => ({
    loc: `/s/${c.slug}`,
    priority: "0.5",
    changefreq: "monthly",
    lastmod: (c.updated_at ?? TODAY).slice(0, 10),
  })),
  ...BLOG_CATEGORY_SLUGS.map((slug) => ({
    loc: `/blog/kategoria/${slug}`,
    priority: "0.6",
    changefreq: slug === "news-a-trendy" ? "daily" : "weekly",
    lastmod: TODAY,
  })),
  ...blogPosts.map((post) => ({
    loc: `/blog/${post.slug}`,
    priority: PILLAR_SLUGS.has(post.slug) ? "0.7" : "0.5",
    changefreq: "monthly",
    lastmod: (post.updated_at ?? post.published_at ?? TODAY).slice(0, 10),
  })),
  ...templates.map((tpl) => ({
    loc: `/sablony/${tpl.slug}`,
    priority: "0.6",
    changefreq: "monthly",
    lastmod: (tpl.updated_at ?? tpl.published_at ?? TODAY).slice(0, 10),
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${ORIGIN}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

await writeFile(resolve(ROOT, "public/sitemap.xml"), xml, "utf8");
console.log(
  `Sitemap written: ${urls.length} URLs (${courses.length} courses, ${packs.length} packs, ${cmsSlugs.length} cms, ${blogPosts.length} blog posts, ${templates.length} templates)`,
);

// Allow being invoked via `node scripts/generate-sitemap.mjs` directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // already executed top-level
}
