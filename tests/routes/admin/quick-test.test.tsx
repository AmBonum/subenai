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

import { Route } from "@/routes/admin/quick-test";
import { cmsQuickTestConfigStore, resetCmsStoresForTests } from "@/lib/admin/cms-mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/quick-test", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
  });

  it("renders all fields with seed values", () => {
    render(<Page />);
    const titleInput = screen.getByTestId("quick-test-title-input") as HTMLInputElement;
    expect(titleInput.value).toBe("Rýchly test bezpečnosti");
    const timeInput = screen.getByTestId("quick-test-time-input") as HTMLInputElement;
    expect(timeInput.value).toBe("120");
    const passInput = screen.getByTestId("quick-test-pass-input") as HTMLInputElement;
    expect(passInput.value).toBe("60");
  });

  it("editing title persists to mock store", () => {
    render(<Page />);
    const titleInput = screen.getByTestId("quick-test-title-input") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Iný názov" } });
    expect(cmsQuickTestConfigStore.get().title).toBe("Iný názov");
  });

  it("editing pass percentage persists as number", () => {
    render(<Page />);
    const passInput = screen.getByTestId("quick-test-pass-input") as HTMLInputElement;
    fireEvent.change(passInput, { target: { value: "75" } });
    expect(cmsQuickTestConfigStore.get().pass_percentage).toBe(75);
  });

  it("visibility toggle is interactive", () => {
    render(<Page />);
    expect(screen.getByTestId("quick-test-visibility-toggle")).toBeInTheDocument();
  });

  it("save submits without throwing", () => {
    render(<Page />);
    fireEvent.submit(screen.getByTestId("quick-test-config-form"));
    expect(screen.getByTestId("quick-test-save-button")).toBeInTheDocument();
  });
});
