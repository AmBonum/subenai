import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/index.lazy";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin index dashboard", () => {
  it("renders the page header and five stat cards (incl. DPA + DSR)", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-dashboard-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-stat-card-users")).toBeInTheDocument();
    expect(screen.getByTestId("admin-stat-card-tests")).toBeInTheDocument();
    expect(screen.getByTestId("admin-stat-card-sessions")).toBeInTheDocument();
    expect(screen.getByTestId("admin-stat-card-dsr-pending")).toBeInTheDocument();
    expect(screen.getByTestId("admin-stat-card-dpa-pending")).toBeInTheDocument();
  });

  it("renders the recent activity card with seeded rows", () => {
    render(<Page />);
    const card = screen.getByTestId("admin-dashboard-recent-activity");
    expect(card).toBeInTheDocument();
    expect(screen.getByTestId("admin-dashboard-recent-activity-row-act-1")).toBeInTheDocument();
  });
});
