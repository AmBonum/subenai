import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import {
  CLUSTER_PHISHING_1,
  CLUSTER_PHISHING_2,
  PILLAR_AI,
  PILLAR_PHISHING,
  PILLAR_SMS,
} from "../../integration/blog/fixtures";

// ---- Mocks ---------------------------------------------------------------

const useBlogPostList = vi.fn();

vi.mock("@/lib/blog/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/queries")>("@/lib/blog/queries");
  return {
    ...actual,
    useBlogPostList: () => useBlogPostList(),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { BlogHomeSection } from "@/components/home/BlogHomeSection";

beforeEach(() => {
  useBlogPostList.mockReset();
  // Default: 3 pillars + 2 clusters loaded
  useBlogPostList.mockReturnValue({
    data: [PILLAR_PHISHING, PILLAR_SMS, PILLAR_AI, CLUSTER_PHISHING_1, CLUSTER_PHISHING_2],
    isLoading: false,
    isError: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BlogHomeSection — render", () => {
  it("renders the section with eyebrow, heading, description, secondary CTA", () => {
    render(<BlogHomeSection />);
    const section = screen.getByTestId("home-blog-section");
    expect(within(section).getByTestId("home-blog-eyebrow")).toHaveTextContent("akadémia subenai");
    expect(within(section).getByTestId("home-blog-heading")).toHaveTextContent(
      "učíme sa rozpoznávať podvody — krok po kroku",
    );
    expect(within(section).getByTestId("home-blog-description")).toBeInTheDocument();
    expect(within(section).getByTestId("home-blog-cta-secondary")).toHaveAttribute(
      "data-to",
      "/blog",
    );
  });

  it("renders exactly 3 pillar cards (slice(0,3)), excluding clusters", () => {
    render(<BlogHomeSection />);
    const cards = screen.getByTestId("home-blog-cards");
    expect(within(cards).getByTestId(`home-blog-card-${PILLAR_PHISHING.slug}`)).toBeInTheDocument();
    expect(within(cards).getByTestId(`home-blog-card-${PILLAR_SMS.slug}`)).toBeInTheDocument();
    expect(within(cards).getByTestId(`home-blog-card-${PILLAR_AI.slug}`)).toBeInTheDocument();
    expect(
      within(cards).queryByTestId(`home-blog-card-${CLUSTER_PHISHING_1.slug}`),
    ).not.toBeInTheDocument();
    expect(cards.querySelectorAll("li").length).toBe(3);
  });

  it("renders the mobile primary CTA as a /blog link", () => {
    render(<BlogHomeSection />);
    expect(screen.getByTestId("home-blog-cta-primary")).toHaveAttribute("data-to", "/blog");
  });

  it("section is labelled via aria-labelledby for screen readers", () => {
    render(<BlogHomeSection />);
    const section = screen.getByTestId("home-blog-section");
    expect(section).toHaveAttribute("aria-labelledby", "homepage-blog-heading");
    expect(screen.getByTestId("home-blog-heading").id).toBe("homepage-blog-heading");
  });
});

describe("BlogHomeSection — graceful degradation", () => {
  it("renders nothing when query data is undefined (loading)", () => {
    useBlogPostList.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<BlogHomeSection />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when query errors out", () => {
    useBlogPostList.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { container } = render(<BlogHomeSection />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the loaded list contains zero pillars", () => {
    useBlogPostList.mockReturnValue({
      data: [CLUSTER_PHISHING_1, CLUSTER_PHISHING_2],
      isLoading: false,
      isError: false,
    });
    const { container } = render(<BlogHomeSection />);
    expect(container.firstChild).toBeNull();
  });

  it("renders fewer than 3 cards when fewer than 3 pillars are available", () => {
    useBlogPostList.mockReturnValue({
      data: [PILLAR_PHISHING, PILLAR_SMS],
      isLoading: false,
      isError: false,
    });
    render(<BlogHomeSection />);
    expect(screen.getByTestId("home-blog-cards").querySelectorAll("li").length).toBe(2);
  });
});
