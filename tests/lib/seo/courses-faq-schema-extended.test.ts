import { describe, it, expect } from "vitest";

import { COURSES_FAQ_KEYS, buildCoursesFaqJsonLd } from "@/lib/seo/courses-faq-schema";

// E36 Phase B extends the FAQ key list from 5 → 8. These assertions
// pin the new length and verify the JSON-LD wrapper still emits one
// Question per key, in registration order.
describe("COURSES_FAQ_KEYS — Phase B extension to 8 entries", () => {
  it("registers exactly 8 FAQ keys", () => {
    expect(COURSES_FAQ_KEYS.length).toBe(8);
  });
});

describe("buildCoursesFaqJsonLd — 8-entry FAQPage emission", () => {
  it("emits one Question per registered key", () => {
    const ld = buildCoursesFaqJsonLd(
      (k) => `Q ${k}`,
      (k) => `A ${k}`,
    );
    const items = ld.mainEntity as Array<Record<string, unknown>>;
    expect(items).toHaveLength(8);
    items.forEach((item, idx) => {
      expect(item["@type"]).toBe("Question");
      expect(item.name).toBe(`Q ${COURSES_FAQ_KEYS[idx]}`);
      const ans = item.acceptedAnswer as Record<string, unknown>;
      expect(ans["@type"]).toBe("Answer");
      expect(ans.text).toBe(`A ${COURSES_FAQ_KEYS[idx]}`);
    });
  });
});
