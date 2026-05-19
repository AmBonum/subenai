import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

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
