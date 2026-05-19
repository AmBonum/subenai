import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: () => async () => null }),
  }),
  useServerFn: () => async () => null,
}));

import { Route } from "@/routes/admin/questions.lazy";
import { adminRepo } from "@/lib/admin/mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/questions list", () => {
  beforeEach(() => {
    // No reset needed: each render reads the live store. Tests below tolerate
    // additions from earlier specs because they assert presence, not exact count.
  });

  it("renders the page header + new button + seeded rows", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-questions-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-questions-new-button")).toBeInTheDocument();
    const seeded = adminRepo.questions.list();
    expect(seeded.length).toBeGreaterThan(0);
    expect(screen.getByTestId(`admin-questions-list-row-${seeded[0].id}`)).toBeInTheDocument();
  });

  it("renders the empty state when filters yield zero rows", () => {
    render(<Page />);
    const search = screen.getByTestId("admin-questions-search-input") as HTMLInputElement;
    fireEvent.change(search, {
      target: { value: "___definitely-not-a-question-title-xyz___" },
    });
    expect(screen.getByTestId("admin-questions-empty-state")).toBeInTheDocument();
  });
});
