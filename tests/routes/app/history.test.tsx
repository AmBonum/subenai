import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    // The empty-state CTA renders a <Link>; the real one needs a Router
    // context this unit test doesn't mount.
    Link: ({
      to,
      children,
      ...rest
    }: {
      to?: string;
      children?: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

import { Route } from "@/routes/app.history";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/history (AH-5.6)", () => {
  it("renders seeded timeline with filter controls", () => {
    render(<Page />);
    expect(screen.getByTestId("history-root")).toBeInTheDocument();
    expect(screen.getByTestId("history-test-filter")).toBeInTheDocument();
    expect(screen.getByTestId("history-date-from")).toBeInTheDocument();
    expect(screen.getByTestId("history-date-to")).toBeInTheDocument();
    expect(screen.getByTestId("history-event-type-filter")).toBeInTheDocument();
    expect(screen.getByTestId("history-clear-filters-button")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^history-row-/).length).toBeGreaterThan(0);
  });

  it("date-from filter set to far-future shows empty state", () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("history-date-from"), {
      target: { value: "2099-01-01" },
    });
    expect(screen.getByTestId("history-empty-state")).toBeInTheDocument();
  });
});
