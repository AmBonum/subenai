import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CourseHero } from "@/components/courses/CourseHero";
import type { Course } from "@/content/courses";

const fixture: Course = {
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

describe("CourseHero — E28 detail-page hero alignment", () => {
  it("renders the gradient hero visual zone (not the legacy text-7xl emoji)", () => {
    render(<CourseHero course={fixture} />);
    expect(screen.getByTestId("course-detail-hero-visual")).toBeInTheDocument();
    // Hero is delegated to CourseHeroFallback which exposes role=img.
    expect(screen.getByTestId("course-detail-hero-visual")).toHaveAttribute("role", "img");
  });

  it("uses category-mapped gradient ('email' → rose) on the hero visual", () => {
    render(<CourseHero course={fixture} />);
    expect(screen.getByTestId("course-detail-hero-visual").className).toMatch(/from-rose-500/);
  });

  it("renders title + tagline", () => {
    render(<CourseHero course={fixture} />);
    expect(screen.getByTestId("course-detail-title")).toHaveTextContent("Email phishing");
    expect(screen.getByTestId("course-detail-tagline")).toHaveTextContent(
      "Ako rozpoznať podvodný e-mail v 5 krokoch.",
    );
  });

  it("renders meta as 3 separate pill chips (time · difficulty · category)", () => {
    render(<CourseHero course={fixture} />);
    expect(screen.getByTestId("course-detail-meta-time")).toHaveTextContent("10 min");
    expect(screen.getByTestId("course-detail-meta-difficulty")).toHaveTextContent("začiatočník");
    expect(screen.getByTestId("course-detail-meta-category")).toBeInTheDocument();
  });
});
