import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CoursesFaqSection } from "@/components/courses/CoursesFaqSection";
import { COURSES_FAQ_KEYS } from "@/lib/seo/courses-faq-schema";

describe("CoursesFaqSection — E25 Phase 2 FAQ accordion", () => {
  it("renders the section heading and 5 Q triggers", () => {
    render(<CoursesFaqSection />);
    expect(screen.getByTestId("courses-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("courses-faq-heading")).toHaveTextContent("Časté otázky");
    COURSES_FAQ_KEYS.forEach((key) => {
      expect(screen.getByTestId(`courses-faq-trigger-${key}`)).toBeInTheDocument();
    });
  });

  it("renders the canonical Slovak Q copy for q1", () => {
    render(<CoursesFaqSection />);
    expect(screen.getByTestId("courses-faq-trigger-q1")).toHaveTextContent("Sú školenia platené?");
  });

  it("renders q2..q5 with their canonical Slovak headings", () => {
    render(<CoursesFaqSection />);
    expect(screen.getByTestId("courses-faq-trigger-q2")).toHaveTextContent(
      "Ako dlho trvá jedno školenie?",
    );
    expect(screen.getByTestId("courses-faq-trigger-q3")).toHaveTextContent(
      "Dostanem po školení certifikát?",
    );
    expect(screen.getByTestId("courses-faq-trigger-q4")).toHaveTextContent(
      "Pre koho sú školenia určené?",
    );
    expect(screen.getByTestId("courses-faq-trigger-q5")).toHaveTextContent(
      "Môžem školenie poslať kolegom alebo rodičom?",
    );
  });
});
