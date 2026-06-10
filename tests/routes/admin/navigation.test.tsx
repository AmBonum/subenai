import type { JSX } from "react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

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
    createLazyFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/admin/navigation.lazy";
import type { CmsNavItem } from "@/lib/admin/cms-types";
import {
  adminMockTables,
  resetAdminMockRecorded,
  resetAdminMockTables,
} from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function navItems(): CmsNavItem[] {
  return (adminMockTables.cms_navigation.rows[0].items as CmsNavItem[]) ?? [];
}

function navIds(): string[] {
  return [...navItems()].sort((a, b) => a.position - b.position).map((i) => i.id);
}

describe("/admin/navigation", () => {
  beforeEach(() => {
    resetAdminMockTables();
    resetAdminMockRecorded();
  });

  it("renders seeded items in order", () => {
    render(<Page />);
    const ids = navIds();
    expect(screen.getByTestId(`cms-nav-item-${ids[0]}`)).toBeInTheDocument();
    expect(screen.getByTestId(`cms-nav-item-${ids[1]}`)).toBeInTheDocument();
    expect(screen.getByTestId(`cms-nav-item-${ids[2]}`)).toBeInTheDocument();
  });

  it("add inserts a new item at the end", async () => {
    render(<Page />);
    const before = navItems().length;
    fireEvent.click(screen.getByTestId("cms-nav-add-button"));
    await waitFor(() => expect(navItems().length).toBe(before + 1));
  });

  it("reorder swaps two positions", async () => {
    render(<Page />);
    const ids = navIds();
    fireEvent.click(screen.getByTestId(`cms-nav-item-${ids[1]}-move-up`));
    await waitFor(() => {
      const after = navIds();
      expect(after[0]).toBe(ids[1]);
      expect(after[1]).toBe(ids[0]);
    });
  });

  it("edit updates label and url", async () => {
    render(<Page />);
    const ids = navIds();
    fireEvent.click(screen.getByTestId(`cms-nav-item-edit-${ids[0]}`));
    const label = screen.getByTestId("cms-nav-item-form-label") as HTMLInputElement;
    fireEvent.change(label, { target: { value: "Nový štítok" } });
    const url = screen.getByTestId("cms-nav-item-form-url") as HTMLInputElement;
    fireEvent.change(url, { target: { value: "/nova-cesta" } });
    fireEvent.click(screen.getByTestId("cms-nav-item-form-save"));
    await waitFor(() => {
      const updated = navItems().find((i) => i.id === ids[0])!;
      expect(updated.label).toBe("Nový štítok");
      expect(updated.url).toBe("/nova-cesta");
    });
  });

  it("toggle visibility flips the flag", async () => {
    render(<Page />);
    const ids = navIds();
    const before = navItems().find((i) => i.id === ids[0])!.visible;
    const row = screen.getByTestId(`cms-nav-item-${ids[0]}`);
    fireEvent.click(within(row).getByTestId(`cms-nav-item-${ids[0]}-visible`));
    await waitFor(() => {
      const after = navItems().find((i) => i.id === ids[0])!.visible;
      expect(after).toBe(!before);
    });
  });

  it("delete removes the row", async () => {
    render(<Page />);
    const ids = navIds();
    fireEvent.click(screen.getByTestId(`cms-nav-item-delete-${ids[0]}`));
    await waitFor(() => expect(navItems().find((i) => i.id === ids[0])).toBeUndefined());
  });

  it("empty state renders without items", () => {
    adminMockTables.cms_navigation.rows[0].items = [];
    render(<Page />);
    expect(screen.getByTestId("cms-nav-empty")).toBeInTheDocument();
  });
});
