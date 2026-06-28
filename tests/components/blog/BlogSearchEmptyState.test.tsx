import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

// Router Link stub — CategoryBadge variant='link' uses TanStack Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { BlogSearchEmptyState } from "@/components/blog/BlogSearchEmptyState";

import { CLUSTER_PHISHING_1, PILLAR_PHISHING, PILLAR_SMS } from "../../integration/blog/fixtures";

const SUGGESTED = [
  { slug: "phishing-a-emaily", name: "phishing a emaily", count: 12 },
  { slug: "sms-a-telefon", name: "sms a telefón", count: 8 },
  { slug: "ai-scamy", name: "ai scamy", count: 5 },
];

describe("BlogSearchEmptyState — search variant", () => {
  it("renders the empty title + the verbatim query echo", () => {
    render(
      <BlogSearchEmptyState
        query="qzqzqz"
        suggestedCategories={SUGGESTED}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    expect(screen.getByTestId("blog-search-empty")).toBeInTheDocument();
    expect(screen.getByTestId("blog-search-empty-title")).toHaveTextContent("nenašli sme nič");
    expect(screen.getByTestId("blog-search-empty-query")).toHaveTextContent("„qzqzqz");
  });

  it("does NOT render the category-empty copy when query is provided", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={[]}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByTestId("blog-search-empty-category")).toBeNull();
  });

  it("renders aria-live polite for screen-reader announcement", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={[]}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    expect(screen.getByTestId("blog-search-empty")).toHaveAttribute("aria-live", "polite");
  });
});

describe("BlogSearchEmptyState — category-only variant", () => {
  it("renders the category empty title and category name", () => {
    render(
      <BlogSearchEmptyState
        categoryName="ai scamy"
        suggestedCategories={SUGGESTED}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    expect(screen.getByTestId("blog-search-empty-title")).toHaveTextContent(
      "v tejto kategórii zatiaľ nič nie je",
    );
    expect(screen.getByTestId("blog-search-empty-category")).toHaveTextContent("ai scamy");
    expect(screen.queryByTestId("blog-search-empty-query")).toBeNull();
  });
});

describe("BlogSearchEmptyState — suggestions + pillars", () => {
  it("renders one suggestion chip per supplied category with post counts", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={SUGGESTED}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    const suggestions = screen.getByTestId("blog-search-empty-suggestions");
    expect(
      within(suggestions).getByTestId("blog-search-empty-suggestion-phishing-a-emaily"),
    ).toHaveTextContent("phishing a emaily (12)");
    expect(
      within(suggestions).getByTestId("blog-search-empty-suggestion-sms-a-telefon"),
    ).toHaveTextContent("sms a telefón (8)");
    expect(
      within(suggestions).getByTestId("blog-search-empty-suggestion-ai-scamy"),
    ).toHaveTextContent("ai scamy (5)");
  });

  it("suggestion chips link to category archives", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={SUGGESTED}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    const chip = screen.getByTestId("blog-search-empty-suggestion-phishing-a-emaily");
    expect(chip).toHaveAttribute("data-to", "/academy/category/$slug");
  });

  it("renders fallback pillar cards", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={[]}
        fallbackPillars={[PILLAR_PHISHING, PILLAR_SMS]}
        onClear={() => {}}
      />,
    );
    const pillars = screen.getByTestId("blog-search-empty-pillars");
    expect(
      within(pillars).getByTestId(`blog-search-empty-pillar-${PILLAR_PHISHING.slug}`),
    ).toBeInTheDocument();
    expect(
      within(pillars).getByTestId(`blog-search-empty-pillar-${PILLAR_SMS.slug}`),
    ).toBeInTheDocument();
  });

  it("hides the suggestions section when none are passed", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={[]}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByTestId("blog-search-empty-suggestions")).toBeNull();
  });

  it("hides the pillar section when none are passed", () => {
    render(
      <BlogSearchEmptyState
        query="x"
        suggestedCategories={[]}
        fallbackPillars={[]}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByTestId("blog-search-empty-pillars")).toBeNull();
  });
});

describe("BlogSearchEmptyState — clear interaction", () => {
  it("clicking the clear button calls the onClear callback", () => {
    const onClear = vi.fn();
    render(
      <BlogSearchEmptyState
        query="anything"
        suggestedCategories={[]}
        fallbackPillars={[CLUSTER_PHISHING_1]}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByTestId("blog-search-empty-clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
