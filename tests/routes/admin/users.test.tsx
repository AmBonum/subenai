import { describe, it, expect, vi } from "vitest";
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

import { Route } from "@/routes/admin/users.lazy";
import { adminRepo } from "@/lib/admin/mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/users", () => {
  it("renders page header, search input, role filter, and seeded rows with badges", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-users-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-users-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-users-role-filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-users-table")).toBeInTheDocument();
    const seeded = adminRepo.users.list();
    expect(seeded.length).toBeGreaterThan(0);
    const first = seeded[0];
    expect(screen.getByTestId(`admin-users-row-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-users-role-badge-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-users-edit-role-${first.id}`)).toBeInTheDocument();
  });

  it("filters by search query, showing empty state when nothing matches", () => {
    render(<Page />);
    const search = screen.getByTestId("admin-users-search-input") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "___no-such-user-string-xyz___" } });
    expect(screen.getByTestId("admin-users-empty-state")).toBeInTheDocument();
  });
});
