import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigateMock,
  };
});

import { Route } from "@/routes/app.templates";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/templates (AH-5.5)", () => {
  it("renders seeded templates with search and category filter", () => {
    render(<Page />);
    expect(screen.getByTestId("templates-root")).toBeInTheDocument();
    expect(screen.getByTestId("templates-list-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("templates-list-category-filter")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^templates-list-row-/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("templates-list-empty-state")).not.toBeInTheDocument();
  });

  it("shows empty state when search matches nothing", () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("templates-list-search-input"), {
      target: { value: "zzz-no-template-matches-xyz" },
    });
    expect(screen.getByTestId("templates-list-empty-state")).toBeInTheDocument();
  });

  it("clicking Use navigates to /app/tests/new with templateId search param", () => {
    render(<Page />);
    const useButtons = screen.queryAllByTestId(/^templates-row-use-/);
    expect(useButtons.length).toBeGreaterThan(0);
    fireEvent.click(useButtons[0]!);
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/app/tests/new",
        search: expect.objectContaining({ templateId: expect.any(String) }),
      }),
    );
  });
});
