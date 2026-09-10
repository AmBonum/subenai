// E65 — single source of truth for the "Bezpečná práca s AI" academy section.
// Consumed by the SQL backfill generator (which MDX files ship), the section
// integrity test (links, quizzes, word bands) and docs copy. Adding an article
// = add the MDX file AND a row here.

export const AI_SAFETY_CATEGORY_SLUG = "bezpecna-praca-s-ai";
export const AI_SAFETY_PILLAR_SLUG = "bezpecna-praca-s-ai-kompletny-sprievodca";

export type AiSafetyLane = "beginner" | "advanced";

export interface AiSafetyArticle {
  slug: string;
  // null = both audiences (the pillar); rendered without a lane badge and
  // matched by every lane filter.
  lane: AiSafetyLane | null;
  // Question-bank ids embedded as [[quiz:<id>]] — exactly once each.
  quizIds: readonly string[];
}

export const AI_SAFETY_ARTICLES: ReadonlyArray<AiSafetyArticle> = [
  {
    slug: AI_SAFETY_PILLAR_SLUG,
    lane: null,
    quizIds: ["e65-chatgpt-domena-url-1", "e65-ai-odpoved-bez-zdroja-1"],
  },
  {
    slug: "co-nikdy-nepisat-do-chatgpt-realne-pripady",
    lane: "beginner",
    quizIds: ["e65-chatgpt-rodne-cislo-1"],
  },
  { slug: "ai-halucinacie-ako-overit-odpoved", lane: "beginner", quizIds: ["e65-ai-citacia-sud-1"] },
  {
    slug: "nastavenia-sukromia-chatgpt-gemini-copilot-claude",
    lane: "beginner",
    quizIds: ["e65-chatgpt-docasny-chat-1"],
  },
  {
    slug: "falosne-ai-aplikacie-a-rozsirenia",
    lane: "beginner",
    quizIds: ["e65-fake-chatgpt-rozsirenie-1"],
  },
  { slug: "ai-chatboti-a-deti-co-nastavit", lane: "beginner", quizIds: ["e65-dieta-ai-kamarat-1"] },
  {
    slug: "prompt-injection-realne-pripady-a-obrana",
    lane: "advanced",
    quizIds: ["e65-prompt-injection-email-1"],
  },
  {
    slug: "shadow-ai-vo-firme-politika-pouzivania",
    lane: "advanced",
    quizIds: ["e65-shadow-ai-zmluva-1"],
  },
  {
    slug: "ai-agenti-mcp-bezpecnostny-checklist",
    lane: "advanced",
    quizIds: ["e65-mcp-tool-ticket-1"],
  },
  { slug: "owasp-top-10-pre-llm-aplikacie", lane: "advanced", quizIds: ["e65-llm-output-sql-1"] },
  {
    slug: "ai-generovany-kod-halucinovane-balicky-slopsquatting",
    lane: "advanced",
    quizIds: ["e65-halucinovany-balik-1"],
  },
];

export const AI_SAFETY_LESSON_SLUGS = [
  "ai-bezpecnost-co-nezdielat",
  "ai-pomocnik-kazdy-den",
  "ai-bezpecnost-pre-odbornikov",
] as const;

export const AI_SAFETY_QUIZ_IDS: readonly string[] = AI_SAFETY_ARTICLES.flatMap((a) => [
  ...a.quizIds,
]);

export const RELATED_COURSE_BY_LANE: Record<"pillar" | AiSafetyLane, string> = {
  pillar: "ai-bezpecnost-co-nezdielat",
  beginner: "ai-bezpecnost-co-nezdielat",
  advanced: "ai-bezpecnost-pre-odbornikov",
};
