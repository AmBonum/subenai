// E25 Phase 2 — JSON-LD FAQPage schema builder for /courses.
//
// Pattern reused from src/lib/seo/tests-faq-schema.ts — pure resolver
// pair, no React or i18n imports, unit-testable in isolation.

export const COURSES_FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;
export type CoursesFaqKey = (typeof COURSES_FAQ_KEYS)[number];

export function buildCoursesFaqJsonLd(
  resolveQ: (key: CoursesFaqKey) => string,
  resolveA: (key: CoursesFaqKey) => string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COURSES_FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: resolveQ(key),
      acceptedAnswer: {
        "@type": "Answer",
        text: resolveA(key),
      },
    })),
  };
}
