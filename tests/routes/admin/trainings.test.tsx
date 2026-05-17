import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

beforeAll(() => {
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/trainings";
import { adminRepo } from "@/lib/admin/mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/trainings", () => {
  it("renders page header, search, new button, and seeded rows", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-trainings-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-trainings-list-search")).toBeInTheDocument();
    expect(screen.getByTestId("admin-trainings-list-new-button")).toBeInTheDocument();
    const seeded = adminRepo.trainings.list();
    expect(seeded.length).toBeGreaterThan(0);
    const first = seeded[0];
    expect(screen.getByTestId(`admin-trainings-list-row-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-trainings-row-edit-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-trainings-row-duplicate-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-trainings-row-delete-${first.id}`)).toBeInTheDocument();
  });

  it("filters by search, showing the empty state when nothing matches", () => {
    render(<Page />);
    const search = screen.getByTestId("admin-trainings-list-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "___no-such-training-xyz___" } });
    expect(screen.getByTestId("admin-trainings-list-empty-state")).toBeInTheDocument();
  });

  it("duplicate creates a new row with the (copy) suffix", () => {
    render(<Page />);
    const before = adminRepo.trainings.list().length;
    const first = adminRepo.trainings.list()[0];
    fireEvent.click(screen.getByTestId(`admin-trainings-row-duplicate-${first.id}`));
    const after = adminRepo.trainings.list();
    expect(after.length).toBe(before + 1);
    expect(after.some((t) => t.title.endsWith("(kópia)"))).toBe(true);
  });
});
