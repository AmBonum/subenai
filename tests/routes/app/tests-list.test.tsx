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

import { Route } from "@/routes/app.tests.index";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/tests (AH-5.1 list)", () => {
  it("renders seeded tests with filters and new-test CTA", () => {
    render(<Page />);
    expect(screen.getByTestId("tests-list-root")).toBeInTheDocument();
    expect(screen.getByTestId("tests-list-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("tests-list-status-filter")).toBeInTheDocument();
    expect(screen.getByTestId("tests-list-branch-filter")).toBeInTheDocument();
    expect(screen.getByTestId("tests-list-new-test-button")).toBeInTheDocument();
    expect(screen.getByTestId("tests-list-clear-filters-button")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^tests-list-row-/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("tests-list-empty-state")).not.toBeInTheDocument();
  });

  it("shows the empty state when search matches nothing", () => {
    render(<Page />);
    const input = screen.getByTestId("tests-list-search-input");
    fireEvent.change(input, {
      target: { value: "zzz-this-string-will-never-match-any-test-xyz" },
    });
    expect(screen.getByTestId("tests-list-empty-state")).toBeInTheDocument();
  });

  it("new-test button links to /app/tests/new", () => {
    const { container } = render(<Page />);
    // With <Button asChild><Link>, the Link replaces the button root; the
    // mocked Link renders as <a to="...">.
    const newBtn = container.querySelector('[data-testid="tests-list-new-test-button"]');
    expect(newBtn?.getAttribute("to") ?? newBtn?.querySelector("a")?.getAttribute("to")).toBe(
      "/app/tests/new",
    );
  });
});
