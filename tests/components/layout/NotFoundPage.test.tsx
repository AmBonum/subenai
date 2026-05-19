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
});
