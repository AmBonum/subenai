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

import { SchoolsStickyCta } from "@/components/schools/SchoolsStickyCta";

describe("SchoolsStickyCta", () => {
  it("renders the sticky bar wrapper with mobile-only md:hidden class", () => {
    render(<SchoolsStickyCta />);
    const bar = screen.getByTestId("schools-sticky-cta-bar");
    expect(bar).toBeInTheDocument();
    // Tailwind md:hidden = visible <md only. This is a layout invariant
    // that's hard to assert in jsdom (no real CSS), but the class name
    // itself is the contract.
    expect(bar.className).toContain("md:hidden");
  });

  it("CTA link targets the Composer route", () => {
    render(<SchoolsStickyCta />);
    const link = screen.getByTestId("schools-sticky-cta");
    expect(link).toHaveAttribute("data-to", "/test/builder");
  });

  it("renders region role with an aria-label (for screen-reader navigation)", () => {
    render(<SchoolsStickyCta />);
    const bar = screen.getByTestId("schools-sticky-cta-bar");
    expect(bar).toHaveAttribute("role", "region");
    expect(bar.getAttribute("aria-label")?.length ?? 0).toBeGreaterThan(0);
  });
});
