import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
      const {
        to: _to,
        params: _params,
        ...domProps
      } = rest as { to?: string; params?: Record<string, string> };
      return <a {...(domProps as Record<string, unknown>)}>{children}</a>;
    },
  };
});

import { CourseCard } from "@/components/courses/CourseCard";
import type { Course } from "@/content/courses";
import type { BlogPostListItem } from "@/lib/blog/queries";

const courseFixture: Course = {
  slug: "email-phishing",
  title: "Email phishing",
  tagline: "Ako rozpoznať podvodný e-mail v 5 krokoch.",
  category: "email",
  difficulty: "začiatočník",
  estimatedMinutes: 10,
  heroEmoji: "📧",
  sections: [],
  publishedAt: "2026-04-01",
  updatedAt: "2026-04-15",
};

const articleFixture: BlogPostListItem = {
  id: "post-1",
  slug: "phishing-do-hlbky",
  title: "Phishing do hĺbky — psychológia a obrana",
  excerpt: "excerpt",
  hero_image_url: null,
  reading_minutes: 8,
  published_at: "2026-04-10",
  category: { slug: "phishing-a-emaily", name: "Phishing" },
  author: { slug: "subenai", display_name: "subenai" },
};

describe("CourseCard — E25 Phase 2 redesign", () => {
  it("renders the title, tagline, category, meta and hero zone", () => {
    render(<CourseCard course={courseFixture} />);
    expect(screen.getByTestId("courses-card-email-phishing")).toBeInTheDocument();
    expect(screen.getByTestId("courses-card-title-email-phishing")).toHaveTextContent(
      "Email phishing",
    );
    expect(screen.getByText("Ako rozpoznať podvodný e-mail v 5 krokoch.")).toBeInTheDocument();
    expect(screen.getByTestId("courses-card-hero-email-phishing")).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();
  });

  it("omits the related-article slot when no article is passed", () => {
    render(<CourseCard course={courseFixture} />);
    expect(
      screen.queryByTestId("courses-card-related-article-email-phishing"),
    ).not.toBeInTheDocument();
  });

  it("renders the related-article slot when an article is passed", () => {
    render(<CourseCard course={courseFixture} relatedArticle={articleFixture} />);
    const slot = screen.getByTestId("courses-card-related-article-email-phishing");
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveTextContent("Čítaj k tomu:");
    expect(
      screen.getByTestId("courses-card-related-article-title-email-phishing"),
    ).toHaveTextContent("Phishing do hĺbky — psychológia a obrana");
  });

  it("omits the related-article slot when relatedArticle is null", () => {
    render(<CourseCard course={courseFixture} relatedArticle={null} />);
    expect(
      screen.queryByTestId("courses-card-related-article-email-phishing"),
    ).not.toBeInTheDocument();
  });
});
