import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

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

describe("CoursesFaqSection — E26 senior upgrade", () => {
  it("renders eyebrow + subheading framing the section", () => {
    render(<CoursesFaqSection />);
    expect(screen.getByTestId("courses-faq-eyebrow")).toHaveTextContent("Pred prvým školením");
    expect(screen.getByTestId("courses-faq-subheading")).toHaveTextContent(/5 najčastejších/);
  });

  it("renders the popular badge on q1 only", () => {
    render(<CoursesFaqSection />);
    expect(screen.getByTestId("courses-faq-popular-badge")).toHaveTextContent("Najčastejšia");
    expect(screen.getAllByTestId("courses-faq-popular-badge")).toHaveLength(1);
  });

  it("renders an icon tile next to every Q", () => {
    render(<CoursesFaqSection />);
    COURSES_FAQ_KEYS.forEach((key) => {
      expect(screen.getByTestId(`courses-faq-icon-${key}`)).toBeInTheDocument();
    });
  });

  it("renders a stable anchor ID per Q for deep-linking", () => {
    render(<CoursesFaqSection />);
    COURSES_FAQ_KEYS.forEach((key) => {
      const item = screen.getByTestId(`courses-faq-item-${key}`);
      expect(item).toHaveAttribute("id", `faq-courses-q-${key}`);
    });
  });

  it("expand-all toggle flips label between expand/collapse", () => {
    render(<CoursesFaqSection />);
    const toggle = screen.getByTestId("courses-faq-toggle-all");
    expect(toggle).toHaveTextContent("Rozbaliť všetko");
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Zbaliť všetko");
  });

  it("renders rescue footer with /blog + /kontakt CTAs", () => {
    render(<CoursesFaqSection />);
    expect(screen.getByTestId("courses-faq-footer")).toHaveTextContent(/Nenašiel si odpoveď/);
    expect(screen.getByTestId("courses-faq-footer-cta-blog")).toHaveAttribute("href", "/blog");
    expect(screen.getByTestId("courses-faq-footer-cta-contact")).toHaveAttribute(
      "href",
      "/kontakt",
    );
  });
});
