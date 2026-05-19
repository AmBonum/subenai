// schema.org FAQPage JSON-LD builder.
//
// Google indexes FAQPage entries as a rich-result accordion under the
// SERP listing — high-leverage SEO surface for any page whose primary
// content is Q&A. We emit one JSON-LD blob for the entire home FAQ
// (flattened from the category groups) because schema.org's FAQPage
// doesn't have a native category concept — categories live in the UI,
// not in the structured data.

export interface FaqEntry {
  question: string;
  // Plain-text answer. Strip markup before passing; Google rejects
  // HTML inside `Answer.text` per the structured-data docs.
  answer: string;
}

export function buildFaqJsonLd(entries: ReadonlyArray<FaqEntry>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };
}
