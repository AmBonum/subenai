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
  { loc: "/testy", priority: "0.9", changefreq: "weekly" },
  { loc: "/skolenia", priority: "0.9", changefreq: "weekly" },
  { loc: "/cookies", priority: "0.3", changefreq: "yearly" },
  { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  { loc: "/o-projekte", priority: "0.5", changefreq: "monthly" },
  { loc: "/kontakt", priority: "0.5", changefreq: "yearly" },
  { loc: "/podpora", priority: "0.6", changefreq: "monthly" },
  { loc: "/sponzori", priority: "0.4", changefreq: "weekly" },
  { loc: "/sponzori/vsetci", priority: "0.3", changefreq: "weekly" },
  { loc: "/spravovat-podporu", priority: "0.3", changefreq: "yearly" },
  { loc: "/zmeny", priority: "0.4", changefreq: "weekly" },
  { loc: "/test/zostav", priority: "0.7", changefreq: "monthly" },
  { loc: "/skoly", priority: "0.7", changefreq: "monthly" },
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

async function loadCmsPublishedSlugs() {
  // AH-9.9: enumerate published CMS slugs for the sitemap. In the
  // mock-only AH-9 phase, parse the seed array in cms-mock-store.ts.
  // AH-11 swaps this for a Supabase query at build time.
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(resolve(ROOT, "src/lib/admin/cms-mock-store.ts"), "utf8");
  const blockRe = /slug:\s*"([a-z0-9-]+)"[\s\S]*?status:\s*"(published|draft)"/g;
  const slugs = [];
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    if (m[2] === "published") slugs.push(m[1]);
  }
  return slugs;
}

const cmsSlugs = await loadCmsPublishedSlugs();

const urls = [
  ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: TODAY })),
  ...courses.map((c) => ({
    loc: `/skolenia/${c.slug}`,
    priority: "0.8",
    changefreq: "monthly",
    lastmod: c.lastmod,
  })),
  ...packs.map((p) => ({
    loc: `/testy/${p.slug}`,
    priority: "0.85",
    changefreq: "monthly",
    lastmod: p.lastmod,
  })),
  ...cmsSlugs.map((slug) => ({
    loc: `/s/${slug}`,
    priority: "0.5",
    changefreq: "monthly",
    lastmod: TODAY,
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
  `Sitemap written: ${urls.length} URLs (${courses.length} courses, ${packs.length} packs, ${cmsSlugs.length} cms)`,
);

// Allow being invoked via `node scripts/generate-sitemap.mjs` directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // already executed top-level
}
