import { describe, it, expect } from "vitest";

import { COURSES, courseSchema } from "@/content/courses";

// Wide net over the entire registered course catalog — catches both
// the original courses and every course added by E36 Phase A. Each
// entry must parse through the Zod schema; slugs must be unique and
// match the canonical `[a-z0-9-]+` shape (the same regex that the
// schema enforces, asserted here so a slug regression surfaces with
// a readable "slug X is invalid" failure instead of a generic Zod
// "invalid_string" tucked inside the parse output).
describe("COURSES registry — full-pass schema + slug invariants", () => {
  it("every registered course parses through courseSchema without throwing", () => {
    for (const c of COURSES) {
      expect(
        () => courseSchema.parse(c),
        `course slug=${c.slug} failed schema parse`,
      ).not.toThrow();
    }
  });

  it("registered slugs are globally unique", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const c of COURSES) {
      if (seen.has(c.slug)) duplicates.push(c.slug);
      seen.add(c.slug);
    }
    expect(duplicates).toEqual([]);
  });

  it("every slug matches the canonical [a-z0-9-]+ shape", () => {
    const slugRe = /^[a-z0-9-]+$/;
    for (const c of COURSES) {
      expect(slugRe.test(c.slug), `course slug=${c.slug} does not match [a-z0-9-]+`).toBe(true);
    }
  });
});
