import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  trackBlogAuthorView,
  trackBlogCategoryView,
  trackBlogCtaClick,
  trackBlogFilterChange,
  trackBlogIndexView,
  trackBlogPostView,
  trackBlogRelatedClick,
  trackBlogScenarioAnswer,
  trackBlogSearch,
  trackBlogShareClick,
  trackBlogPillarsToggle,
  trackBlogTocClick,
} from "@/lib/analytics/blog-events";

// Pin the exact GA4 event names + payload shapes. The marketing team
// builds GA4 funnels against these — silent renames or missing params
// silently break reports for weeks before anyone notices.

describe("blog GA4 events", () => {
  let gtagSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtagSpy = vi.fn();
    (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;
  });

  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("blog_index_view fires with language=sk", () => {
    trackBlogIndexView();
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_index_view", { language: "sk" });
  });

  it("blog_post_view includes the four classifier params", () => {
    trackBlogPostView({
      post_slug: "phishing-kompletny-sprievodca",
      category_slug: "phishing-a-emaily",
      is_pillar: true,
      reading_minutes: 12,
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_post_view", {
      post_slug: "phishing-kompletny-sprievodca",
      category_slug: "phishing-a-emaily",
      is_pillar: true,
      reading_minutes: 12,
      language: "sk",
    });
  });

  it("blog_category_view includes post_count for funnel pivots", () => {
    trackBlogCategoryView({ category_slug: "sms-a-telefon", post_count: 7 });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_category_view", {
      category_slug: "sms-a-telefon",
      post_count: 7,
      language: "sk",
    });
  });

  it("blog_author_view shape", () => {
    trackBlogAuthorView({ author_slug: "subenai-editorial", post_count: 80 });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_author_view", {
      author_slug: "subenai-editorial",
      post_count: 80,
      language: "sk",
    });
  });

  it("blog_filter_change uses __all__ sentinel for the 'všetko' chip", () => {
    trackBlogFilterChange({ category_slug: null });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_filter_change", {
      category_slug: "__all__",
      language: "sk",
    });
  });

  it("blog_filter_change includes the selected category slug", () => {
    trackBlogFilterChange({ category_slug: "ai-scamy" });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_filter_change", {
      category_slug: "ai-scamy",
      language: "sk",
    });
  });

  it("blog_search uses GA4's reserved search_term + result_count", () => {
    trackBlogSearch({ query: "phishing", result_count: 12 });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_search", {
      search_term: "phishing",
      result_count: 12,
      language: "sk",
    });
  });

  it("blog_share_click includes platform", () => {
    trackBlogShareClick({ post_slug: "foo", platform: "twitter" });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_share_click", {
      post_slug: "foo",
      platform: "twitter",
      language: "sk",
    });
  });

  it("blog_share_click(copy_link) is its own platform value", () => {
    trackBlogShareClick({ post_slug: "foo", platform: "copy_link" });
    expect(gtagSpy).toHaveBeenCalledWith(
      "event",
      "blog_share_click",
      expect.objectContaining({ platform: "copy_link" }),
    );
  });

  it("blog_cta_click distinguishes inline_banner vs scenario_card", () => {
    trackBlogCtaClick({
      post_slug: "x",
      category_slug: "y",
      destination: "/tests",
      position: "inline_banner",
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_cta_click", {
      post_slug: "x",
      category_slug: "y",
      destination: "/tests",
      position: "inline_banner",
      language: "sk",
    });
  });

  it("blog_scenario_answer captures correctness boolean", () => {
    trackBlogScenarioAnswer({ post_slug: "x", question_id: "p-sms-posta-1", correct: false });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_scenario_answer", {
      post_slug: "x",
      question_id: "p-sms-posta-1",
      correct: false,
      language: "sk",
    });
  });

  it("blog_related_click ties source and target slugs", () => {
    trackBlogRelatedClick({ source_post_slug: "a", target_post_slug: "b" });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_related_click", {
      source_post_slug: "a",
      target_post_slug: "b",
      language: "sk",
    });
  });

  it("blog_toc_click ties article + clicked heading", () => {
    trackBlogTocClick({ post_slug: "p", heading_id: "co-je-phishing" });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_toc_click", {
      post_slug: "p",
      heading_id: "co-je-phishing",
      language: "sk",
    });
  });

  it("blog_pillars_toggle stringifies open boolean to state:open|closed", () => {
    trackBlogPillarsToggle({ open: true });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_pillars_toggle", {
      state: "open",
      language: "sk",
    });
    trackBlogPillarsToggle({ open: false });
    expect(gtagSpy).toHaveBeenCalledWith("event", "blog_pillars_toggle", {
      state: "closed",
      language: "sk",
    });
  });
});
