import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
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
});
