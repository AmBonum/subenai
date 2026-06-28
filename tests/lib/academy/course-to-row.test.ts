import { describe, it, expect } from "vitest";
import { courseToAcademyRow, LESSON_AUTHOR_SLUG } from "@/lib/academy/course-to-row";
import { COURSES } from "@/content/courses";
import type { Course } from "@/content/courses";

const sample: Course = {
  slug: "demo",
  title: "Demo",
  tagline: "Demo tagline.",
  category: "investicie",
  difficulty: "pokročilý",
  estimatedMinutes: 8,
  heroEmoji: "📈",
  publishedAt: "2026-02-02",
  updatedAt: "2026-02-02",
  sections: [{ kind: "intro", heading: "Úvod", body: "Text." }],
  sources: [{ label: "Zdroj", url: "https://example.org" }],
};

describe("courseToAcademyRow", () => {
  it("maps a course into a published lesson row", () => {
    const row = courseToAcademyRow(sample);
    expect(row).toMatchObject({
      slug: "demo",
      language: "sk",
      category_slug: "digitalna-bezpecnost",
      author_slug: LESSON_AUTHOR_SLUG,
      content_type: "lesson",
      difficulty: "advanced",
      estimated_minutes: 8,
      reading_minutes: 8,
      hero_emoji: "📈",
      status: "published",
      published_at: "2026-02-02",
      excerpt: "Demo tagline.",
      subtitle: "Demo tagline.",
    });
    expect(row.body_mdx).toContain("## Úvod");
    expect(row.sources).toEqual([{ label: "Zdroj", url: "https://example.org" }]);
  });

  it("maps every registered course to a known category + difficulty", () => {
    const categories = new Set([
      "sms-a-telefon",
      "phishing-a-emaily",
      "fake-eshopy",
      "socialne-siete",
      "digitalna-bezpecnost",
      "cyber-hygiena",
    ]);
    for (const course of COURSES) {
      const row = courseToAcademyRow(course);
      expect(categories.has(row.category_slug), `${course.slug} → ${row.category_slug}`).toBe(true);
      expect(["beginner", "advanced"]).toContain(row.difficulty);
      expect(row.body_mdx.length).toBeGreaterThan(0);
    }
  });
});
