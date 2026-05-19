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

import { AudienceSection } from "@/components/home/AudienceSection";

describe("AudienceSection", () => {
  it("renders the kicker, heading, subheading", () => {
    render(<AudienceSection />);
    expect(screen.getByTestId("home-audience-kicker")).toHaveTextContent("Pre koho je subenai");
    expect(screen.getByTestId("home-audience-heading")).toHaveTextContent("Vyber si svoju cestu");
    expect(screen.getByTestId("home-audience-subheading")).toBeInTheDocument();
  });

  it("renders exactly 4 persona cards in the canonical order", () => {
    render(<AudienceSection />);
    const grid = screen.getByTestId("home-audience-grid");
    expect(grid.querySelectorAll("li").length).toBe(4);
    expect(screen.getByTestId("home-audience-card-bezni")).toBeInTheDocument();
    expect(screen.getByTestId("home-audience-card-rodicia")).toBeInTheDocument();
    expect(screen.getByTestId("home-audience-card-firmy")).toBeInTheDocument();
    expect(screen.getByTestId("home-audience-card-ucitelia")).toBeInTheDocument();
  });

  it("each persona card has the correct destination route", () => {
    render(<AudienceSection />);
    expect(screen.getByTestId("home-audience-link-bezni")).toHaveAttribute("data-to", "/test");
    expect(screen.getByTestId("home-audience-link-rodicia")).toHaveAttribute(
      "data-to",
      "/blog/kategoria/$slug",
    );
    expect(screen.getByTestId("home-audience-link-firmy")).toHaveAttribute("data-to", "/tests");
    expect(screen.getByTestId("home-audience-link-ucitelia")).toHaveAttribute(
      "data-to",
      "/schools",
    );
  });

  it("section is labelled via aria-labelledby for screen readers", () => {
    render(<AudienceSection />);
    expect(screen.getByTestId("home-audience-section")).toHaveAttribute(
      "aria-labelledby",
      "home-audience-heading",
    );
    expect(screen.getByTestId("home-audience-heading").id).toBe("home-audience-heading");
  });
});
