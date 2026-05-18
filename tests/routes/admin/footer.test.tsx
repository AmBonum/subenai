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

import { Route } from "@/routes/admin/footer";
import { seedFooter } from "@/lib/admin/cms-mock-store";
import {
  adminMockRecorded,
  adminMockTables,
  resetAdminMockRecorded,
  resetAdminMockTables,
} from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function footerCols(): Array<{ links: unknown[] }> {
  return (adminMockTables.cms_footer.rows[0].columns as Array<{ links: unknown[] }>) ?? [];
}

describe("/admin/footer", () => {
  beforeEach(() => {
    resetAdminMockTables();
    resetAdminMockRecorded();
  });

  it("renders seeded columns", () => {
    render(<Page />);
    expect(screen.getByTestId("cms-footer-column-0")).toBeInTheDocument();
    expect(screen.getByTestId("cms-footer-column-1")).toBeInTheDocument();
  });

  it("renders seeded links inside columns", () => {
    render(<Page />);
    expect(screen.getByTestId("cms-footer-column-link-0-0")).toBeInTheDocument();
    expect(screen.getByTestId("cms-footer-column-link-0-1")).toBeInTheDocument();
  });

  it("add column appends a new column", async () => {
    render(<Page />);
    const before = footerCols().length;
    fireEvent.click(screen.getByTestId("cms-footer-form-add-column"));
    await waitFor(() => expect(footerCols().length).toBe(before + 1));
  });

  it("add link appends inside the column", async () => {
    render(<Page />);
    const before = footerCols()[0].links.length;
    fireEvent.click(screen.getByTestId("cms-footer-column-0-add-link"));
    await waitFor(() => expect(footerCols()[0].links.length).toBe(before + 1));
  });

  it("edit link label updates table", async () => {
    render(<Page />);
    const input = screen.getByTestId("cms-footer-column-link-0-0-label") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Nový štítok" } });
    await waitFor(() => {
      const links = footerCols()[0].links as Array<{ label: string }>;
      expect(links[0].label).toBe("Nový štítok");
    });
  });

  it("remove link drops it", async () => {
    render(<Page />);
    const before = footerCols()[0].links.length;
    fireEvent.click(screen.getByTestId("cms-footer-column-link-0-0-remove"));
    await waitFor(() => expect(footerCols()[0].links.length).toBe(before - 1));
  });

  it("remove column drops it", async () => {
    render(<Page />);
    const before = footerCols().length;
    fireEvent.click(screen.getByTestId("cms-footer-column-0-remove"));
    await waitFor(() => expect(footerCols().length).toBe(before - 1));
  });

  it("empty footer state renders when all columns removed", () => {
    adminMockTables.cms_footer.rows[0].columns = [];
    adminMockTables.cms_footer.rows[0].socials = [];
    render(<Page />);
    expect(screen.getByTestId("cms-footer-form-empty")).toBeInTheDocument();
  });

  it("save submits without throwing", () => {
    render(<Page />);
    fireEvent.submit(screen.getByTestId("cms-footer-form"));
    expect(screen.getByTestId("cms-footer-form-save")).toBeInTheDocument();
  });

  it("seed shape sanity", () => {
    expect(seedFooter.columns.length).toBe(2);
  });

  it("recorded mutations target cms_footer", async () => {
    render(<Page />);
    fireEvent.click(screen.getByTestId("cms-footer-form-add-column"));
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter((u) => u.table === "cms_footer");
      expect(updates.length).toBeGreaterThan(0);
    });
  });
});
