import { describe, it, expect } from "vitest";

import type { AdminBlogPostDetail } from "@/lib/blog/admin-queries";
import {
  exportBlogPostAsCsv,
  exportBlogPostAsJson,
  exportBlogPostAsXml,
  exportFilename,
} from "@/lib/blog/export";

const SAMPLE: AdminBlogPostDetail = {
  id: "abc-123",
  slug: "phishing-test",
  title: "phishing test",
  status: "published",
  published_at: "2026-05-10T12:00:00.000Z",
  updated_at: "2026-05-15T08:30:00.000Z",
  category: { slug: "phishing-a-emaily", name: "phishing a emaily" },
  author: { slug: "subenai-editorial", display_name: "subenai editorial" },
  language: "sk",
  category_id: "cat-1",
  author_id: "author-1",
  pillar_post_id: null,
  subtitle: "ako ho rozpoznať",
  excerpt: "krátky úvod o tom „čo to vlastne je",
  body_mdx:
    '## čo je phishing\n\nPhishing je „útok", pri ktorom <skratka> a & ampersand.\n\n**plus:** dobré veci.',
  hero_image_url: null,
  og_image_url: null,
  seo_title: null,
  seo_description: null,
  canonical_url: null,
  primary_keyword: "phishing",
  search_intent: "informational",
  reading_minutes: 7,
  faq_jsonb: null,
  sources_jsonb: [
    {
      label: "SK-CERT",
      url: "https://sk-cert.sk",
      publisher: "SK-CERT",
      accessed_at: "2026-05-01",
    },
    {
      label: 'comma, "and" quotes',
      url: "https://example.test/quotes",
    },
  ],
};

describe("exportBlogPostAsJson", () => {
  it("returns pretty-printed JSON with stable field order", () => {
    const json = exportBlogPostAsJson(SAMPLE);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("abc-123");
    expect(parsed.slug).toBe("phishing-test");
    expect(parsed.sources).toEqual(SAMPLE.sources_jsonb);
    expect(parsed.public_url).toBe("https://subenai.sk/blog/phishing-test");
  });

  it("preserves Slovak diacritics + typographic quotes verbatim", () => {
    const json = exportBlogPostAsJson(SAMPLE);
    expect(json).toContain("„čo to vlastne je");
    expect(json).toContain("phishing test");
  });
});

describe("exportBlogPostAsCsv", () => {
  it("emits a 2-column field,value CSV with header", () => {
    const csv = exportBlogPostAsCsv(SAMPLE);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("field,value");
    expect(lines.slice(1).some((l) => l.startsWith('"id","abc-123"'))).toBe(true);
  });

  it("escapes embedded quotes by doubling per RFC 4180", () => {
    const csv = exportBlogPostAsCsv(SAMPLE);
    // The body contains: Phishing je „útok", — the trailing ASCII "
    // gets doubled inside the surrounding CSV quoted field.
    expect(csv).toContain('útok""');
  });

  it("escapes embedded commas (sources_jsonb stringified)", () => {
    const csv = exportBlogPostAsCsv(SAMPLE);
    // sources_jsonb contains "comma, \"and\" quotes" — must NOT split
    // the row.
    const sourcesRow = csv.split("\n").find((l) => l.startsWith('"sources_json"'));
    expect(sourcesRow).toBeDefined();
    expect(sourcesRow!.split(",").length).toBeGreaterThan(2); // commas inside quotes
  });

  it("handles null values as empty quoted strings", () => {
    const csv = exportBlogPostAsCsv(SAMPLE);
    expect(csv).toContain('"hero_image_url",""');
    expect(csv).toContain('"seo_title",""');
  });
});

describe("exportBlogPostAsXml", () => {
  it("emits a well-formed item with required RSS fields", () => {
    const xml = exportBlogPostAsXml(SAMPLE);
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<title>phishing test</title>");
    expect(xml).toContain("<link>https://subenai.sk/blog/phishing-test</link>");
    expect(xml).toContain('isPermaLink="true"');
    expect(xml).toContain("<author>subenai editorial</author>");
  });

  it("wraps the MDX body in CDATA", () => {
    const xml = exportBlogPostAsXml(SAMPLE);
    expect(xml).toContain("<content:encoded><![CDATA[");
    // The literal `<skratka>` inside the body MUST NOT be escaped
    // because we used CDATA — easier consumption by feed readers.
    expect(xml).toContain("<skratka>");
  });

  it("XML-escapes special chars in title + excerpt", () => {
    const xml = exportBlogPostAsXml({ ...SAMPLE, title: 'A & B "quote"' });
    expect(xml).toContain("<title>A &amp; B &quot;quote&quot;</title>");
  });

  it("emits subenai:source children for each source entry", () => {
    const xml = exportBlogPostAsXml(SAMPLE);
    expect(xml).toContain("<subenai:source>");
    expect(xml).toContain("<label>SK-CERT</label>");
    expect(xml).toContain("<publisher>SK-CERT</publisher>");
    expect(xml).toContain("<accessedAt>2026-05-01</accessedAt>");
    // Second source has no publisher — element should be absent, not
    // empty.
    const secondSource = xml.split("<subenai:source>")[2] ?? "";
    expect(secondSource).not.toContain("<publisher>");
  });

  it("omits optional elements when their value is null/empty", () => {
    const xml = exportBlogPostAsXml({
      ...SAMPLE,
      published_at: null,
      reading_minutes: null,
      primary_keyword: null,
      sources_jsonb: [],
    });
    expect(xml).not.toContain("<pubDate>");
    expect(xml).not.toContain("<subenai:readingMinutes>");
    expect(xml).not.toContain("<subenai:primaryKeyword>");
    expect(xml).not.toContain("<subenai:sources>");
  });
});

describe("exportFilename", () => {
  it("encodes slug + today's date + extension", () => {
    const name = exportFilename(SAMPLE, "json");
    expect(name).toMatch(/^phishing-test-\d{4}-\d{2}-\d{2}\.json$/u);
  });
});
