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

import { SchoolsHomeCard } from "@/components/home/SchoolsHomeCard";

describe("SchoolsHomeCard", () => {
  it("renders kicker, heading, body, CTA", () => {
    render(<SchoolsHomeCard />);
    expect(screen.getByTestId("home-schools-kicker")).toHaveTextContent("Pre školy a HR");
    expect(screen.getByTestId("home-schools-heading")).toHaveTextContent(
      /Učíš o internetovej bezpečnosti/u,
    );
    expect(screen.getByTestId("home-schools-body")).toBeInTheDocument();
    expect(screen.getByTestId("home-schools-cta")).toBeInTheDocument();
  });

  it("CTA links to /schools", () => {
    render(<SchoolsHomeCard />);
    expect(screen.getByTestId("home-schools-cta")).toHaveAttribute("data-to", "/schools");
  });

  it("section is labelled via aria-labelledby for screen readers", () => {
    render(<SchoolsHomeCard />);
    expect(screen.getByTestId("home-schools-section")).toHaveAttribute(
      "aria-labelledby",
      "home-schools-heading",
    );
  });
});
