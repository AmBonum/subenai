import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CourseHeroFallback } from "@/components/courses/CourseHeroFallback";

describe("CourseHeroFallback — E25 Phase 2 course-category gradient hero", () => {
  it("renders the course heroEmoji as the centered pictogram", () => {
    render(
      <CourseHeroFallback category="email" emoji="📧" title="Email phishing" testid="hero-email" />,
    );
    expect(screen.getByTestId("hero-email")).toBeInTheDocument();
    expect(screen.getByText("📧")).toBeInTheDocument();
  });

  it("exposes the title via aria-label", () => {
    render(
      <CourseHeroFallback category="email" emoji="📧" title="Email phishing" testid="hero-email" />,
    );
    expect(screen.getByTestId("hero-email")).toHaveAttribute("aria-label", "Email phishing");
    expect(screen.getByTestId("hero-email")).toHaveAttribute("role", "img");
  });

  it("maps category 'email' to a rose-led gradient", () => {
    render(<CourseHeroFallback category="email" emoji="📧" title="x" testid="hero-email" />);
    expect(screen.getByTestId("hero-email").className).toMatch(/from-rose-500/);
  });

  it("maps category 'investicie' to a yellow/gold gradient", () => {
    render(<CourseHeroFallback category="investicie" emoji="💰" title="x" testid="hero-inv" />);
    expect(screen.getByTestId("hero-inv").className).toMatch(/from-yellow-500/);
  });

  it("uses a taller aspect for the featured variant", () => {
    render(
      <CourseHeroFallback
        category="email"
        emoji="📧"
        title="x"
        variant="featured"
        testid="hero-feat"
      />,
    );
    expect(screen.getByTestId("hero-feat").className).toMatch(/aspect-\[16\/7\]/);
  });
});
