import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import { PILLAR_PHISHING } from "../../integration/blog/fixtures";

const useFeaturedBlogPostsForTests = vi.fn();

vi.mock("@/lib/blog/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/queries")>("@/lib/blog/queries");
  return {
    ...actual,
    useFeaturedBlogPostsForTests: (limit?: number) => useFeaturedBlogPostsForTests(limit),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { TestsLearningStrip } from "@/components/tests/TestsLearningStrip";

beforeEach(() => {
  useFeaturedBlogPostsForTests.mockReset();
});

describe("TestsLearningStrip — E25 Phase 3 catalog → blog cross-link", () => {
  it("renders nothing when the query returns no posts", () => {
    useFeaturedBlogPostsForTests.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { container } = render(<TestsLearningStrip />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing while loading (no broken-link surface)", () => {
    useFeaturedBlogPostsForTests.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = render(<TestsLearningStrip />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the strip heading + subheading when posts are present", () => {
    useFeaturedBlogPostsForTests.mockReturnValue({
      data: [PILLAR_PHISHING],
      isLoading: false,
      isError: false,
    });
    render(<TestsLearningStrip />);
    expect(screen.getByTestId("tests-learning-strip")).toBeInTheDocument();
    expect(screen.getByTestId("tests-learning-strip-heading")).toHaveTextContent(
      "Učenie pred testom",
    );
    expect(screen.getByTestId("tests-learning-strip-subheading")).toBeInTheDocument();
  });

  it("renders one item per post with title + category", () => {
    useFeaturedBlogPostsForTests.mockReturnValue({
      data: [PILLAR_PHISHING],
      isLoading: false,
      isError: false,
    });
    render(<TestsLearningStrip />);
    expect(
      screen.getByTestId(`tests-learning-strip-item-${PILLAR_PHISHING.slug}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`tests-learning-strip-item-title-${PILLAR_PHISHING.slug}`),
    ).toHaveTextContent(PILLAR_PHISHING.title);
    expect(
      screen.getByTestId(`tests-learning-strip-item-category-${PILLAR_PHISHING.slug}`),
    ).toHaveTextContent(PILLAR_PHISHING.category.name);
  });

  it("requests the default limit of 4 items", () => {
    useFeaturedBlogPostsForTests.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<TestsLearningStrip />);
    expect(useFeaturedBlogPostsForTests).toHaveBeenCalledWith(4);
  });
});
