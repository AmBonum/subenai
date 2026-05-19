import { describe, expect, it } from "vitest";

import { COURSES } from "@/content/courses";
import {
  CATEGORY_RECOMMENDATIONS,
  WEAK_CATEGORY_THRESHOLD,
  getWeakCategories,
  type QuizCategory,
} from "@/lib/quiz/category-recommendations";

describe("category-recommendations", () => {
  it("covers all four scoring categories", () => {
    const expected: QuizCategory[] = ["phishing", "url", "fake_vs_real", "scenario"];
    expect(new Set(Object.keys(CATEGORY_RECOMMENDATIONS))).toEqual(new Set(expected));
  });

  it("every courseSlug resolves to a registered course (compile/runtime safety)", () => {
    const registered = new Set(COURSES.map((c) => c.slug));
    for (const rec of Object.values(CATEGORY_RECOMMENDATIONS)) {
      expect(registered.has(rec.courseSlug)).toBe(true);
    }
  });

  it("WEAK_CATEGORY_THRESHOLD is 50 (UI copy assumes this)", () => {
    expect(WEAK_CATEGORY_THRESHOLD).toBe(50);
  });

  it("getWeakCategories returns categories strictly below threshold, sorted ascending", () => {
    const weak = getWeakCategories({ phishing: 49, url: 70, fake_vs_real: 30, scenario: 50 });
    expect(weak).toEqual(["fake_vs_real", "phishing"]);
  });

  it("returns empty array when every category meets or exceeds threshold", () => {
    expect(getWeakCategories({ phishing: 80, url: 70, fake_vs_real: 90, scenario: 60 })).toEqual(
      [],
    );
  });

  it("returns all four categories when every score is 0", () => {
    const weak = getWeakCategories({ phishing: 0, url: 0, fake_vs_real: 0, scenario: 0 });
    expect(weak.length).toBe(4);
  });

  it("threshold edge case — exactly 50 is NOT weak (strict <)", () => {
    expect(getWeakCategories({ phishing: 50, url: 50, fake_vs_real: 50, scenario: 50 })).toEqual(
      [],
    );
  });

  it("accepts a custom threshold", () => {
    const weak = getWeakCategories({ phishing: 60, url: 80, fake_vs_real: 65, scenario: 75 }, 70);
    expect(weak).toEqual(["phishing", "fake_vs_real"]);
  });
});
