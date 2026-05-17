import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
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
  };
});

import { Route } from "@/routes/admin/share-card";
import { cmsShareCardStore, resetCmsStoresForTests } from "@/lib/admin/cms-mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/share-card", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
  });

  it("renders all fields with seeded values", () => {
    render(<Page />);
    const og = screen.getByTestId("share-card-config-og-template-url") as HTMLInputElement;
    const title = screen.getByTestId("share-card-config-title-fallback") as HTMLInputElement;
    const desc = screen.getByTestId(
      "share-card-config-description-fallback",
    ) as HTMLTextAreaElement;
    expect(og.value).toBe("/og/default.png");
    expect(title.value).toContain("SubenAI");
    expect(desc.value.length).toBeGreaterThan(0);
  });

  it("editing title persists to mock store", () => {
    render(<Page />);
    const title = screen.getByTestId("share-card-config-title-fallback") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Iný názov" } });
    expect(cmsShareCardStore.get().title_fallback).toBe("Iný názov");
  });

  it("preview renders bound to current form state", () => {
    render(<Page />);
    const title = screen.getByTestId("share-card-config-title-fallback") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Náhľad" } });
    const preview = screen.getByTestId("share-card-config-preview");
    expect(preview).toHaveTextContent("Náhľad");
  });

  it("empty title fallback shows validation error and disables save", () => {
    render(<Page />);
    const title = screen.getByTestId("share-card-config-title-fallback") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "" } });
    expect(screen.getByTestId("share-card-config-title-error")).toBeInTheDocument();
    const save = screen.getByTestId("share-card-config-form-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});
