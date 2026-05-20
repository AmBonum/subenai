// Domain-specific GA4 events for the /blog feature surface.
//
// Naming convention: `blog_<noun>_<verb>` — e.g. `blog_post_view`,
// `blog_share_click`. Reserved GA4 names (page_view, search, etc) are
// avoided to keep custom events isolated in GA4 Explorer reports.
//
// Every event MUST have the four classifier params if applicable so
// marketing can pivot reports across them:
//   - post_slug        — the article being viewed/acted on
//   - category_slug    — its category
//   - is_pillar        — boolean for pillar vs cluster (drives strategy)
//   - language         — 'sk' (en/cs reserved for future locales)
//
// Call sites are wired in:
//   • routes/blog/index.lazy.tsx           → blog_index_view, blog_filter_change, blog_search
//   • components/blog/PillarsSection.tsx   → blog_pillars_toggle
//   • routes/blog/$slug.lazy.tsx           → blog_post_view, blog_related_click
//   • routes/blog/kategoria/$slug.lazy.tsx → blog_category_view
//   • routes/blog/autor/$slug.lazy.tsx     → blog_author_view
//   • components/blog/BlogShareRow.tsx     → blog_share_click, blog_link_copy
//   • components/blog/ArticleCTABanner.tsx → blog_cta_click
//   • components/blog/BlogScenarioCard.tsx → blog_scenario_answer
//   • components/blog/BlogTableOfContents  → blog_toc_click

import { trackEvent } from "./gtag";

const LANG = "sk";

// ---- Page views ----------------------------------------------------------

export function trackBlogIndexView(): void {
  trackEvent("blog_index_view", { language: LANG });
}

export function trackBlogPostView(input: {
  post_slug: string;
  category_slug: string;
  is_pillar: boolean;
  reading_minutes: number | null;
}): void {
  trackEvent("blog_post_view", {
    post_slug: input.post_slug,
    category_slug: input.category_slug,
    is_pillar: input.is_pillar,
    reading_minutes: input.reading_minutes,
    language: LANG,
  });
}

export function trackBlogCategoryView(input: { category_slug: string; post_count: number }): void {
  trackEvent("blog_category_view", {
    category_slug: input.category_slug,
    post_count: input.post_count,
    language: LANG,
  });
}

export function trackBlogAuthorView(input: { author_slug: string; post_count: number }): void {
  trackEvent("blog_author_view", {
    author_slug: input.author_slug,
    post_count: input.post_count,
    language: LANG,
  });
}

// ---- Interactions --------------------------------------------------------

export function trackBlogFilterChange(input: {
  category_slug: string | null; // null = "all"
}): void {
  trackEvent("blog_filter_change", {
    category_slug: input.category_slug ?? "__all__",
    language: LANG,
  });
}

// Search: GA4 has a reserved 'search' event with search_term param,
// but we keep a namespaced one so blog search is separable from any
// future global site search.
export function trackBlogSearch(input: { query: string; result_count: number }): void {
  trackEvent("blog_search", {
    search_term: input.query,
    result_count: input.result_count,
    language: LANG,
  });
}

export function trackBlogShareClick(input: {
  post_slug: string;
  platform: "twitter" | "facebook" | "linkedin" | "copy_link";
}): void {
  trackEvent("blog_share_click", {
    post_slug: input.post_slug,
    platform: input.platform,
    language: LANG,
  });
}

export function trackBlogCtaClick(input: {
  post_slug: string;
  category_slug: string;
  destination: string;
  position: "inline_banner" | "scenario_card";
}): void {
  trackEvent("blog_cta_click", {
    post_slug: input.post_slug,
    category_slug: input.category_slug,
    destination: input.destination,
    position: input.position,
    language: LANG,
  });
}

export function trackBlogScenarioAnswer(input: {
  post_slug: string;
  question_id: string;
  correct: boolean;
}): void {
  trackEvent("blog_scenario_answer", {
    post_slug: input.post_slug,
    question_id: input.question_id,
    correct: input.correct,
    language: LANG,
  });
}

export function trackBlogRelatedClick(input: {
  source_post_slug: string;
  target_post_slug: string;
}): void {
  trackEvent("blog_related_click", {
    source_post_slug: input.source_post_slug,
    target_post_slug: input.target_post_slug,
    language: LANG,
  });
}

export function trackBlogTocClick(input: { post_slug: string; heading_id: string }): void {
  trackEvent("blog_toc_click", {
    post_slug: input.post_slug,
    heading_id: input.heading_id,
    language: LANG,
  });
}

// Fires only on user-initiated toggle of the /blog index pillars section
// (NOT on hydration-time default-state application). Bounded volume:
// expected ≤ 1 toggle per session for most users.
export function trackBlogPillarsToggle(input: { open: boolean }): void {
  trackEvent("blog_pillars_toggle", {
    state: input.open ? "open" : "closed",
    language: LANG,
  });
}
