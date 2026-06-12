import { COURSES } from "@/content/courses";

// Single source of truth for numeric claims that appear in marketing /
// legal / quiz copy. The i18n resolver only interpolates vars passed at
// call sites, so locale JSON hardcodes these values as literals —
// tests/content/claims.test.ts fails when copy drifts from these
// constants (and QUICK_TEST_QUESTION_COUNT is asserted against
// QUICK_TEST_SIZE in src/components/quiz/flow/TestFlow.tsx).
export const QUICK_TEST_QUESTION_COUNT = 10;

// Canonical time claim for the quick test — the home hero set the
// precedent; every other surface must match it.
export const QUICK_TEST_TIME_CLAIM = "90 sekúnd";

export const COURSE_COUNT = COURSES.length;
