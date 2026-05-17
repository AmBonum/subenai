import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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
  };
});

import { Route } from "@/routes/admin/navigation";
import { cmsNavigationStore, resetCmsStoresForTests } from "@/lib/admin/cms-mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function navIds() {
  return [...cmsNavigationStore.get()].sort((a, b) => a.position - b.position).map((i) => i.id);
}

describe("/admin/navigation", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
  });

  it("renders seeded items in order", () => {
    render(<Page />);
    const ids = navIds();
    expect(screen.getByTestId(`cms-nav-item-${ids[0]}`)).toBeInTheDocument();
    expect(screen.getByTestId(`cms-nav-item-${ids[1]}`)).toBeInTheDocument();
    expect(screen.getByTestId(`cms-nav-item-${ids[2]}`)).toBeInTheDocument();
  });

  it("add inserts a new item at the end", () => {
    render(<Page />);
    const before = cmsNavigationStore.get().length;
    fireEvent.click(screen.getByTestId("cms-nav-add-button"));
    expect(cmsNavigationStore.get().length).toBe(before + 1);
  });

  it("reorder swaps two positions", () => {
    render(<Page />);
    const ids = navIds();
    fireEvent.click(screen.getByTestId(`cms-nav-item-${ids[1]}-move-up`));
    const after = navIds();
    expect(after[0]).toBe(ids[1]);
    expect(after[1]).toBe(ids[0]);
  });

  it("edit updates label and url", () => {
    render(<Page />);
    const ids = navIds();
    fireEvent.click(screen.getByTestId(`cms-nav-item-edit-${ids[0]}`));
    const label = screen.getByTestId("cms-nav-item-form-label") as HTMLInputElement;
    fireEvent.change(label, { target: { value: "Nový štítok" } });
    const url = screen.getByTestId("cms-nav-item-form-url") as HTMLInputElement;
    fireEvent.change(url, { target: { value: "/nova-cesta" } });
    fireEvent.click(screen.getByTestId("cms-nav-item-form-save"));
    const updated = cmsNavigationStore.get().find((i) => i.id === ids[0])!;
    expect(updated.label).toBe("Nový štítok");
    expect(updated.url).toBe("/nova-cesta");
  });

  it("toggle visibility flips the flag", () => {
    render(<Page />);
    const ids = navIds();
    const before = cmsNavigationStore.get().find((i) => i.id === ids[0])!.visible;
    const row = screen.getByTestId(`cms-nav-item-${ids[0]}`);
    fireEvent.click(within(row).getByTestId(`cms-nav-item-${ids[0]}-visible`));
    const after = cmsNavigationStore.get().find((i) => i.id === ids[0])!.visible;
    expect(after).toBe(!before);
  });

  it("delete removes the row", () => {
    render(<Page />);
    const ids = navIds();
    fireEvent.click(screen.getByTestId(`cms-nav-item-delete-${ids[0]}`));
    expect(cmsNavigationStore.get().find((i) => i.id === ids[0])).toBeUndefined();
  });

  it("empty state renders without items", () => {
    cmsNavigationStore.set([]);
    render(<Page />);
    expect(screen.getByTestId("cms-nav-empty")).toBeInTheDocument();
  });
});
