import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { TestsFaqSection } from "@/components/tests/TestsFaqSection";
import { TESTS_FAQ_KEYS } from "@/lib/seo/tests-faq-schema";

describe("TestsFaqSection — E25 Phase 1 FAQ accordion", () => {
  it("renders the section heading and all 5 Q triggers", () => {
    render(<TestsFaqSection />);
    expect(screen.getByTestId("tests-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("tests-faq-heading")).toHaveTextContent("Časté otázky");
    TESTS_FAQ_KEYS.forEach((key) => {
      expect(screen.getByTestId(`tests-faq-trigger-${key}`)).toBeInTheDocument();
    });
  });

  it("renders the canonical Slovak Q copy for q1", () => {
    render(<TestsFaqSection />);
    expect(screen.getByTestId("tests-faq-trigger-q1")).toHaveTextContent("Je test zadarmo?");
  });

  it("renders q2..q5 with their canonical Slovak headings", () => {
    render(<TestsFaqSection />);
    expect(screen.getByTestId("tests-faq-trigger-q2")).toHaveTextContent("Koľko času zaberie?");
    expect(screen.getByTestId("tests-faq-trigger-q3")).toHaveTextContent(
      "Pre koho je test vhodný?",
    );
    expect(screen.getByTestId("tests-faq-trigger-q4")).toHaveTextContent("Aké údaje zbierate?");
    expect(screen.getByTestId("tests-faq-trigger-q5")).toHaveTextContent(
      "Môžem test poslať kolegom?",
    );
  });
});

describe("TestsFaqSection — E26 senior upgrade", () => {
  it("renders eyebrow + subheading framing the section", () => {
    render(<TestsFaqSection />);
    expect(screen.getByTestId("tests-faq-eyebrow")).toHaveTextContent("Pred testom");
    expect(screen.getByTestId("tests-faq-subheading")).toHaveTextContent(/5 najčastejších/);
  });

  it("renders the 'Najčastejšia' popular badge on q1 only", () => {
    render(<TestsFaqSection />);
    const badge = screen.getByTestId("tests-faq-popular-badge");
    expect(badge).toHaveTextContent("Najčastejšia");
    // Only one popular badge in the whole section.
    expect(screen.getAllByTestId("tests-faq-popular-badge")).toHaveLength(1);
  });

  it("renders an icon tile next to every Q for scan-ability", () => {
    render(<TestsFaqSection />);
    TESTS_FAQ_KEYS.forEach((key) => {
      expect(screen.getByTestId(`tests-faq-icon-${key}`)).toBeInTheDocument();
    });
  });

  it("renders a stable anchor ID per Q for deep-linking", () => {
    render(<TestsFaqSection />);
    TESTS_FAQ_KEYS.forEach((key) => {
      const item = screen.getByTestId(`tests-faq-item-${key}`);
      expect(item).toHaveAttribute("id", `faq-tests-q-${key}`);
    });
  });

  it("expand-all toggle opens every accordion item, collapse-all closes them", () => {
    render(<TestsFaqSection />);
    const toggle = screen.getByTestId("tests-faq-toggle-all");
    expect(toggle).toHaveTextContent("Rozbaliť všetko");
    fireEvent.click(toggle);
    // After expand: toggle now reads "Zbaliť všetko"
    expect(toggle).toHaveTextContent("Zbaliť všetko");
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Rozbaliť všetko");
  });

  it("renders rescue footer with /blog + /kontakt CTAs", () => {
    render(<TestsFaqSection />);
    expect(screen.getByTestId("tests-faq-footer")).toHaveTextContent(/Nenašiel si odpoveď/);
    expect(screen.getByTestId("tests-faq-footer-cta-blog")).toHaveAttribute("href", "/blog");
    expect(screen.getByTestId("tests-faq-footer-cta-contact")).toHaveAttribute("href", "/kontakt");
  });
});
