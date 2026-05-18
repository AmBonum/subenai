import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

import { Route } from "@/routes/admin/dsr";
import * as platformStore from "@/lib/platform/mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/dsr", () => {
  it("renders header, filters, queue table, and seeded rows with SLA badges", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-dsr-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-dsr-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-queue-filter-status")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-queue-filter-type")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-queue-table")).toBeInTheDocument();
    // The very first seeded DSR row + its SLA badge must exist.
    expect(screen.getByTestId("dsr-queue-row-dsr_001")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-queue-row-sla-badge-dsr_001")).toBeInTheDocument();
  });

  it("resolve button moves the row to completed via the store", () => {
    render(<Page />);
    const btn = screen.getByTestId("dsr-queue-row-resolve-button-dsr_001");
    fireEvent.click(btn);
    // AH-11.1b: reads come from TanStack Query / Supabase; the mutation still
    // writes to the platform mock-store and AH-11.1c wires it through the
    // matching mutation hook. Probe the platform store to confirm the click
    // reached it.
    let dsr: { id: string; status: string }[] = [];
    function Probe() {
      dsr = platformStore.useDSR();
      return null;
    }
    const probe = render(<Probe />);
    probe.unmount();
    expect(dsr.find((d) => d.id === "dsr_001")?.status).toBe("completed");
  });
});
