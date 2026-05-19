import { describe, it, expect } from "vitest";

import {
  buildCourseJsonLd,
  buildCoursesItemListJsonLd,
  type CourseJsonLdInput,
} from "@/lib/seo/courses-jsonld";

const fixture: CourseJsonLdInput = {
  slug: "email-phishing",
  title: "Email phishing",
  tagline: "Ako rozpoznať podvodný e-mail.",
  estimatedMinutes: 10,
  publishedAt: "2026-04-01",
  updatedAt: "2026-04-15",
};

describe("buildCourseJsonLd — E25 Phase 2 schema.org Course", () => {
  it("emits @type Course with the canonical URL", () => {
    const ld = buildCourseJsonLd(fixture);
    expect(ld["@type"]).toBe("Course");
    expect(ld.url).toBe("https://subenai.sk/courses/email-phishing");
  });

  it("sets isAccessibleForFree + offers.price=0 so Google renders 'Free'", () => {
    const ld = buildCourseJsonLd(fixture);
    expect(ld.isAccessibleForFree).toBe(true);
    expect((ld.offers as Record<string, unknown>).price).toBe(0);
    expect((ld.offers as Record<string, unknown>).priceCurrency).toBe("EUR");
  });

  it("encodes time required as ISO-8601 duration (PT10M for 10 minutes)", () => {
    const ld = buildCourseJsonLd(fixture);
    expect(ld.timeRequired).toBe("PT10M");
    const ci = ld.hasCourseInstance as Record<string, unknown>;
    expect(ci.courseWorkload).toBe("PT10M");
  });

  it("propagates published + modified dates from the source row", () => {
    const ld = buildCourseJsonLd(fixture);
    expect(ld.datePublished).toBe("2026-04-01");
    expect(ld.dateModified).toBe("2026-04-15");
  });

  it("hard-codes provider to subenai (first-party content)", () => {
    const ld = buildCourseJsonLd(fixture);
    const provider = ld.provider as Record<string, unknown>;
    expect(provider["@type"]).toBe("Organization");
    expect(provider.name).toBe("subenai");
    expect(provider.url).toBe("https://subenai.sk");
  });
});

describe("buildCoursesItemListJsonLd — catalog wrapper", () => {
  it("emits @type ItemList with one ListItem per course", () => {
    const ld = buildCoursesItemListJsonLd([fixture], "Bezplatné kurzy");
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.name).toBe("Bezplatné kurzy");
    const items = ld.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].position).toBe(1);
    expect(items[0].url).toBe("https://subenai.sk/courses/email-phishing");
  });
});
