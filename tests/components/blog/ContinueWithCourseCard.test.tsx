import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import { COURSES } from "@/content/courses";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { ContinueWithCourseCard } from "@/components/blog/ContinueWithCourseCard";

// Pull a real course out of the registry so we test against the live
// shape — courses live in TS modules, not fixtures.
const SAMPLE_COURSE = COURSES[0];

describe("ContinueWithCourseCard", () => {
  it("returns null when courseSlug is null", () => {
    const { container } = render(<ContinueWithCourseCard courseSlug={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when the slug doesn't resolve to a registered course", () => {
    const { container } = render(<ContinueWithCourseCard courseSlug="does-not-exist-zzz" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title, tagline, meta, and CTA when the slug resolves", () => {
    render(<ContinueWithCourseCard courseSlug={SAMPLE_COURSE.slug} />);
    expect(screen.getByTestId("blog-continue-with-course")).toBeInTheDocument();
    expect(screen.getByTestId("blog-continue-with-course-eyebrow")).toHaveTextContent(
      "chceš si to precvičiť?",
    );
    expect(screen.getByTestId("blog-continue-with-course-title")).toHaveTextContent(
      SAMPLE_COURSE.title,
    );
    expect(screen.getByTestId("blog-continue-with-course-tagline")).toHaveTextContent(
      SAMPLE_COURSE.tagline,
    );
    expect(screen.getByTestId("blog-continue-with-course-meta")).toHaveTextContent(
      `${SAMPLE_COURSE.estimatedMinutes} min`,
    );
    expect(screen.getByTestId("blog-continue-with-course-meta")).toHaveTextContent(
      SAMPLE_COURSE.difficulty,
    );
  });

  it("CTA links to /academy/$slug with the right slug", () => {
    render(<ContinueWithCourseCard courseSlug={SAMPLE_COURSE.slug} />);
    expect(screen.getByTestId("blog-continue-with-course-cta")).toHaveAttribute(
      "data-to",
      "/academy/$slug",
    );
  });

  it("aria-labelledby links the panel to its heading", () => {
    render(<ContinueWithCourseCard courseSlug={SAMPLE_COURSE.slug} />);
    expect(screen.getByTestId("blog-continue-with-course")).toHaveAttribute(
      "aria-labelledby",
      "continue-with-course-heading",
    );
  });
});
