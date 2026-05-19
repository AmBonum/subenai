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

import { ChangelogTeaser } from "@/components/home/ChangelogTeaser";

describe("ChangelogTeaser", () => {
  it("renders the teaser link with the i18n label", () => {
    render(<ChangelogTeaser />);
    expect(screen.getByTestId("home-changelog-teaser")).toBeInTheDocument();
    expect(screen.getByText("Najnovšie zmeny:")).toBeInTheDocument();
    expect(screen.getByTestId("home-changelog-teaser-cta")).toHaveTextContent("pozri zoznam zmien");
  });

  it("links to /changelog", () => {
    render(<ChangelogTeaser />);
    expect(screen.getByTestId("home-changelog-teaser-link")).toHaveAttribute(
      "data-to",
      "/changelog",
    );
  });
});
