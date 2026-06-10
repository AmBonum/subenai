import type { JSX } from "react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

import { Route } from "@/routes/admin/header.lazy";
import {
  adminMockRecorded,
  resetAdminMockRecorded,
  resetAdminMockTables,
} from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/header", () => {
  beforeEach(() => {
    resetAdminMockTables();
    resetAdminMockRecorded();
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

  it("editing a field calls the update mutation", async () => {
    render(<Page />);
    const logo = screen.getByTestId("cms-header-form-logo") as HTMLInputElement;
    fireEvent.change(logo, { target: { value: "/new-logo.svg" } });
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter((u) => u.table === "cms_header");
      expect(updates.length).toBeGreaterThan(0);
      const last = updates[updates.length - 1];
      expect(last.patch.logo).toBe("/new-logo.svg");
    });
  });

  it("save button submits form", () => {
    render(<Page />);
    const form = screen.getByTestId("cms-header-form");
    fireEvent.submit(form);
    expect(screen.getByTestId("cms-header-form-save")).toBeInTheDocument();
  });
});
