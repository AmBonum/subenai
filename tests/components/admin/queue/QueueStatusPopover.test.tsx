// E48-v3 PR-QUEUE-EXTEND — QueueStatusPopover unit tests.
//
// Covers the popover open/close, the per-status transition matrix,
// the intermediate-vs-terminal confirmation discipline, and the
// stopPropagation guard that prevents the parent row's
// click-to-navigate from firing when the badge is clicked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const rpcCalls: Array<{ name: string; params: unknown }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, params: unknown) => {
      rpcCalls.push({ name, params });
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  QueueStatusPopover,
  type SupportTicketStatus,
} from "@/components/admin/queue/QueueStatusPopover";

const T_ID = "ticket-1";

function renderPopover(currentStatus: SupportTicketStatus) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<QueueStatusPopover ticketId={T_ID} currentStatus={currentStatus} />, {
    wrapper,
  });
}

beforeEach(() => {
  rpcCalls.length = 0;
});

describe("QueueStatusPopover (E48-v3)", () => {
  it("renders the badge trigger with the Slovak label for the current status", () => {
    renderPopover("new");
    const trigger = screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`);
    expect(trigger.textContent).toContain("Nové");
  });

  it("clicking the badge opens the popover with valid transitions for 'new'", async () => {
    renderPopover("new");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() =>
      expect(screen.getByTestId(`admin-tickets-row-status-popover-${T_ID}`)).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-in_progress`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-archived`),
    ).toBeInTheDocument();
  });

  it("popover for 'waiting_user' offers in_progress + resolved (no archive direct path)", async () => {
    renderPopover("waiting_user");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-popover-${T_ID}`));
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-in_progress`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`admin-tickets-row-status-option-${T_ID}-archived`),
    ).not.toBeInTheDocument();
  });

  it("popover for 'archived' only offers in_progress (unarchive)", async () => {
    renderPopover("archived");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-popover-${T_ID}`));
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-in_progress`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`),
    ).not.toBeInTheDocument();
  });

  it("popover for 'resolved' offers reopened + archived (both confirmed)", async () => {
    renderPopover("resolved");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-popover-${T_ID}`));
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-reopened`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-archived`),
    ).toBeInTheDocument();
  });

  it("clicking an intermediate transition (in_progress) calls the RPC immediately, no confirm", async () => {
    renderPopover("new");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-in_progress`));
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-in_progress`));
    await waitFor(() => {
      const transition = rpcCalls.find((c) => c.name === "transition_ticket_status");
      expect(transition).toBeTruthy();
      expect((transition!.params as { p_new_status: string }).p_new_status).toBe("in_progress");
    });
    // No confirm dialog opened.
    expect(screen.queryByTestId("app-shell-confirm-dialog-root")).not.toBeInTheDocument();
  });

  it("clicking a terminal transition (resolved) opens a success-severity confirm dialog", async () => {
    renderPopover("in_progress");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`));
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`));
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(dialog.getAttribute("data-severity")).toBe("success");
    // No mutation yet — user hasn't confirmed.
    expect(rpcCalls.filter((c) => c.name === "transition_ticket_status")).toHaveLength(0);
  });

  it("confirming the dialog fires the transition_ticket_status RPC with the target status", async () => {
    renderPopover("new");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-archived`));
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-archived`));
    const confirmBtn = await screen.findByTestId("app-shell-confirm-dialog-confirm");
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      const archive = rpcCalls.find(
        (c) =>
          c.name === "transition_ticket_status" &&
          (c.params as { p_new_status: string }).p_new_status === "archived",
      );
      expect(archive).toBeTruthy();
    });
  });

  it("cancelling the confirm dialog does NOT call the RPC", async () => {
    renderPopover("in_progress");
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    await waitFor(() => screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`));
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-option-${T_ID}-resolved`));
    const cancelBtn = await screen.findByTestId("app-shell-confirm-dialog-cancel");
    fireEvent.click(cancelBtn);
    // Give microtasks a beat to settle.
    await act(async () => {
      await Promise.resolve();
    });
    const resolved = rpcCalls.find(
      (c) =>
        c.name === "transition_ticket_status" &&
        (c.params as { p_new_status: string }).p_new_status === "resolved",
    );
    expect(resolved).toBeFalsy();
  });

  it("badge click stops event propagation so the parent row does not navigate", () => {
    const parentClick = vi.fn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        {/* The wrapping div is a stand-in for the queue row's
            click-to-navigate handler — if propagation isn't stopped on
            the badge button, this click handler would fire. */}
        <div onClick={parentClick} data-testid="row-stub">
          <QueueStatusPopover ticketId={T_ID} currentStatus="new" />
        </div>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByTestId(`admin-tickets-row-status-trigger-${T_ID}`));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
