// E16.5 — single-article export to JSON / CSV / XML.
//
// The admin /blog editor surfaces three "Export" buttons; each calls
// one of these formatters with the AdminBlogPostDetail row and gets
// back a string ready to drop into a Blob download. Pure functions —
// no DOM, no fetch — so they unit-test cleanly and can be reused
// server-side for bulk export if ever needed.
//
// Formats:
//   • JSON — pretty-printed object (sources_jsonb collapsed back to a
//     plain array on the wire). Useful for backup / data interchange.
//   • CSV  — two-column key=value (NOT a typical row-per-record CSV;
//     a single article spans dozens of fields, so wide form is more
//     usable in Excel). Multi-line values are quoted; embedded quotes
//     get doubled per RFC 4180.
//   • XML  — RSS-item-shaped fragment so the export can be hand-pasted
//     into a custom feed. Title, description, link, content:encoded
//     for the MDX body, plus a <subenai:*> namespace for our domain-
//     specific fields (category, pillar, sources, reading_minutes).
//
// All three formatters take the same shape (AdminBlogPostDetail) so
// the caller can pipe one record through each without re-shaping.

import type { AdminBlogPostDetail } from "./admin-queries";

const SITE_ORIGIN = "https://subenai.sk";

// ---- JSON ----------------------------------------------------------------

export function exportBlogPostAsJson(post: AdminBlogPostDetail): string {
  // Indented JSON for human readability. Stringify in a stable key
  // order to make diff-friendly exports — Object.keys() preserves
  // insertion order so we explicitly enumerate fields.
  const out = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    body_mdx: post.body_mdx,
    language: post.language,
    status: post.status,
    published_at: post.published_at,
    updated_at: post.updated_at,
    reading_minutes: post.reading_minutes,
    primary_keyword: post.primary_keyword,
    search_intent: post.search_intent,
    seo_title: post.seo_title,
    seo_description: post.seo_description,
    canonical_url: post.canonical_url,
    hero_image_url: post.hero_image_url,
    og_image_url: post.og_image_url,
    pillar_post_id: post.pillar_post_id,
    category: post.category,
    author: post.author,
    sources: post.sources_jsonb,
    faq: post.faq_jsonb,
    public_url: `${SITE_ORIGIN}/blog/${post.slug}`,
  };
  return JSON.stringify(out, null, 2);
}

// ---- CSV -----------------------------------------------------------------

// Quote per RFC 4180 — wrap in double-quotes when the value contains a
// quote, comma, or newline; embedded quotes are doubled. We always
// quote so the CSV stays consistent regardless of which field has
// special chars.
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return `"${s.replace(/"/gu, '""')}"`;
}

export function exportBlogPostAsCsv(post: AdminBlogPostDetail): string {
  // Wide-form: one row per field. Headers = field names, second row =
  // values. Excel + Google Sheets parse this correctly and the result
  // is much more usable for a single article than a 30-column flat row.
  const rows: ReadonlyArray<readonly [string, unknown]> = [
    ["id", post.id],
    ["slug", post.slug],
    ["title", post.title],
    ["subtitle", post.subtitle],
    ["excerpt", post.excerpt],
    ["body_mdx", post.body_mdx],
    ["language", post.language],
    ["status", post.status],
    ["published_at", post.published_at],
    ["updated_at", post.updated_at],
    ["reading_minutes", post.reading_minutes],
    ["primary_keyword", post.primary_keyword],
    ["search_intent", post.search_intent],
    ["seo_title", post.seo_title],
    ["seo_description", post.seo_description],
    ["canonical_url", post.canonical_url],
    ["hero_image_url", post.hero_image_url],
    ["og_image_url", post.og_image_url],
    ["pillar_post_id", post.pillar_post_id],
    ["category_slug", post.category.slug],
    ["category_name", post.category.name],
    ["author_slug", post.author.slug],
    ["author_display_name", post.author.display_name],
    ["sources_json", JSON.stringify(post.sources_jsonb)],
    ["faq_json", JSON.stringify(post.faq_jsonb)],
    ["public_url", `${SITE_ORIGIN}/blog/${post.slug}`],
  ];
  const header = "field,value";
  const lines = rows.map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`);
  return [header, ...lines].join("\n") + "\n";
}

// ---- XML -----------------------------------------------------------------

// Minimal XML escape — covers the five characters that MUST be
// escaped inside element text per the XML spec. We use CDATA only for
// the body (MDX has < and & all over). Attribute values get the full
// five-char escape.
function xmlEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  return s
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

function cdata(value: string): string {
  // Defensive — CDATA can't contain the end-marker `]]>`. We split it
  // across two CDATA sections if the body ever contains that exact
  // sequence (rare for SK prose; safer to handle). Plain split+join
  // avoids ESLint/parser confusion over the regex form.
  const END = "]" + "]" + ">";
  const safe = value.split(END).join("]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

export function exportBlogPostAsXml(post: AdminBlogPostDetail): string {
  const url = `${SITE_ORIGIN}/blog/${post.slug}`;
  const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : "";
  const sourcesXml =
    post.sources_jsonb.length === 0
      ? ""
      : post.sources_jsonb
          .map(
            (s) =>
              `    <subenai:source>\n` +
              `      <label>${xmlEscape(s.label)}</label>\n` +
              `      <url>${xmlEscape(s.url)}</url>\n` +
              (s.publisher ? `      <publisher>${xmlEscape(s.publisher)}</publisher>\n` : "") +
              (s.accessed_at
                ? `      <accessedAt>${xmlEscape(s.accessed_at)}</accessedAt>\n`
                : "") +
              `    </subenai:source>`,
          )
          .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<item xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:subenai="https://subenai.sk/ns/blog">`,
    `  <title>${xmlEscape(post.title)}</title>`,
    `  <link>${xmlEscape(url)}</link>`,
    `  <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
    pubDate ? `  <pubDate>${xmlEscape(pubDate)}</pubDate>` : "",
    `  <description>${xmlEscape(post.excerpt)}</description>`,
    `  <content:encoded>${cdata(post.body_mdx)}</content:encoded>`,
    `  <category domain="${xmlEscape(`${SITE_ORIGIN}/blog/kategoria/${post.category.slug}`)}">${xmlEscape(post.category.name)}</category>`,
    `  <author>${xmlEscape(post.author.display_name)}</author>`,
    `  <subenai:slug>${xmlEscape(post.slug)}</subenai:slug>`,
    `  <subenai:status>${xmlEscape(post.status)}</subenai:status>`,
    `  <subenai:language>${xmlEscape(post.language)}</subenai:language>`,
    post.reading_minutes != null
      ? `  <subenai:readingMinutes>${post.reading_minutes}</subenai:readingMinutes>`
      : "",
    post.primary_keyword
      ? `  <subenai:primaryKeyword>${xmlEscape(post.primary_keyword)}</subenai:primaryKeyword>`
      : "",
    sourcesXml ? `  <subenai:sources>\n${sourcesXml}\n  </subenai:sources>` : "",
    `</item>`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// ---- Filename helpers ---------------------------------------------------

export function exportFilename(post: AdminBlogPostDetail, ext: "json" | "csv" | "xml"): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${post.slug}-${date}.${ext}`;
}
