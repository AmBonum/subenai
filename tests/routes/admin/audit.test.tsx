import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

import { Route } from "@/routes/admin/audit.lazy";
import * as store from "@/lib/platform/mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/audit", () => {
  it("renders header, every filter, table, and pagination controls", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-audit-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-audit-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-filter-actor")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-filter-action")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-filter-pii")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-filter-date-from")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-filter-date-to")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-table")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-pagination-next")).toBeInTheDocument();
    expect(screen.getByTestId("audit-log-pagination-prev")).toBeInTheDocument();
  });

  it("typing an unmatched actor filter shows the empty state", () => {
    render(<Page />);
    const input = screen.getByTestId("audit-log-filter-actor") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "___no-such-actor-xyz___" } });
    expect(screen.getByTestId("audit-log-empty-state")).toBeInTheDocument();
  });

  it("rendering the viewer does NOT append a new audit_log entry (would loop)", () => {
    const before = store.useAudit;
    const lenBefore = // Direct read via the same selector; renderHook adds noise — read the
      // module-level db indirectly through a fresh mount.
      [] as unknown;
    void lenBefore;
    // Snapshot count via a hidden mount of a tiny consumer.
    let mountedLen = 0;
    function Probe() {
      const audit = before();
      mountedLen = audit.length;
      return null;
    }
    const probe = render(<Probe />);
    const initial = mountedLen;
    probe.unmount();
    render(<Page />);
    const probe2 = render(<Probe />);
    expect(mountedLen).toBe(initial);
    probe2.unmount();
  });
});
