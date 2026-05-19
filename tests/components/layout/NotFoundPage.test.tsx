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

import { NotFoundPage } from "@/components/layout/NotFoundPage";

describe("NotFoundPage (E22)", () => {
  it("renders the root + title + body + kicker", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("not-found-root")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-title")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-body")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-kicker")).toBeInTheDocument();
  });

  it("renders a Home CTA pointing to /", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("not-found-home-cta")).toHaveAttribute("data-to", "/");
  });

  it("renders 4 suggestion cards to the right routes", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("not-found-suggestion-test")).toHaveAttribute("data-to", "/test");
    expect(screen.getByTestId("not-found-suggestion-academy")).toHaveAttribute("data-to", "/blog");
    expect(screen.getByTestId("not-found-suggestion-courses")).toHaveAttribute(
      "data-to",
      "/courses",
    );
    expect(screen.getByTestId("not-found-suggestion-schools")).toHaveAttribute(
      "data-to",
      "/schools",
    );
  });

  it("suggestions section has aria-labelledby pointing to its heading", () => {
    render(<NotFoundPage />);
    const section = screen.getByTestId("not-found-suggestions");
    expect(section).toHaveAttribute("aria-labelledby", "not-found-suggestions-heading");
    expect(screen.getByTestId("not-found-hint").id).toBe("not-found-suggestions-heading");
  });

  it("renders the LostIllustration SVG as decorative (aria-hidden)", () => {
    const { container } = render(<NotFoundPage />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  // Regression sentinel: 2026-05-19 — production was rendering raw
  // i18n keys (`back_to_start`, `errors.not_found_suggestions.*`) on
  // the 404 page because the component passed already-prefixed paths
  // to a resolver scoped to that prefix, and used the wrong section
  // for the home-CTA label. These checks pin down actual Slovak
  // strings so a copy/paste of the same mistake fails CI.
  it("renders Slovak strings for home CTA and suggestion cards (regression)", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("not-found-home-cta")).toHaveTextContent("Späť na úvod");
    expect(screen.getByTestId("not-found-suggestion-test")).toHaveTextContent("Spusti rýchly test");
    expect(screen.getByTestId("not-found-suggestion-academy")).toHaveTextContent("Otvor akadémiu");
    expect(screen.getByTestId("not-found-suggestion-courses")).toHaveTextContent("Pozri školenia");
    expect(screen.getByTestId("not-found-suggestion-schools")).toHaveTextContent(
      "Pre školy a učiteľov",
    );
  });

  it("does NOT leak raw i18n keys (regression)", () => {
    render(<NotFoundPage />);
    const text = screen.getByTestId("not-found-root").textContent ?? "";
    expect(text).not.toMatch(/errors\.not_found_suggestions/);
    expect(text).not.toMatch(/\bback_to_start\b/);
  });
});
