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

import { Route } from "@/routes/app.teams";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/teams", () => {
  it("renders teams list and invite card", () => {
    render(<Page />);
    expect(screen.getByTestId("app-teams-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-teams-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-teams-list")).toBeInTheDocument();
    expect(screen.getByTestId("app-teams-invite-card")).toBeInTheDocument();
    expect(screen.getByTestId("app-teams-invite-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("app-teams-invite-button")).toBeInTheDocument();
  });
});
