// E25 Phase 1 — JSON-LD FAQPage schema builder for /tests.
//
// Lives outside the component file so the TestsFaqSection module
// only exports React components — keeps Vite's HMR / Fast Refresh
// in the happy path (mixing components + plain exports breaks
// the refresh boundary).

/** Static FAQ item keys. Adding a Q/A = add a key here AND a pair
 *  of `testy.faq_q<n>` / `testy.faq_a<n>` entries in sk/en/cs. */
export const TESTS_FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;
export type TestsFaqKey = (typeof TESTS_FAQ_KEYS)[number];

/** Build the JSON-LD FAQPage schema for the route head().
 *  Decoupled from the i18n resolver: callers pass two pure functions
 *  that map a key to its question / answer text. Keeps this module
 *  unit-testable without booting the i18n bundle. */
export function buildTestsFaqJsonLd(
  resolveQ: (key: TestsFaqKey) => string,
  resolveA: (key: TestsFaqKey) => string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TESTS_FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: resolveQ(key),
      acceptedAnswer: {
        "@type": "Answer",
        text: resolveA(key),
      },
    })),
  };
}
