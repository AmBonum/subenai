import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

import { Route } from "@/routes/admin/reports";
import { adminRepo } from "@/lib/admin/mock-store";
import { adminMockRecorded, resetAdminMockRecorded } from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/reports", () => {
  it("renders header, filters and the seeded queue table", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-reports-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-reports-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("reports-queue-filter-status")).toBeInTheDocument();
    expect(screen.getByTestId("reports-queue-filter-reason")).toBeInTheDocument();
    expect(screen.getByTestId("reports-queue-table")).toBeInTheDocument();
    const seeded = adminRepo.reports.list();
    expect(seeded.length).toBeGreaterThan(0);
    const first = seeded[0];
    expect(screen.getByTestId(`reports-queue-row-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`reports-queue-row-resolve-button-${first.id}`)).toBeInTheDocument();
  });

  it("resolve action issues an UPDATE on the reports row via the mutation hook", async () => {
    resetAdminMockRecorded();
    render(<Page />);
    const seeded = adminRepo.reports.list();
    const target = seeded.find((r) => r.status === "open") ?? seeded[0];
    fireEvent.click(screen.getByTestId(`reports-queue-row-resolve-button-${target.id}`));
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter(
        (u) => u.table === "reports" && u.match.id === target.id,
      );
      expect(updates.length).toBe(1);
      expect(updates[0].patch.status).toBe("resolved");
    });
  });
});
