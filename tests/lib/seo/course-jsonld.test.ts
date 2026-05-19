import { describe, it, expect } from "vitest";
import { buildCourseJsonLd } from "@/lib/seo/course-jsonld";
import type { Course } from "@/content/courses";

const fixture: Course = {
  slug: "test-course",
  title: "Testovací kurz",
  tagline: "Krátky popis pre SEO.",
  category: "obecne",
  difficulty: "začiatočník",
  estimatedMinutes: 5,
  heroEmoji: "🧪",
  sections: [{ kind: "intro", heading: "Úvod", body: "Telo úvodu." }],
  publishedAt: "2026-04-26",
  updatedAt: "2026-04-26",
};

describe("buildCourseJsonLd", () => {
  it("returns a valid Schema.org Course object", () => {
    const json = buildCourseJsonLd(fixture);
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("Course");
    expect(json.name).toBe(fixture.title);
    expect(json.description).toBe(fixture.tagline);
    expect(json.inLanguage).toBe("sk-SK");
    expect(json.isAccessibleForFree).toBe(true);
  });

  it("includes ISO 8601 duration computed from estimatedMinutes", () => {
    const json = buildCourseJsonLd({ ...fixture, estimatedMinutes: 12 });
    expect(json.timeRequired).toBe("PT12M");
  });

  it("URL points at the canonical /courses/<slug> path", () => {
    const json = buildCourseJsonLd(fixture);
    expect(json.url).toBe("https://subenai.sk/courses/test-course");
  });

  it("provider is the site Organization", () => {
    const json = buildCourseJsonLd(fixture);
    const provider = json.provider as { "@type": string; name: string };
    expect(provider["@type"]).toBe("Organization");
    expect(provider.name).toBe("subenai");
  });

  it("serializes cleanly to JSON (no functions / undefined)", () => {
    const json = buildCourseJsonLd(fixture);
    const str = JSON.stringify(json);
    expect(() => JSON.parse(str)).not.toThrow();
  });
});
