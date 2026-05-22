// E48-v3 PR-ASSIGN-DETAIL — multi-assignment UI regression suite for
// the admin ticket detail page. Covers chip rendering, empty state,
// AdminPicker integration (stubbed), self-assign / self-unassign
// affordances, optimistic add, and remove-chip → unassign RPC.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { makeQueryClient, renderAdmin, flushQueries } from "../../../utils/admin-query-wrapper";

const CURRENT_USER_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_ADMIN_ID = "00000000-0000-4000-8000-000000000020";
const TICKET_ID = "00000000-0000-4000-8000-0000000000ff";

const rpcCalls: Array<{ name: string; params: unknown }> = [];

function installMocks() {
  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: { id: CURRENT_USER_ID } } }),
      },
      rpc: (name: string, params: unknown) => {
        rpcCalls.push({ name, params });
        return Promise.resolve({ data: { ok: true }, error: null });
      },
      from: () => {
        const chain: Record<string, unknown> = {};
        const terminal = Promise.resolve({
          data: { id: CURRENT_USER_ID, display_name: "Audit Bot", email: "audit@test.sk" },
          error: null,
        });
        for (const m of ["select", "eq"]) chain[m] = () => chain;
        chain.maybeSingle = () => terminal;
        return chain;
      },
    },
  }));

  // Stub AdminPicker so the test doesn't depend on Radix portal +
  // command-list internals. The stub renders the trigger and a plain
  // button per "available admin" that calls onSelect when clicked.
  vi.doMock("@/components/admin/common/AdminPicker", () => ({
    AdminPicker: ({
      trigger,
      selectedAdminIds,
      onSelect,
    }: {
      trigger: React.ReactNode;
      selectedAdminIds: string[];
      onSelect: (id: string) => void;
    }) => {
      const candidates = [CURRENT_USER_ID, OTHER_ADMIN_ID].filter(
        (id) => !selectedAdminIds.includes(id),
      );
      return (
        <div data-testid="admin-picker-stub">
          {trigger}
          {candidates.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`admin-picker-stub-option-${id}`}
              onClick={() => onSelect(id)}
            >
              pick {id}
            </button>
          ))}
        </div>
      );
    },
  }));
}

async function loadComponent() {
  const mod = await import("@/components/admin/detail/TicketAssignmentActions");
  return mod.TicketAssignmentActions;
}

function makeAssignee(userId: string, name: string, email: string) {
  return {
    user_id: userId,
    email,
    display_name: name,
    assigned_at: "2026-05-22T10:00:00.000Z",
  };
}

describe("TicketAssignmentActions (E48-v3 PR-ASSIGN-DETAIL)", () => {
  beforeEach(() => {
    vi.resetModules();
    rpcCalls.length = 0;
    installMocks();
  });

  it("renders empty-state label and full-width add trigger when nobody is assigned", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(<TicketAssignmentActions ticketId={TICKET_ID} assignees={[]} />, makeQueryClient());
    await flushQueries();
    expect(screen.getByTestId("admin-ticket-assignment-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ticket-assignment-empty-label").textContent).toContain(
      "Tiket nikomu nepridelený",
    );
    expect(screen.getByTestId("admin-ticket-assignment-add-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-ticket-assignees-list")).not.toBeInTheDocument();
  });

  it("renders one chip per assignee with the display name", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[
          makeAssignee(CURRENT_USER_ID, "Audit Bot", "audit@test.sk"),
          makeAssignee(OTHER_ADMIN_ID, "Bob Admin", "bob@test.sk"),
        ]}
      />,
    );
    await flushQueries();
    const list = screen.getByTestId("admin-ticket-assignees-list");
    expect(list).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-ticket-assignee-chip-${CURRENT_USER_ID}`).textContent,
    ).toContain("Audit Bot");
    expect(
      screen.getByTestId(`admin-ticket-assignee-chip-${OTHER_ADMIN_ID}`).textContent,
    ).toContain("Bob Admin");
  });

  it("marks the current user's chip with the (vy) suffix", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[makeAssignee(CURRENT_USER_ID, "Audit Bot", "audit@test.sk")]}
      />,
    );
    await flushQueries();
    await waitFor(() => {
      expect(
        screen.getByTestId(`admin-ticket-assignee-chip-${CURRENT_USER_ID}`).textContent,
      ).toContain("(vy)");
    });
  });

  it("clicking the chip remove button fires unassign_admin_from_ticket RPC with the user id", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[makeAssignee(OTHER_ADMIN_ID, "Bob Admin", "bob@test.sk")]}
      />,
    );
    await flushQueries();
    fireEvent.click(screen.getByTestId(`admin-ticket-assignee-remove-${OTHER_ADMIN_ID}`));
    await waitFor(() => {
      expect(
        rpcCalls.find(
          (c) =>
            c.name === "unassign_admin_from_ticket" &&
            (c.params as { p_user_id?: string }).p_user_id === OTHER_ADMIN_ID &&
            (c.params as { p_ticket_id?: string }).p_ticket_id === TICKET_ID,
        ),
      ).toBeTruthy();
    });
  });

  it("clicking an AdminPicker option fires assign_admin_to_ticket RPC and shows chip optimistically", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(<TicketAssignmentActions ticketId={TICKET_ID} assignees={[]} />);
    await flushQueries();
    fireEvent.click(screen.getByTestId(`admin-picker-stub-option-${OTHER_ADMIN_ID}`));
    // Chip appears immediately from the optimistic update — before the
    // RPC promise resolves.
    await waitFor(() => {
      expect(
        screen.getByTestId(`admin-ticket-assignee-chip-${OTHER_ADMIN_ID}`),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        rpcCalls.find(
          (c) =>
            c.name === "assign_admin_to_ticket" &&
            (c.params as { p_user_id?: string }).p_user_id === OTHER_ADMIN_ID,
        ),
      ).toBeTruthy();
    });
  });

  it("shows 'Prevziať' only when current user is NOT already assigned", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[makeAssignee(OTHER_ADMIN_ID, "Bob Admin", "bob@test.sk")]}
      />,
    );
    await flushQueries();
    await waitFor(() => {
      expect(screen.getByTestId("admin-ticket-assignment-self-assign")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("admin-ticket-assignment-self-unassign")).not.toBeInTheDocument();
  });

  it("shows 'Odhlásiť sa z pridelenia' only when current user IS assigned", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[makeAssignee(CURRENT_USER_ID, "Audit Bot", "audit@test.sk")]}
      />,
    );
    await flushQueries();
    await waitFor(() => {
      expect(screen.getByTestId("admin-ticket-assignment-self-unassign")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("admin-ticket-assignment-self-assign")).not.toBeInTheDocument();
  });

  it("clicking 'Prevziať' assigns the current user via RPC", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(<TicketAssignmentActions ticketId={TICKET_ID} assignees={[]} />);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-assignment-self-assign")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("admin-ticket-assignment-self-assign"));
    await waitFor(() => {
      expect(
        rpcCalls.find(
          (c) =>
            c.name === "assign_admin_to_ticket" &&
            (c.params as { p_user_id?: string }).p_user_id === CURRENT_USER_ID,
        ),
      ).toBeTruthy();
    });
  });

  it("clicking self-unassign opens an info-severity confirm dialog (no RPC until confirm)", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[makeAssignee(CURRENT_USER_ID, "Audit Bot", "audit@test.sk")]}
      />,
    );
    await flushQueries();
    fireEvent.click(screen.getByTestId("admin-ticket-assignment-self-unassign"));
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(dialog.getAttribute("data-severity")).toBe("info");
    expect(rpcCalls.some((c) => c.name === "unassign_admin_from_ticket")).toBe(false);
  });

  it("confirming self-unassign calls unassign_admin_from_ticket with the current user id", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[makeAssignee(CURRENT_USER_ID, "Audit Bot", "audit@test.sk")]}
      />,
    );
    await flushQueries();
    fireEvent.click(screen.getByTestId("admin-ticket-assignment-self-unassign"));
    fireEvent.click(await screen.findByTestId("app-shell-confirm-dialog-confirm"));
    await waitFor(() => {
      expect(
        rpcCalls.find(
          (c) =>
            c.name === "unassign_admin_from_ticket" &&
            (c.params as { p_user_id?: string }).p_user_id === CURRENT_USER_ID,
        ),
      ).toBeTruthy();
    });
  });

  it("renders the count badge with the number of current assignees", async () => {
    const TicketAssignmentActions = await loadComponent();
    renderAdmin(
      <TicketAssignmentActions
        ticketId={TICKET_ID}
        assignees={[
          makeAssignee(CURRENT_USER_ID, "Audit Bot", "audit@test.sk"),
          makeAssignee(OTHER_ADMIN_ID, "Bob Admin", "bob@test.sk"),
        ]}
      />,
    );
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-assignees-count").textContent).toBe("2"),
    );
  });
});
