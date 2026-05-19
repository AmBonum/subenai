// E17.4 — quiz-category → (course, article) recommendation map.
//
// Single source of truth for "if a user scored low on category X, what
// should we suggest next?" v1 logic is a hardcoded mapping — small,
// type-checked, and reviewable in a single screen. A DB-backed
// recommendation engine is out of scope until we have data to justify
// dynamic weighting.
//
// Both slugs are best-effort:
//   - courseSlug is verified against the static COURSES registry below
//     (compile-time would be ideal but COURSES is a runtime-built array;
//      the dev assertion at module load guards against typos).
//   - pillarSlug points at a published blog post; if the post doesn't
//     exist (or isn't published yet) the WeakCategoryRecommendations
//     component degrades gracefully and only renders the course half.
//
// Weak-threshold default: 50 %. Anything below means the user hit
// fewer than half of that category's questions — high enough signal to
// surface a learning path, low enough to actually fire on most attempts
// (the median user gets ~60 % in their first try).

import { COURSES } from "@/content/courses";
import type { ScoreResult } from "@/lib/quiz/score/scoring";

export type QuizCategory = keyof ScoreResult["breakdown"];

export interface CategoryRecommendation {
  courseSlug: string;
  pillarSlug: string;
}

export const WEAK_CATEGORY_THRESHOLD = 50;

export const CATEGORY_RECOMMENDATIONS: Record<QuizCategory, CategoryRecommendation> = {
  phishing: {
    courseSlug: "email-phishing",
    pillarSlug: "phishing-kompletny-sprievodca",
  },
  url: {
    // URL-spotting drills are partly in malvertising (fake landing pages)
    // and partly in phishing — the pillar is the same comprehensive
    // phishing guide; the course angle is malvertising because URL
    // forensics is the dominant section there.
    courseSlug: "malvertising-fake-reklamy",
    pillarSlug: "phishing-kompletny-sprievodca",
  },
  fake_vs_real: {
    courseSlug: "ai-hlasove-a-deepfake-podvody",
    pillarSlug: "ai-a-moderne-podvody-deepfake-voice-cloning",
  },
  scenario: {
    // Scenario questions are situational ("co by si urobil keby…") —
    // marketplace covers the broadest catalogue of real-world situations.
    // Pillar is SMS/voice because the most common scenario surfaces are
    // text-message and phone-based intrusions.
    courseSlug: "marketplace-bazos-podvody",
    pillarSlug: "scam-sms-a-podvodne-hovory",
  },
};

// Module-load sanity check: every courseSlug in the map MUST resolve
// to a registered course. If someone renames a course file and forgets
// to update the map, this fires in dev/CI instead of silently rendering
// a broken card. Production bundles still ship — we throw only on
// startup, and the build will have caught it.
const REGISTERED_COURSE_SLUGS = new Set(COURSES.map((c) => c.slug));
for (const [category, rec] of Object.entries(CATEGORY_RECOMMENDATIONS)) {
  if (!REGISTERED_COURSE_SLUGS.has(rec.courseSlug)) {
    throw new Error(
      `CATEGORY_RECOMMENDATIONS[${category}].courseSlug='${rec.courseSlug}' is not in COURSES registry`,
    );
  }
}

export function getWeakCategories(
  breakdown: ScoreResult["breakdown"],
  threshold: number = WEAK_CATEGORY_THRESHOLD,
): QuizCategory[] {
  return (Object.keys(breakdown) as QuizCategory[])
    .filter((k) => breakdown[k] < threshold)
    .sort((a, b) => breakdown[a] - breakdown[b]);
}
