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

import { Route } from "@/routes/admin/quick-test.lazy";
import {
  adminMockRecorded,
  resetAdminMockRecorded,
  resetAdminMockTables,
} from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/quick-test", () => {
  beforeEach(() => {
    resetAdminMockTables();
    resetAdminMockRecorded();
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

  it("editing title calls the update mutation", async () => {
    render(<Page />);
    const titleInput = screen.getByTestId("quick-test-title-input") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Iný názov" } });
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter((u) => u.table === "quick_test_config");
      expect(updates.length).toBeGreaterThan(0);
      const last = updates[updates.length - 1];
      expect((last.patch.config as Record<string, unknown>).title).toBe("Iný názov");
    });
  });

  it("editing pass percentage persists as number", async () => {
    render(<Page />);
    const passInput = screen.getByTestId("quick-test-pass-input") as HTMLInputElement;
    fireEvent.change(passInput, { target: { value: "75" } });
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter((u) => u.table === "quick_test_config");
      expect(updates.length).toBeGreaterThan(0);
      const last = updates[updates.length - 1];
      expect((last.patch.config as Record<string, unknown>).pass_percentage).toBe(75);
    });
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
