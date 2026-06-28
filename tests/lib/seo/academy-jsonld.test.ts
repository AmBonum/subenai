import { describe, it, expect } from "vitest";
import { buildAcademyJsonLd } from "@/lib/seo/academy-jsonld";
import type { AcademyEntryDetail } from "@/lib/academy/queries";

function entry(over: Partial<AcademyEntryDetail>): AcademyEntryDetail {
  return {
    id: "1",
    slug: "email-phishing",
    title: "Email phishing",
    excerpt: "...",
    hero_image_url: null,
    reading_minutes: null,
    published_at: "2026-01-01",
    content_type: "article",
    difficulty: null,
    estimated_minutes: null,
    hero_emoji: null,
    category: { slug: "phishing", name: "Phishing" },
    author: { slug: "ed", display_name: "Editorial" },
    subtitle: null,
    body_mdx: "",
    seo_title: null,
    seo_description: null,
    og_image_url: null,
    canonical_url: null,
    primary_keyword: null,
    faq_jsonb: null,
    sources: [],
    ...over,
  };
}

describe("buildAcademyJsonLd", () => {
  it("emits a Course node for a lesson", () => {
    const ld = buildAcademyJsonLd(
      entry({ content_type: "lesson", difficulty: "beginner", estimated_minutes: 9 }),
    ) as { "@graph": Array<{ "@type": string; timeRequired?: string }> };
    const main = ld["@graph"][0];
    expect(main["@type"]).toBe("Course");
    expect(main.timeRequired).toBe("PT9M");
  });

  it("emits an Article node for an article", () => {
    const ld = buildAcademyJsonLd(entry({ content_type: "article" })) as {
      "@graph": Array<{ "@type": string }>;
    };
    expect(ld["@graph"][0]["@type"]).toBe("Article");
    expect(ld["@graph"][1]["@type"]).toBe("BreadcrumbList");
  });
});
