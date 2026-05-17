import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

// Import the route module — `component` is the page function we want to render.
import { Route } from "@/routes/app.index";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app dashboard", () => {
  it("renders the page header and four stat cards", () => {
    render(<Page />);
    expect(screen.getByTestId("app-dashboard-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-dashboard-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-dashboard-stat-card-tests")).toBeInTheDocument();
    expect(screen.getByTestId("app-dashboard-stat-card-sessions")).toBeInTheDocument();
    expect(screen.getByTestId("app-dashboard-stat-card-respondents")).toBeInTheDocument();
    expect(screen.getByTestId("app-dashboard-stat-card-completion")).toBeInTheDocument();
  });

  it("renders the Slovak header title", () => {
    render(<Page />);
    expect(screen.getByTestId("app-shell-page-header-title").textContent).toContain("Môj");
  });

  it("renders a completion percentage on the completion stat", () => {
    render(<Page />);
    expect(screen.getByTestId("app-dashboard-stat-card-completion-value").textContent).toMatch(
      /%$/,
    );
  });
});
