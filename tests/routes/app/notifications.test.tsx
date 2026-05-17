import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/app.notifications";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/notifications", () => {
  it("renders the inbox header, list, and filter control", () => {
    render(<Page />);
    expect(screen.getByTestId("app-notifications-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-notifications-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-notifications-list")).toBeInTheDocument();
    expect(screen.getByTestId("app-notifications-filter-unread")).toBeInTheDocument();
  });
});
