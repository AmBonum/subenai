import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    Link: ({
      to,
      params,
      children,
      ...rest
    }: {
      to: string;
      params?: Record<string, string>;
      children: React.ReactNode;
      [k: string]: unknown;
    }) => {
      // TanStack Router style: `to="/admin/users/$userId"` + params={{ userId }}.
      // Substitute `$key` segments with `params[key]` so test assertions can
      // check the rendered href. Forward `...rest` so props injected by
      // shadcn `<Button asChild>` (Radix Slot merges data-testid, aria-*,
      // className, etc.) land on the rendered <a>.
      let href = to;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          href = href.replace(`$${k}`, v);
        }
      }
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      );
    },
  };
});

import { Route } from "@/routes/admin/dsr.lazy";
import {
  adminMockRecorded,
  adminMockTables,
  resetAdminMockRecorded,
} from "../../utils/admin-supabase-mock";

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

  it("exposes the new search input + CSV export button (parity with /admin/dpa-requests)", () => {
    render(<Page />);
    expect(screen.getByTestId("dsr-queue-search")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-queue-export-csv")).toBeInTheDocument();
  });

  it("E46.4: renders a DISABLED dossier link when requester_email has no matching profile", async () => {
    // Default SEED_DSR uses @example.sk / @firma.sk addresses; mockUsers are
    // all @subenai.sk — no overlap, so every seeded DSR row gets the disabled
    // icon (DSR from a non-registered subject).
    render(<Page />);
    await waitFor(() => {
      const btn = screen.getByTestId("dsr-queue-row-dossier-link-dsr_001");
      expect(btn).toBeInTheDocument();
      // <Button disabled> renders an actual button with disabled attribute,
      // not an <a> — so it's safe to check `disabled`.
      expect(btn).toBeDisabled();
      expect(btn.tagName.toLowerCase()).toBe("button");
    });
  });

  it("E46.4: renders an ACTIVE dossier link when requester_email matches a profile.email", async () => {
    // We have to mutate `adminMockTables.profiles.rows` AFTER the render —
    // the test harness's `seedAdminQueryClient` calls `syncAdminTablesFromMockStore`
    // on every render, which resets the table to the default `profileRows()`.
    // The supabase mock's `settle()` reads `adminMockTables` at await time
    // (via the live reference), so the post-render mutation lands before
    // useQuery's first promise resolves.
    const targetEmail = "anna.k@example.sk"; // == SEED_DSR[0].requester_email
    const targetUserId = "00000000-0000-4000-8000-00000000aaaa";
    render(<Page />);
    adminMockTables.profiles.rows = [
      ...adminMockTables.profiles.rows,
      {
        id: targetUserId,
        email: targetEmail,
        display_name: "Anna K.",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    await waitFor(() => {
      const link = screen.getByTestId("dsr-queue-row-dossier-link-dsr_001");
      // `<Button asChild>` from shadcn uses Radix Slot to merge its props
      // onto the child — so data-testid lands directly on the rendered
      // <a> (no wrapping <button>).
      expect(link.tagName.toLowerCase()).toBe("a");
      expect(link.getAttribute("href")).toBe(`/admin/users/${targetUserId}`);
    });
  });

  it("search filters rows by requester email substring", async () => {
    render(<Page />);
    const seededRow = screen.getByTestId("dsr-queue-row-dsr_001");
    expect(seededRow).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("dsr-queue-search"), {
      target: { value: "zzz_no_such_email_zzz" },
    });
    await waitFor(() => {
      expect(screen.queryByTestId("dsr-queue-row-dsr_001")).not.toBeInTheDocument();
    });
  });
});
