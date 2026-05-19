import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import { PILLAR_PHISHING } from "../../integration/blog/fixtures";

const useBlogPostByRelatedTest = vi.fn();

vi.mock("@/lib/blog/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/queries")>("@/lib/blog/queries");
  return {
    ...actual,
    useBlogPostByRelatedTest: (slug: string | undefined) => useBlogPostByRelatedTest(slug),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { RelatedTestPackArticleCard } from "@/components/test-packs/RelatedTestPackArticleCard";

beforeEach(() => {
  useBlogPostByRelatedTest.mockReset();
});

describe("RelatedTestPackArticleCard — E25 Phase 3 test-pack → article", () => {
  it("returns null when the reverse-lookup yields no post", () => {
    useBlogPostByRelatedTest.mockReturnValue({ data: null, isLoading: false, isError: false });
    const { container } = render(<RelatedTestPackArticleCard packSlug="eshop" />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null while loading", () => {
    useBlogPostByRelatedTest.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = render(<RelatedTestPackArticleCard packSlug="eshop" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title, excerpt, meta and CTA when a related article exists", () => {
    useBlogPostByRelatedTest.mockReturnValue({
      data: PILLAR_PHISHING,
      isLoading: false,
      isError: false,
    });
    render(<RelatedTestPackArticleCard packSlug="eshop" />);
    expect(screen.getByTestId("test-pack-related-academy")).toBeInTheDocument();
    expect(screen.getByTestId("test-pack-related-academy-eyebrow")).toHaveTextContent(
      "chceš tomu rozumieť do hĺbky?",
    );
    expect(screen.getByTestId("test-pack-related-academy-title")).toHaveTextContent(
      PILLAR_PHISHING.title,
    );
    expect(screen.getByTestId("test-pack-related-academy-excerpt")).toHaveTextContent(
      PILLAR_PHISHING.excerpt,
    );
  });

  it("CTA links to /blog/$slug with the related article slug", () => {
    useBlogPostByRelatedTest.mockReturnValue({
      data: PILLAR_PHISHING,
      isLoading: false,
      isError: false,
    });
    render(<RelatedTestPackArticleCard packSlug="eshop" />);
    expect(screen.getByTestId("test-pack-related-academy-cta")).toHaveAttribute(
      "data-to",
      "/blog/$slug",
    );
  });

  it("passes the input packSlug to the lookup hook", () => {
    useBlogPostByRelatedTest.mockReturnValue({ data: null, isLoading: false, isError: false });
    render(<RelatedTestPackArticleCard packSlug="autoservis" />);
    expect(useBlogPostByRelatedTest).toHaveBeenCalledWith("autoservis");
  });
});
