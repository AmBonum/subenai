import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/dsr.lazy";
import { adminMockRecorded, resetAdminMockRecorded } from "../../utils/admin-supabase-mock";

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

  it("resolve button issues an UPDATE on the dsr_requests row via the mutation hook", async () => {
    resetAdminMockRecorded();
    render(<Page />);
    fireEvent.click(screen.getByTestId("dsr-queue-row-resolve-button-dsr_001"));
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter(
        (u) => u.table === "dsr_requests" && u.match.id === "dsr_001",
      );
      expect(updates.length).toBe(1);
      expect(updates[0].patch.status).toBe("completed");
    });
  });
});
