#!/usr/bin/env node
// Build-time RSS 2.0 feed generator for /academy.
//
// Queries Supabase via PostgREST (anon publishable key — RLS already
// filters to status='published' AND published_at <= now()). Writes
// public/academy/rss.xml; Vite copies it to dist/client/academy/rss.xml on
// build so /academy/rss.xml resolves at the CF edge.
//
// Env vars (accepts both CF Pages-style VITE_ prefix and bare):
//   VITE_SUPABASE_URL or SUPABASE_URL — Supabase project URL
//   VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY — anon key
//
// If env vars are missing (e.g. local dev without .env), the script
// emits an empty feed (channel metadata only) and warns — does NOT
// fail the build, so contributors can run `npm run build` offline.
//
// Caveat: build-time RSS means the feed lags by one deploy. Whenever
// an article is published via /admin/blog/$id (DB-only change, no
// code commit), readers won't see it in the feed until the next CF
// Pages build runs. Acceptable for a blog publishing ~weekly; if we
// need fresher feeds later, switch to a CF Pages Function that
// queries Supabase at request time.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ORIGIN = "https://subenai.sk";
const OUTPUT = resolve(ROOT, "public/academy/rss.xml");
const MAX_ITEMS = 50;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

async function fetchPublishedPosts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      "[blog-rss] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set; emitting empty feed.",
    );
    return [];
  }
  const select =
    "slug,title,excerpt,published_at,category:blog_categories(name),author:blog_authors(display_name)";
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&order=published_at.desc&limit=${MAX_ITEMS}&select=${encodeURIComponent(select)}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[blog-rss] Supabase fetch returned ${res.status}; emitting empty feed.`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[blog-rss] Supabase fetch failed: ${err.message}; emitting empty feed.`);
    return [];
  }
}

const posts = await fetchPublishedPosts();
const buildDate = new Date().toUTCString();

const items = posts
  .map(
    (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${ORIGIN}/academy/${p.slug}</link>
      <guid isPermaLink="true">${ORIGIN}/academy/${p.slug}</guid>
      <description>${escapeXml(p.excerpt ?? "")}</description>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(p.category?.name ?? "blog")}</category>
      <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${escapeXml(p.author?.display_name ?? "subenai editorial")}</dc:creator>
    </item>`,
  )
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>subenai akadémia</title>
    <link>${ORIGIN}/academy</link>
    <description>Akadémia o internetových podvodoch — kurzy a články o digitálnej bezpečnosti pre slovenských čitateľov.</description>
    <language>sk-SK</language>
    <copyright>© ${new Date().getFullYear()} subenai</copyright>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${ORIGIN}/academy/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, rss, "utf8");
console.log(
  `[blog-rss] Wrote ${posts.length} item${posts.length === 1 ? "" : "s"} → public/academy/rss.xml`,
);
