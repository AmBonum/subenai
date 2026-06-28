import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { LearningPathSection } from "@/components/home/LearningPathSection";

describe("LearningPathSection", () => {
  it("renders the three funnel steps in canonical order", () => {
    render(<LearningPathSection />);
    const steps = screen.getByTestId("home-learning-path-steps");
    const items = steps.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[0]).toHaveAttribute("data-testid", "home-learning-path-step-step1");
    expect(items[1]).toHaveAttribute("data-testid", "home-learning-path-step-step2");
    expect(items[2]).toHaveAttribute("data-testid", "home-learning-path-step-step3");
  });

  it("each step links to the correct funnel surface", () => {
    render(<LearningPathSection />);
    expect(screen.getByTestId("home-learning-path-link-step1")).toHaveAttribute("data-to", "/test");
    expect(screen.getByTestId("home-learning-path-link-step2")).toHaveAttribute(
      "data-to",
      "/academy",
    );
    expect(screen.getByTestId("home-learning-path-link-step3")).toHaveAttribute(
      "data-to",
      "/academy",
    );
  });

  it("renders the footer CTA pointing at /test", () => {
    render(<LearningPathSection />);
    const cta = screen.getByTestId("home-learning-path-footer-cta");
    expect(cta).toHaveAttribute("data-to", "/test");
    expect(cta).toHaveTextContent("Začni tu");
  });

  it("renders an ordered list (<ol>) for the funnel — sequence matters for a11y", () => {
    render(<LearningPathSection />);
    const list = screen.getByTestId("home-learning-path-steps");
    expect(list.tagName.toLowerCase()).toBe("ol");
  });

  it("section is labelled via aria-labelledby for screen readers", () => {
    render(<LearningPathSection />);
    expect(screen.getByTestId("home-learning-path-section")).toHaveAttribute(
      "aria-labelledby",
      "home-learning-path-heading",
    );
  });
});
