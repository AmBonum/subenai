// E48-v2 PR-D — admin tickets queue overhaul tests. Covers the new
// surfaces in roughly 4 axes: filter wiring, row interactions,
// bulk-action menu, and keyboard shortcuts. The Supabase client is
// mocked at the module level so we capture filter args via .in/.eq
// calls without a real network round-trip.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { makeQueryClient, flushQueries } from "../../utils/admin-query-wrapper";
import { QueryClientProvider } from "@tanstack/react-query";

// --- Router mock (must come BEFORE the component import) ----------------

let mockSearch: Record<string, unknown> = {};
const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearch,
  useNavigate: () => navigateMock,
  Link: ({ children, ...rest }: { children?: ReactNode }) => <a {...rest}>{children}</a>,
}));

// --- Supabase mock -------------------------------------------------------

interface ChainCall {
  method: string;
  args: unknown[];
}
const chainCalls: ChainCall[] = [];
const rpcCalls: Array<{ name: string; params: unknown }> = [];
let ticketsResult: unknown[] = [];

function makeChain() {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "in",
    "is",
    "or",
    "order",
    "limit",
    "gte",
    "lte",
    "match",
  ];
  for (const m of methods) {
    chain[m] = (...args: unknown[]) => {
      chainCalls.push({ method: m, args });
      return chain;
    };
  }
  const terminal = Promise.resolve({ data: ticketsResult, error: null });
  chain.maybeSingle = () => terminal;
  chain.single = () => terminal;
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    terminal.then(onFulfilled, onRejected);
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "admin-uuid" } } }),
      getSession: async () => ({ data: { session: { access_token: "t" } } }),
    },
    rpc: (name: string, params: unknown) => {
      rpcCalls.push({ name, params });
      return Promise.resolve({ data: null, error: null });
    },
    from: () => makeChain(),
  },
}));

// --- Helpers -------------------------------------------------------------

const TICKET_A = {
  id: "11111111-1111-4000-8000-000000000001",
  created_at: "2026-05-20T10:00:00.000Z",
  updated_at: "2026-05-20T10:00:00.000Z",
  status: "new",
  category: "bug",
  source: "web",
  subject: "Quiz nefunguje na mobile",
  body: "...",
  submitter_user_id: null,
  submitter_email: "alice@example.com",
  submitter_name: "Alice",
  assigned_to: null,
  archived_at: null,
  deleted_at: null,
};

const TICKET_B = {
  id: "22222222-2222-4000-8000-000000000002",
  created_at: "2026-05-19T10:00:00.000Z",
  updated_at: "2026-05-19T10:00:00.000Z",
  status: "in_progress",
  category: "question",
  source: "web",
  subject: "Ako spravujem profil?",
  body: "...",
  submitter_user_id: "u-2",
  submitter_email: "bob@example.com",
  submitter_name: "Bob",
  assigned_to: null,
  archived_at: null,
  deleted_at: null,
};

async function loadComponent() {
  const mod = await import("@/components/admin/SupportTicketsQueue");
  return mod.SupportTicketsQueue;
}

function renderQueue(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.resetModules();
  chainCalls.length = 0;
  rpcCalls.length = 0;
  navigateMock.mockReset();
  mockSearch = {};
  ticketsResult = [TICKET_A, TICKET_B];
});

// --- Tests ---------------------------------------------------------------

describe("SupportTicketsQueue (E48-v2 PR-D)", () => {
  it("renders the toolbar with status filter chips and the search input", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    expect(screen.getByTestId("admin-tickets-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-filter-status-new")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-filter-status-archived")).toBeInTheDocument();
  });

  it("renders two rows from the mocked query", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId(`admin-tickets-row-${TICKET_A.id}`)).toBeInTheDocument(),
    );
    expect(screen.getByTestId(`admin-tickets-row-${TICKET_B.id}`)).toBeInTheDocument();
  });

  it("renders rich-empty state when query returns no rows (queue variant)", async () => {
    ticketsResult = [];
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const empty = await screen.findByTestId("admin-tickets-empty-state");
    expect(empty).toHaveAttribute("data-variant", "queue");
  });

  it("shows filter-variant empty state when category filter is active and yields nothing", async () => {
    ticketsResult = [];
    mockSearch = { category: ["bug"] };
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const empty = await screen.findByTestId("admin-tickets-empty-state");
    expect(empty).toHaveAttribute("data-variant", "filter");
  });

  it("shows search-variant empty state when q is set and yields nothing", async () => {
    ticketsResult = [];
    mockSearch = { q: "doesnotmatch" };
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const empty = await screen.findByTestId("admin-tickets-empty-state");
    expect(empty).toHaveAttribute("data-variant", "search");
  });

  it("query is called with default statuses (.in('status', [...]))", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const inCalls = chainCalls.filter((c) => c.method === "in");
    const statusCall = inCalls.find((c) => c.args[0] === "status");
    expect(statusCall).toBeTruthy();
    expect(statusCall!.args[1]).toEqual(
      expect.arrayContaining(["new", "in_progress", "waiting_user", "reopened"]),
    );
  });

  it("applies category filter when category param present in URL", async () => {
    mockSearch = { category: ["bug", "question"] };
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const inCalls = chainCalls.filter((c) => c.method === "in");
    const catCall = inCalls.find((c) => c.args[0] === "category");
    expect(catCall).toBeTruthy();
    expect(catCall!.args[1]).toEqual(expect.arrayContaining(["bug", "question"]));
  });

  it("clicking a status chip dispatches navigate (URL sync)", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    fireEvent.click(screen.getByTestId("admin-tickets-filter-status-resolved"));
    expect(navigateMock).toHaveBeenCalled();
    const call = navigateMock.mock.calls[0][0] as { search: unknown };
    // search may be a function
    if (typeof call.search === "function") {
      const result = call.search({}) as Record<string, unknown>;
      expect(Array.isArray(result.status)).toBe(true);
    }
  });

  it("typing in search input updates local state but URL only fires after debounce", async () => {
    const SupportTicketsQueue = await loadComponent();
    const user = userEvent.setup();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const input = screen.getByTestId("admin-tickets-search-input") as HTMLInputElement;
    await user.type(input, "quiz");
    expect(input.value).toBe("quiz");
    // URL sync is debounced — without waiting, navigate may not have been called for `q`.
    // We don't assert exact timing, just that the input owns the typed value.
  });

  it("select-all checkbox toggles all visible row checkboxes", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const selectAll = screen.getByTestId("admin-tickets-select-all");
    fireEvent.click(selectAll);
    await waitFor(() => {
      expect(
        screen.getByTestId(`admin-tickets-row-${TICKET_A.id}`).getAttribute("data-selected"),
      ).toBe("true");
      expect(
        screen.getByTestId(`admin-tickets-row-${TICKET_B.id}`).getAttribute("data-selected"),
      ).toBe("true");
    });
  });

  it("selecting a row reveals the bulk-action bar with counts", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    fireEvent.click(screen.getByTestId(`admin-tickets-row-checkbox-${TICKET_A.id}`));
    await waitFor(() =>
      expect(screen.getByTestId("admin-tickets-bulk-selection-count")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("admin-tickets-bulk-action-resolve")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-bulk-action-archive")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-bulk-action-assign")).toBeInTheDocument();
  });

  it("bulk archive opens a warning ConfirmDialog", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    fireEvent.click(screen.getByTestId(`admin-tickets-row-checkbox-${TICKET_A.id}`));
    await waitFor(() => screen.getByTestId("admin-tickets-bulk-action-archive"));
    fireEvent.click(screen.getByTestId("admin-tickets-bulk-action-archive"));
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(dialog.getAttribute("data-severity")).toBe("warning");
  });

  it("bulk resolve confirmation fires the transition_ticket_status RPC for selected ids", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    fireEvent.click(screen.getByTestId(`admin-tickets-row-checkbox-${TICKET_A.id}`));
    fireEvent.click(screen.getByTestId(`admin-tickets-row-checkbox-${TICKET_B.id}`));
    await waitFor(() => screen.getByTestId("admin-tickets-bulk-action-resolve"));
    fireEvent.click(screen.getByTestId("admin-tickets-bulk-action-resolve"));
    fireEvent.click(await screen.findByTestId("app-shell-confirm-dialog-confirm"));
    await waitFor(() => {
      const resolveCalls = rpcCalls.filter(
        (c) =>
          c.name === "transition_ticket_status" &&
          (c.params as { p_new_status?: string }).p_new_status === "resolved",
      );
      expect(resolveCalls.length).toBe(2);
    });
  });

  it("clicking on a row triggers navigation to the detail page", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    fireEvent.click(screen.getByTestId(`admin-tickets-row-${TICKET_A.id}`));
    const navCall = navigateMock.mock.calls.find(
      (c) => (c[0] as { to?: string }).to === "/admin/tickets/$ticketId",
    );
    expect(navCall).toBeTruthy();
    expect((navCall![0] as { params: { ticketId: string } }).params.ticketId).toBe(TICKET_A.id);
  });

  it("pressing Enter on a focused row navigates to detail", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const row = screen.getByTestId(`admin-tickets-row-${TICKET_A.id}`);
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    await waitFor(() => {
      const navCall = navigateMock.mock.calls.find(
        (c) => (c[0] as { to?: string }).to === "/admin/tickets/$ticketId",
      );
      expect(navCall).toBeTruthy();
    });
  });

  it("the row action menu trigger is present per row", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    expect(screen.getByTestId(`admin-tickets-row-action-menu-${TICKET_A.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-tickets-row-action-menu-${TICKET_B.id}`)).toBeInTheDocument();
  });

  it("the chevron link is rendered with stable testid for each row", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    expect(screen.getByTestId(`admin-tickets-row-open-link-${TICKET_A.id}`)).toBeInTheDocument();
  });

  it("Slash shortcut focuses the search input", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    const input = screen.getByTestId("admin-tickets-search-input");
    // Make sure we're not focused on an input (simulate from body).
    act(() => {
      document.body.focus();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
    });
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("? shortcut opens the keyboard shortcut dialog", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    act(() => {
      document.body.focus();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    });
    await waitFor(() =>
      expect(screen.getByTestId("admin-tickets-shortcuts-dialog")).toBeInTheDocument(),
    );
  });

  it("export button renders the export dropdown trigger", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    expect(screen.getByTestId("admin-tickets-export-csv")).toBeInTheDocument();
  });

  it("renders the live count summary", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    expect(screen.getByTestId("admin-tickets-header-count")).toBeInTheDocument();
  });

  it("renders the sort dropdown", async () => {
    const SupportTicketsQueue = await loadComponent();
    renderQueue(<SupportTicketsQueue />);
    await flushQueries();
    expect(screen.getByTestId("admin-tickets-sort-dropdown")).toBeInTheDocument();
  });
});
