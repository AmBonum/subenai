import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, string>)}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/tests";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/tests (AH-5.7)", () => {
  it("renders the page with all filters and seeded rows", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-tests-list-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tests-list-search")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tests-list-status-filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tests-list-difficulty-filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tests-list-branch-filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tests-list-owner-filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tests-list-clear-filters")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^admin-tests-list-row-/).length).toBeGreaterThan(0);
  });

  it("shows the empty state when the search excludes every row", () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("admin-tests-list-search"), {
      target: { value: "zzz-no-admin-test-matches-this-xyz" },
    });
    expect(screen.getByTestId("admin-tests-list-empty-state")).toBeInTheDocument();
  });
});
