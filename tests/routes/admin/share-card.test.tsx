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
  };
});

import { Route } from "@/routes/admin/share-card";
import {
  adminMockRecorded,
  resetAdminMockRecorded,
  resetAdminMockTables,
} from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/share-card", () => {
  beforeEach(() => {
    resetAdminMockTables();
    resetAdminMockRecorded();
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

  it("editing title calls the update mutation", async () => {
    render(<Page />);
    const title = screen.getByTestId("share-card-config-title-fallback") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Iný názov" } });
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter((u) => u.table === "share_card_config");
      expect(updates.length).toBeGreaterThan(0);
      const last = updates[updates.length - 1];
      const branding = last.patch.branding as Record<string, unknown>;
      expect(branding.title_fallback).toBe("Iný názov");
    });
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
