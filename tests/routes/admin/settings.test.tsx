import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/admin/settings";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/settings", () => {
  it("renders form, deferred notice, and submit button", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-settings-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-form")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-deferred-notice")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-submit")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-retention-default-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-branding-primary-color")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-feature-flag-ai_generator")).toBeInTheDocument();
  });

  it("submit fires without throwing (no real persistence)", () => {
    render(<Page />);
    expect(() => fireEvent.click(screen.getByTestId("admin-settings-submit"))).not.toThrow();
  });
});
