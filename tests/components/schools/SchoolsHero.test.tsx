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

import { SchoolsHero } from "@/components/schools/SchoolsHero";

describe("SchoolsHero", () => {
  it("renders the kicker, outcome H1, subtitle", () => {
    render(<SchoolsHero />);
    expect(screen.getByTestId("schools-hero-kicker")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-title")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-subtitle")).toBeInTheDocument();
  });

  it("renders 3 persona chips with stable test-ids", () => {
    render(<SchoolsHero />);
    expect(screen.getByTestId("schools-hero-persona-riaditel")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-persona-itkoord")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-persona-ucitel")).toBeInTheDocument();
  });

  it("renders the primary CTA targeting Composer", () => {
    render(<SchoolsHero />);
    const cta = screen.getByTestId("schools-hero-cta");
    expect(cta).toHaveAttribute("data-to", "/test/builder");
  });

  it("renders the secondary CTA targeting /test", () => {
    render(<SchoolsHero />);
    const cta = screen.getByTestId("schools-hero-cta-secondary");
    expect(cta).toHaveAttribute("data-to", "/test");
  });

  it("renders 4 proof stats", () => {
    render(<SchoolsHero />);
    expect(screen.getByTestId("schools-hero-proof-1")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-proof-2")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-proof-3")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-proof-4")).toBeInTheDocument();
  });
});
