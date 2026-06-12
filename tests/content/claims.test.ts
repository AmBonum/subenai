import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COURSE_COUNT, QUICK_TEST_QUESTION_COUNT, QUICK_TEST_TIME_CLAIM } from "@/content/claims";
import { COURSES } from "@/content/courses";
import skMarketing from "@/i18n/locales/sk/marketing.json";
import skQuiz from "@/i18n/locales/sk/quiz.json";
import skLegal from "@/i18n/locales/sk/legal.json";

// The i18n resolver only interpolates vars passed at call sites, so the
// locale JSON carries these numbers as literals. This suite is the tripwire
// that fails when reality (claims.ts) and copy drift apart.

describe("claims constants", () => {
  it("QUICK_TEST_QUESTION_COUNT matches QUICK_TEST_SIZE in TestFlow", () => {
    // QUICK_TEST_SIZE is module-private in TestFlow.tsx (owned elsewhere),
    // so assert against the source text instead of an import.
    const src = readFileSync(
      resolve(__dirname, "../../src/components/quiz/flow/TestFlow.tsx"),
      "utf-8",
    );
    const match = src.match(/const QUICK_TEST_SIZE = (\d+);/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(QUICK_TEST_QUESTION_COUNT);
  });

  it("COURSE_COUNT reflects the course registry", () => {
    expect(COURSE_COUNT).toBe(COURSES.length);
    expect(COURSE_COUNT).toBeGreaterThan(0);
  });
});

describe("sk copy carries the canonical numbers", () => {
  it("home hero uses the canonical time claim", () => {
    expect(skMarketing.home.hero_seconds).toBe(QUICK_TEST_TIME_CLAIM);
    expect(skMarketing.home.hero_lead).toContain(`${QUICK_TEST_QUESTION_COUNT} otázok`);
    expect(skMarketing.home.hero_lead).toContain(QUICK_TEST_TIME_CLAIM);
  });

  it("header quick-test menu entry matches", () => {
    expect(skMarketing.header.menu.rychly_test.desc).toContain(
      `${QUICK_TEST_QUESTION_COUNT} otázok za ${QUICK_TEST_TIME_CLAIM}`,
    );
  });

  it("course count claims match the registry", () => {
    expect(skMarketing.home.feature_skolenia_desc.startsWith(`${COURSE_COUNT} kurzov`)).toBe(true);
    expect(skQuiz.skolenia.page_heading.startsWith(`${COURSE_COUNT} `)).toBe(true);
  });

  it("standard-test claims match the quick test size", () => {
    expect(skQuiz.testy.cta_standard).toBe(`Štandardný test (${QUICK_TEST_QUESTION_COUNT} otázok)`);
    expect(skQuiz.testy.faq_a2).toContain(`${QUICK_TEST_QUESTION_COUNT} otázok`);
    expect(skQuiz.share.og_description).toContain(`${QUICK_TEST_QUESTION_COUNT} otázok`);
    expect(skLegal.privacy.s2.answers_text).toContain(`${QUICK_TEST_QUESTION_COUNT} otázok`);
  });

  it("no stale numeric claims survive anywhere in sk copy", () => {
    const all = JSON.stringify([skMarketing, skQuiz, skLegal]);
    expect(all).not.toMatch(/\b15 otázok/);
    expect(all).not.toMatch(/\b8 kurzov/);
    expect(all).not.toMatch(/\b5 témach/);
    expect(all).not.toMatch(/3-minútov/);
  });
});
