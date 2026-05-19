import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    // E21.7 — quick-links section uses Link; without a real RouterProvider
    // we mock to a plain anchor so the test can assert on the data-to attr.
    Link: ({
      to,
      children,
      ...rest
    }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
      <a data-to={typeof to === "string" ? to : ""} {...rest}>
        {children}
      </a>
    ),
  };
});

import { Route } from "@/routes/app.help";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/help", () => {
  it("renders FAQ list, search input, and contact CTA", () => {
    render(<Page />);
    expect(screen.getByTestId("app-help-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-faq-list")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-contact-cta")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-faq-item-0")).toBeInTheDocument();
  });

  it("narrows the FAQ list when the search input is typed in", () => {
    render(<Page />);
    const initialCount = screen.getAllByTestId(/^app-help-faq-item-/).length;
    fireEvent.change(screen.getByTestId("app-help-search-input"), {
      target: { value: "respondent" },
    });
    const filteredCount = screen.getAllByTestId(/^app-help-faq-item-/).length;
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  it("renders quick-link cards to deep docs (E21.7 island fix)", () => {
    render(<Page />);
    expect(screen.getByTestId("app-help-quick-links")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-quick-link-privacy")).toHaveAttribute(
      "data-to",
      "/privacy",
    );
    expect(screen.getByTestId("app-help-quick-link-cookies")).toHaveAttribute(
      "data-to",
      "/cookies",
    );
    expect(screen.getByTestId("app-help-quick-link-changelog")).toHaveAttribute(
      "data-to",
      "/changelog",
    );
    expect(screen.getByTestId("app-help-quick-link-schools")).toHaveAttribute(
      "data-to",
      "/schools",
    );
  });

  it("shows empty-state SVG + CTA when search yields no results", () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("app-help-search-input"), {
      target: { value: "this-query-matches-nothing-xyzzy" },
    });
    expect(screen.getByTestId("app-help-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-empty-title")).toBeInTheDocument();
    expect(screen.getByTestId("app-help-empty-cta")).toBeInTheDocument();
    expect(screen.queryByTestId("app-help-faq-list")).not.toBeInTheDocument();
  });
});
