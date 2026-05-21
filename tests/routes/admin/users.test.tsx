import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    // Forward `...rest` so `<Button asChild>` (Radix Slot prop-merge)
    // propagates `data-testid` / `aria-label` to the rendered <a>.
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

import { Route } from "@/routes/admin/users.lazy";
import { adminRepo } from "@/lib/admin/mock-store";
import { adminMockTables } from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/users", () => {
  it("renders page header, search input, role filter, and seeded rows with badges", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-users-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-users-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-users-role-filter")).toBeInTheDocument();
    expect(screen.getByTestId("admin-users-table")).toBeInTheDocument();
    const seeded = adminRepo.users.list();
    expect(seeded.length).toBeGreaterThan(0);
    const first = seeded[0];
    expect(screen.getByTestId(`admin-users-row-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-users-role-badge-${first.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-users-edit-role-${first.id}`)).toBeInTheDocument();
  });

  it("filters by search query, showing empty state when nothing matches", () => {
    render(<Page />);
    const search = screen.getByTestId("admin-users-search-input") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "___no-such-user-string-xyz___" } });
    expect(screen.getByTestId("admin-users-empty-state")).toBeInTheDocument();
  });

  it("E46.2: renders the new GDPR filter + column header on the table", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-users-gdpr-filter")).toBeInTheDocument();
    // Column header uses the verbatim Slovak string from i18n.
    expect(screen.getByText("Posledná GDPR udalosť")).toBeInTheDocument();
  });

  it("E46.2: renders an active GDPR event cell (DSR badge + date + open-DSR dot) when activity is found", async () => {
    // Inject DSR/DPA rows for the first seeded user AFTER render so the
    // `seedAdminQueryClient` reset doesn't wipe them — the supabase mock's
    // `settle()` reads `adminMockTables` at await time via the live ref.
    const seeded = adminRepo.users.list();
    const target = seeded[0];
    render(<Page />);
    adminMockTables.dsr_requests.rows = [
      ...adminMockTables.dsr_requests.rows,
      {
        id: "dsr_e46_2_test",
        requester_email: target.email,
        type: "access",
        status: "open",
        note: null,
        created_at: "2026-05-20T12:00:00Z",
        sla_due_at: "2026-06-19T12:00:00Z",
        resolved_at: null,
      },
    ];
    await waitFor(() => {
      const event = screen.getByTestId(`admin-users-gdpr-event-${target.id}`);
      expect(event.getAttribute("data-event-kind")).toBe("dsr");
      // Open-DSR amber dot must appear for an `open` request.
      expect(screen.getByTestId(`admin-users-gdpr-open-dot-${target.id}`)).toBeInTheDocument();
    });
  });

  it("E46.2: `Iba s otvorenou DSR` filter hides users without an open DSR", async () => {
    const seeded = adminRepo.users.list();
    const [withOpen, withoutOpen] = seeded;
    render(<Page />);
    adminMockTables.dsr_requests.rows = [
      ...adminMockTables.dsr_requests.rows,
      {
        id: "dsr_e46_2_filter",
        requester_email: withOpen.email,
        type: "erase",
        status: "open",
        note: null,
        created_at: "2026-05-20T12:00:00Z",
        sla_due_at: "2026-06-19T12:00:00Z",
        resolved_at: null,
      },
    ];
    // Wait for the activity query to settle so the filter has data to act on.
    await waitFor(() => {
      expect(screen.getByTestId(`admin-users-gdpr-open-dot-${withOpen.id}`)).toBeInTheDocument();
    });
    // Open the GDPR filter via clicking the trigger then the option. The
    // Radix Select is stubbed in tests/setup.ts to dispatch as a native
    // select for accessibility — drive via the underlying state by clicking
    // the trigger and the option role.
    fireEvent.click(screen.getByTestId("admin-users-gdpr-filter"));
    // The `Iba s otvorenou DSR` option text is the i18n value verbatim.
    fireEvent.click(screen.getByText("Iba s otvorenou DSR"));
    await waitFor(() => {
      expect(screen.getByTestId(`admin-users-row-${withOpen.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`admin-users-row-${withoutOpen.id}`)).not.toBeInTheDocument();
    });
  });
});
