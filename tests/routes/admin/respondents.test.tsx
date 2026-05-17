import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

import { Route } from "@/routes/admin/respondents";
import * as fns from "@/lib/admin/respondents.functions";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/respondents", () => {
  it("renders header, filters, search, and seeded table; logs an audit access on mount", () => {
    const spy = vi.spyOn(fns, "logRespondentsAccess");
    render(<Page />);
    expect(screen.getByTestId("admin-respondents-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-respondents-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("respondents-list-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("respondents-list-filter-test")).toBeInTheDocument();
    expect(screen.getByTestId("respondents-list-filter-status")).toBeInTheDocument();
    expect(screen.getByTestId("respondents-list-table")).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("typing a non-matching query renders the empty state", () => {
    render(<Page />);
    const input = screen.getByTestId("respondents-list-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "___definitely-no-such-respondent-xyz___" } });
    expect(screen.getByTestId("respondents-list-empty-state")).toBeInTheDocument();
  });
});
