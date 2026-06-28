import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import type { ScoreResult } from "@/lib/quiz/score/scoring";
import { PILLAR_PHISHING, PILLAR_AI } from "../../integration/blog/fixtures";

const useBlogPost = vi.fn();

vi.mock("@/lib/blog/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/queries")>("@/lib/blog/queries");
  return {
    ...actual,
    useBlogPost: (slug: string) => useBlogPost(slug),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { WeakCategoryRecommendations } from "@/components/quiz/results/WeakCategoryRecommendations";

beforeEach(() => {
  useBlogPost.mockReset();
});

function noPosts() {
  useBlogPost.mockReturnValue({ data: null, isLoading: false, isError: false });
}

const aceBreakdown: ScoreResult["breakdown"] = {
  phishing: 80,
  url: 75,
  fake_vs_real: 90,
  scenario: 70,
};

const mixedBreakdown: ScoreResult["breakdown"] = {
  phishing: 30, // weak
  url: 80,
  fake_vs_real: 40, // weak
  scenario: 60,
};

const allWeakBreakdown: ScoreResult["breakdown"] = {
  phishing: 20,
  url: 25,
  fake_vs_real: 30,
  scenario: 35,
};

describe("WeakCategoryRecommendations", () => {
  it("renders nothing when no category is below threshold (graceful absence)", () => {
    noPosts();
    const { container } = render(<WeakCategoryRecommendations breakdown={aceBreakdown} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only weak-category rows when some are weak", () => {
    noPosts();
    render(<WeakCategoryRecommendations breakdown={mixedBreakdown} />);
    expect(screen.getByTestId("results-weak-recs")).toBeInTheDocument();
    expect(screen.getByTestId("results-weak-recs-row-phishing")).toBeInTheDocument();
    expect(screen.getByTestId("results-weak-recs-row-fake_vs_real")).toBeInTheDocument();
    expect(screen.queryByTestId("results-weak-recs-row-url")).not.toBeInTheDocument();
    expect(screen.queryByTestId("results-weak-recs-row-scenario")).not.toBeInTheDocument();
  });

  it("shows the per-category score badge", () => {
    noPosts();
    render(<WeakCategoryRecommendations breakdown={mixedBreakdown} />);
    expect(screen.getByTestId("results-weak-recs-score-phishing")).toHaveTextContent("30 %");
    expect(screen.getByTestId("results-weak-recs-score-fake_vs_real")).toHaveTextContent("40 %");
  });

  it("renders the course half (links to /academy/$slug) when a course is registered", () => {
    noPosts();
    render(<WeakCategoryRecommendations breakdown={mixedBreakdown} />);
    const courseLink = screen.getByTestId("results-weak-recs-course-phishing");
    expect(courseLink).toHaveAttribute("data-to", "/academy/$slug");
  });

  it("renders the article half when the pillar query resolves to a post", () => {
    useBlogPost.mockImplementation((slug: string) => {
      if (slug === "phishing-kompletny-sprievodca") {
        return { data: PILLAR_PHISHING, isLoading: false, isError: false };
      }
      if (slug === "ai-a-moderne-podvody-deepfake-voice-cloning") {
        return { data: PILLAR_AI, isLoading: false, isError: false };
      }
      return { data: null, isLoading: false, isError: false };
    });
    render(<WeakCategoryRecommendations breakdown={mixedBreakdown} />);
    const articlePhishing = screen.getByTestId("results-weak-recs-article-phishing");
    expect(articlePhishing).toHaveAttribute("data-to", "/academy/$slug");
    expect(articlePhishing).toHaveTextContent(PILLAR_PHISHING.title);
    expect(screen.getByTestId("results-weak-recs-article-fake_vs_real")).toHaveTextContent(
      PILLAR_AI.title,
    );
  });

  it("omits the article half when the pillar post is missing (graceful degradation)", () => {
    noPosts();
    render(<WeakCategoryRecommendations breakdown={mixedBreakdown} />);
    expect(screen.queryByTestId("results-weak-recs-article-phishing")).not.toBeInTheDocument();
    // Course half MUST still render — we don't gate course on article.
    expect(screen.getByTestId("results-weak-recs-course-phishing")).toBeInTheDocument();
  });

  it("renders all four rows when every category is weak", () => {
    noPosts();
    render(<WeakCategoryRecommendations breakdown={allWeakBreakdown} />);
    expect(screen.getByTestId("results-weak-recs-row-phishing")).toBeInTheDocument();
    expect(screen.getByTestId("results-weak-recs-row-url")).toBeInTheDocument();
    expect(screen.getByTestId("results-weak-recs-row-fake_vs_real")).toBeInTheDocument();
    expect(screen.getByTestId("results-weak-recs-row-scenario")).toBeInTheDocument();
  });

  it("section is labelled by its heading (a11y)", () => {
    noPosts();
    render(<WeakCategoryRecommendations breakdown={mixedBreakdown} />);
    const section = screen.getByTestId("results-weak-recs");
    expect(section).toHaveAttribute("aria-labelledby", "weak-recs-heading");
  });
});
