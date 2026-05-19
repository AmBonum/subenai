// E16.4 — single source of truth for which blog posts are "pillars".
// Used by /blog index (featured hero), sitemap (priority bump),
// related-articles logic, and admin UI badges. The DB column
// `blog_posts.pillar_post_id` points clusters at their pillar, but the
// pillar rows themselves don't carry a boolean flag — we keep the
// canonical list here so UI + build scripts agree.
//
// If a new pillar lands, add its slug below AND update the matching
// PILLAR_SLUGS set in scripts/generate-sitemap.mjs.
export const PILLAR_SLUGS: ReadonlySet<string> = new Set([
  "phishing-kompletny-sprievodca",
  "scam-sms-a-podvodne-hovory",
  "fake-eshopy-ako-odhalit",
  "podvody-na-socialnych-sietach",
  "ai-a-moderne-podvody-deepfake-voice-cloning",
  "digitalna-bezpecnost-kompletny-navod",
  "psychologia-internetovych-podvodov",
  "bezpecnost-pre-rodicov-deti-seniorov",
  "bezpecne-nakupovanie-online-slovensko",
  "internet-safety-pre-studentov",
  "kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov",
]);

export function isPillarSlug(slug: string): boolean {
  return PILLAR_SLUGS.has(slug);
}
