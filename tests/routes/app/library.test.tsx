import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/app.library";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/library", () => {
  it("renders seeded questions and the filter controls", () => {
    render(<Page />);
    expect(screen.getByTestId("library-root")).toBeInTheDocument();
    expect(screen.getByTestId("library-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("library-branch-filter")).toBeInTheDocument();
    expect(screen.getByTestId("library-difficulty-filter")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^library-row-/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("library-empty-state")).not.toBeInTheDocument();
  });

  it("shows the empty state when search matches nothing", () => {
    render(<Page />);
    const input = screen.getByTestId("library-search-input");
    fireEvent.change(input, {
      target: { value: "zzz-no-question-will-match-this-string-xyz" },
    });
    expect(screen.getByTestId("library-empty-state")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^library-row-[^p]/).length).toBe(0);
  });
});
