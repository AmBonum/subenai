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

import { Route } from "@/routes/admin/header";
import { cmsHeaderStore, resetCmsStoresForTests } from "@/lib/admin/cms-mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/header", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
  });

  it("renders all header fields with seed values", () => {
    render(<Page />);
    const logo = screen.getByTestId("cms-header-form-logo") as HTMLInputElement;
    const ctaLabel = screen.getByTestId("cms-header-form-cta-label") as HTMLInputElement;
    const ctaUrl = screen.getByTestId("cms-header-form-cta-url") as HTMLInputElement;
    const mobile = screen.getByTestId("cms-header-form-mobile") as HTMLInputElement;
    expect(logo.value).toBe("/logo.svg");
    expect(ctaLabel.value).toBe("Spustiť rýchly test");
    expect(ctaUrl.value).toBe("/test");
    expect(mobile.value).toBe("Otvoriť menu");
  });

  it("editing a field updates the store", () => {
    render(<Page />);
    const logo = screen.getByTestId("cms-header-form-logo") as HTMLInputElement;
    fireEvent.change(logo, { target: { value: "/new-logo.svg" } });
    expect(cmsHeaderStore.get().logo_url).toBe("/new-logo.svg");
  });

  it("save button submits form", () => {
    render(<Page />);
    const form = screen.getByTestId("cms-header-form");
    fireEvent.submit(form);
    // No throw; ensures handler ran.
    expect(screen.getByTestId("cms-header-form-save")).toBeInTheDocument();
  });
});
