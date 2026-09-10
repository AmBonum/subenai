import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AI_SAFETY_ARTICLES,
  AI_SAFETY_CATEGORY_SLUG,
  AI_SAFETY_LESSON_SLUGS,
  AI_SAFETY_PILLAR_SLUG,
  AI_SAFETY_QUIZ_IDS,
} from "@/content/academy/ai-safety-section";
import { COURSES } from "@/content/courses";
import { courseToAcademyRow } from "@/lib/academy/course-to-row";
import { CATEGORY_VISUALS } from "@/lib/blog/category-visuals";
import { PILLAR_SLUGS } from "@/lib/blog/pillar-slugs";
import { getQuestionById } from "@/lib/quiz/bank/questions";

// E65 — the safe-AI section is wired across content, DB seed, SEO and UI
// layers. This suite is the single tripwire that all of them agree.

const ROOT = resolve(__dirname, "..", "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("E65 ai-safety section manifest", () => {
  it("has one pillar, five beginner and five advanced articles", () => {
    const pillar = AI_SAFETY_ARTICLES.filter((a) => a.lane === null);
    expect(pillar.map((a) => a.slug)).toEqual([AI_SAFETY_PILLAR_SLUG]);
    expect(AI_SAFETY_ARTICLES.filter((a) => a.lane === "beginner")).toHaveLength(5);
    expect(AI_SAFETY_ARTICLES.filter((a) => a.lane === "advanced")).toHaveLength(5);
  });

  it("quiz ids are unique and e65-prefixed", () => {
    expect(new Set(AI_SAFETY_QUIZ_IDS).size).toBe(AI_SAFETY_QUIZ_IDS.length);
    for (const id of AI_SAFETY_QUIZ_IDS) expect(id).toMatch(/^e65-[a-z0-9-]+-\d+$/);
  });

  it("every manifest quiz id resolves in the question bank", () => {
    for (const id of AI_SAFETY_QUIZ_IDS) expect(getQuestionById(id), id).not.toBeNull();
  });

  it("every section lesson is a registered course mapped into the section category", () => {
    for (const slug of AI_SAFETY_LESSON_SLUGS) {
      const course = COURSES.find((c) => c.slug === slug);
      expect(course, slug).toBeDefined();
      expect(courseToAcademyRow(course!).category_slug).toBe(AI_SAFETY_CATEGORY_SLUG);
    }
  });
});

describe("E65 category wiring", () => {
  it("category row exists in the migration and the DEPLOY_SETUP mirror", () => {
    expect(read("supabase/migrations/20260910100000_blog_category_ai_safety.sql")).toContain(
      `('${AI_SAFETY_CATEGORY_SLUG}'`,
    );
    expect(read("DEPLOY_SETUP.sql")).toContain(`('${AI_SAFETY_CATEGORY_SLUG}'`);
  });

  it("category has a visual + illustration and is in the sitemap generator", () => {
    expect(CATEGORY_VISUALS[AI_SAFETY_CATEGORY_SLUG]).toBeDefined();
    expect(read("src/components/blog/CategoryIllustration.tsx")).toContain(
      `"${AI_SAFETY_CATEGORY_SLUG}":`,
    );
    expect(read("scripts/generate-sitemap.mjs")).toContain(`"${AI_SAFETY_CATEGORY_SLUG}"`);
  });

  it("pillar is registered in both PILLAR_SLUGS lists", () => {
    expect(PILLAR_SLUGS.has(AI_SAFETY_PILLAR_SLUG)).toBe(true);
    expect(read("scripts/generate-sitemap.mjs")).toContain(`"${AI_SAFETY_PILLAR_SLUG}"`);
  });
});
