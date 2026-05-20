// Slovak grammatical number agrees with the count in three forms:
//   - 1            → singular nominative  ("1 článok")
//   - 2, 3, 4      → plural  nominative  ("2 články")
//   - 5+ and 0     → plural  genitive    ("5 článkov", "0 článkov")
//
// This helper handles the common "count + noun" cases that surface in
// blog count badges (post count on category + author archives, etc.).
// Add new noun trios here as they're needed; do NOT inline ternaries
// at call-sites or the 2-3-4 case silently regresses (see the bug
// fixed in routes/blog/{kategoria,autor}/$slug.lazy.tsx).

interface PluralForms {
  // The singular nominative form (used with 1).
  one: string;
  // The plural nominative form (used with 2, 3, 4).
  few: string;
  // The plural genitive form (used with 5+, 0, and large numbers).
  many: string;
}

const FORMS: Record<string, PluralForms> = {
  article: { one: "článok", few: "články", many: "článkov" },
  published_article: {
    one: "publikovaný článok",
    few: "publikované články",
    many: "publikovaných článkov",
  },
  question: { one: "otázka", few: "otázky", many: "otázok" },
  pillar: {
    one: "hĺbkový sprievodca",
    few: "hĺbkoví sprievodcovia",
    many: "hĺbkových sprievodcov",
  },
};

function pickForm(n: number, forms: PluralForms): string {
  if (n === 1) return forms.one;
  if (n >= 2 && n <= 4) return forms.few;
  return forms.many;
}

export function formatArticleCount(n: number): string {
  return `${n} ${pickForm(n, FORMS.article)}`;
}

export function formatPublishedArticleCount(n: number): string {
  return `${n} ${pickForm(n, FORMS.published_article)}`;
}

export function formatQuestionCount(n: number): string {
  return `${n} ${pickForm(n, FORMS.question)}`;
}

export function formatPillarCount(n: number): string {
  return `${n} ${pickForm(n, FORMS.pillar)}`;
}
