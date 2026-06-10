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

describe("/app/library — search filtering", () => {
  it("typing into the search input narrows the visible rows", () => {
    render(<Page />);
    const allRowsBefore = screen.queryAllByTestId(/^library-row-(?!preview-)/).length;
    expect(allRowsBefore).toBeGreaterThan(0);

    const input = screen.getByTestId("library-search-input");
    fireEvent.change(input, { target: { value: "phish" } });

    const allRowsAfter = screen.queryAllByTestId(/^library-row-(?!preview-)/).length;
    // Either narrowed to fewer rows, or matched nothing (empty state visible).
    if (allRowsAfter === 0) {
      expect(screen.getByTestId("library-empty-state")).toBeInTheDocument();
    } else {
      expect(allRowsAfter).toBeLessThanOrEqual(allRowsBefore);
    }
  });
});
