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

import { SchoolsFooterCta } from "@/components/schools/SchoolsFooterCta";

describe("SchoolsFooterCta", () => {
  it("renders 3 cross-link cards", () => {
    render(<SchoolsFooterCta />);
    expect(screen.getByTestId("schools-footer-cta-composer")).toBeInTheDocument();
    expect(screen.getByTestId("schools-footer-cta-test")).toBeInTheDocument();
    expect(screen.getByTestId("schools-footer-cta-blog")).toBeInTheDocument();
  });

  it("Composer card points to /test/builder (primary action)", () => {
    render(<SchoolsFooterCta />);
    expect(screen.getByTestId("schools-footer-cta-composer")).toHaveAttribute(
      "data-to",
      "/test/builder",
    );
  });

  it("Test card points to /test", () => {
    render(<SchoolsFooterCta />);
    expect(screen.getByTestId("schools-footer-cta-test")).toHaveAttribute("data-to", "/test");
  });

  it("Blog card points to /blog (joins cross-link triangle)", () => {
    render(<SchoolsFooterCta />);
    expect(screen.getByTestId("schools-footer-cta-blog")).toHaveAttribute("data-to", "/academy");
  });
});
