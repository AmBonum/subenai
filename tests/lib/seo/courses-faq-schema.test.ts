import { describe, it, expect } from "vitest";

import {
  COURSES_FAQ_KEYS,
  buildCoursesFaqJsonLd,
  type CoursesFaqKey,
} from "@/lib/seo/courses-faq-schema";

const fakeQ = (key: CoursesFaqKey) => `CQ-${key}`;
const fakeA = (key: CoursesFaqKey) => `CA-${key}`;

describe("buildCoursesFaqJsonLd — E25 Phase 2 FAQPage schema", () => {
  it("emits @context + @type as FAQPage", () => {
    const ld = buildCoursesFaqJsonLd(fakeQ, fakeA);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
  });

  it("emits one Question entry per registered key", () => {
    const ld = buildCoursesFaqJsonLd(fakeQ, fakeA);
    const items = ld.mainEntity as Array<Record<string, unknown>>;
    expect(items).toHaveLength(COURSES_FAQ_KEYS.length);
    items.forEach((item, idx) => {
      expect(item["@type"]).toBe("Question");
      expect(item.name).toBe(`CQ-${COURSES_FAQ_KEYS[idx]}`);
    });
  });

  it("wraps each answer in an Answer subtype", () => {
    const ld = buildCoursesFaqJsonLd(fakeQ, fakeA);
    const items = ld.mainEntity as Array<{ acceptedAnswer: Record<string, unknown> }>;
    items.forEach((item, idx) => {
      expect(item.acceptedAnswer["@type"]).toBe("Answer");
      expect(item.acceptedAnswer.text).toBe(`CA-${COURSES_FAQ_KEYS[idx]}`);
    });
  });
});
