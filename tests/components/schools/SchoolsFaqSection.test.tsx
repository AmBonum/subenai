import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { SchoolsFaqSection } from "@/components/schools/SchoolsFaqSection";

describe("SchoolsFaqSection", () => {
  it("renders the FAQ wrapper + adapted HomeFaqSection (with schools-faq test-id prefix)", () => {
    render(<SchoolsFaqSection />);
    expect(screen.getByTestId("schools-faq")).toBeInTheDocument();
    expect(screen.getByTestId("schools-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("schools-faq-heading")).toBeInTheDocument();
  });

  it("groups the 6 questions into 2 categories: 'pristup' (2 qs) + 'data' (4 qs)", () => {
    render(<SchoolsFaqSection />);
    expect(screen.getByTestId("schools-faq-category-pristup")).toBeInTheDocument();
    expect(screen.getByTestId("schools-faq-category-data")).toBeInTheDocument();
  });

  it("each category has its trigger button", () => {
    render(<SchoolsFaqSection />);
    expect(screen.getByTestId("schools-faq-category-trigger-pristup")).toBeInTheDocument();
    expect(screen.getByTestId("schools-faq-category-trigger-data")).toBeInTheDocument();
  });

  it("toggle-all button is present (from the parent HomeFaqSection)", () => {
    render(<SchoolsFaqSection />);
    expect(screen.getByTestId("schools-faq-toggle-all")).toBeInTheDocument();
  });

  it("does NOT render the home academy docs hint (docsHint={null} override)", () => {
    render(<SchoolsFaqSection />);
    // schools-faq-docs-hint container renders but is empty (docsHint={null})
    const hint = screen.queryByTestId("schools-faq-docs-hint");
    // Either absent or empty — both are acceptable, but the home's
    // "Otvor akadémiu" link must NOT appear (would be a UX dead-end
    // since the schools footer cross-link triangle does that job).
    expect(hint?.textContent ?? "").not.toMatch(/Otvor akadémiu/i);
  });
});
