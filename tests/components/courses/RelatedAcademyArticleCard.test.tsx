import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import { PILLAR_PHISHING } from "../../integration/blog/fixtures";

const useBlogPostByRelatedCourse = vi.fn();

vi.mock("@/lib/blog/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/queries")>("@/lib/blog/queries");
  return {
    ...actual,
    useBlogPostByRelatedCourse: (slug: string | undefined) => useBlogPostByRelatedCourse(slug),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { RelatedAcademyArticleCard } from "@/components/courses/RelatedAcademyArticleCard";

beforeEach(() => {
  useBlogPostByRelatedCourse.mockReset();
});

describe("RelatedAcademyArticleCard", () => {
  it("returns null when the reverse-lookup query yields no post", () => {
    useBlogPostByRelatedCourse.mockReturnValue({ data: null, isLoading: false, isError: false });
    const { container } = render(<RelatedAcademyArticleCard courseSlug="email-phishing" />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null while loading (no broken-link surface)", () => {
    useBlogPostByRelatedCourse.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = render(<RelatedAcademyArticleCard courseSlug="email-phishing" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title, excerpt, meta, and CTA when a related article exists", () => {
    useBlogPostByRelatedCourse.mockReturnValue({
      data: PILLAR_PHISHING,
      isLoading: false,
      isError: false,
    });
    render(<RelatedAcademyArticleCard courseSlug="email-phishing" />);
    expect(screen.getByTestId("course-related-academy")).toBeInTheDocument();
    expect(screen.getByTestId("course-related-academy-eyebrow")).toHaveTextContent(
      "chceš tomu rozumieť do hĺbky?",
    );
    expect(screen.getByTestId("course-related-academy-title")).toHaveTextContent(
      PILLAR_PHISHING.title,
    );
    expect(screen.getByTestId("course-related-academy-excerpt")).toHaveTextContent(
      PILLAR_PHISHING.excerpt,
    );
    expect(screen.getByTestId("course-related-academy-meta")).toHaveTextContent(
      PILLAR_PHISHING.category.name,
    );
  });

  it("CTA links to /blog/$slug with the related article slug", () => {
    useBlogPostByRelatedCourse.mockReturnValue({
      data: PILLAR_PHISHING,
      isLoading: false,
      isError: false,
    });
    render(<RelatedAcademyArticleCard courseSlug="email-phishing" />);
    expect(screen.getByTestId("course-related-academy-cta")).toHaveAttribute(
      "data-to",
      "/blog/$slug",
    );
  });

  it("passes the input courseSlug to the lookup hook", () => {
    useBlogPostByRelatedCourse.mockReturnValue({ data: null, isLoading: false, isError: false });
    render(<RelatedAcademyArticleCard courseSlug="ai-deepfake" />);
    expect(useBlogPostByRelatedCourse).toHaveBeenCalledWith("ai-deepfake");
  });
});
