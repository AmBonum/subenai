// E48-v2 PR-DETAIL — regression tests for the admin ticket detail
// redesign. Covers: contrast tokens on admin/user message bubbles,
// FSM-driven status action buttons per status, archive confirm, audit
// log render + empty state, kebab dropdown items present.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode, ComponentProps } from "react";

import { makeQueryClient, renderAdmin, flushQueries } from "../../utils/admin-query-wrapper";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: ReactNode } & ComponentProps<"a">) => (
    <a {...rest}>{children}</a>
  ),
}));

// Build a thenable Supabase query chain that resolves to the given result.
type Result = { data: unknown; error: unknown; count?: number | null };

function makeChain(result: Result) {
  const chain: Record<string, unknown> = {};
  const terminal = Promise.resolve(result);
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
  for (const m of methods) chain[m] = () => chain;
  chain.maybeSingle = () => terminal;
  chain.single = () => terminal;
  chain.then = (onFulfilled: (v: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
    terminal.then(onFulfilled, onRejected);
  return chain;
}

interface MockState {
  ticket: Record<string, unknown> | null;
  messages: unknown[];
  attachments: unknown[];
  audit: unknown[];
  meta: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
}

let state: MockState;
const rpcCalls: Array<{ name: string; params: unknown }> = [];

function installSupabaseMock() {
  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: { id: "admin-uuid" } } }),
        getSession: async () => ({ data: { session: { access_token: "t" } } }),
      },
      rpc: (name: string, params: unknown) => {
        rpcCalls.push({ name, params });
        return Promise.resolve({ data: null, error: null });
      },
      from: (table: string) => {
        if (table === "support_tickets" || table === "support_tickets_with_assignees") {
          // First call (detail) returns the full ticket row; the metadata
          // panel re-queries with select("user_agent, ip_country") and
          // gets the same data — the chain returns the full row, the
          // panel reads only the meta cols. Updates also go through here.
          // E48-v3 — the detail hook now reads from the
          // support_tickets_with_assignees view; the same ticket fixture
          // satisfies both paths because the test never inspects the
          // assignees column.
          return makeChain({ data: state.ticket, error: null });
        }
        if (table === "support_tickets_with_assignees") {
          // E48-v3 PR-ASSIGN-DETAIL — the detail query now reads from the
          // multi-assignee view. The mock returns the same ticket row with
          // an `assignees` array (default empty when not set on the state).
          if (!state.ticket) return makeChain({ data: null, error: null });
          const row = {
            ...state.ticket,
            assignees: (state.ticket.assignees as unknown[]) ?? [],
          };
          return makeChain({ data: row, error: null });
        }
        if (table === "support_ticket_messages") {
          return makeChain({ data: state.messages, error: null });
        }
        if (table === "support_ticket_attachments") {
          return makeChain({ data: state.attachments, error: null });
        }
        if (table === "audit_log") {
          return makeChain({ data: state.audit, error: null });
        }
        if (table === "profiles") {
          return makeChain({ data: state.profile, error: null });
        }
        return makeChain({ data: null, error: null });
      },
    },
  }));
}

function baseTicket(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-05-20T10:00:00.000Z",
    updated_at: "2026-05-21T11:00:00.000Z",
    status: "new",
    category: "question",
    source: "web",
    subject: "Predmet žiadosti",
    body: "Telo žiadosti",
    submitter_user_id: null,
    submitter_email: "user@example.com",
    submitter_name: "Test User",
    assigned_to: null,
    archived_at: null,
    deleted_at: null,
    user_agent: "Mozilla/5.0",
    ip_country: "SK",
    ...overrides,
  };
}

async function loadComponent() {
  const mod = await import("@/components/admin/SupportTicketDetail");
  return mod.SupportTicketDetail;
}

describe("SupportTicketDetail (E48-v2 PR-DETAIL)", () => {
  beforeEach(() => {
    vi.resetModules();
    rpcCalls.length = 0;
    state = {
      ticket: baseTicket(),
      messages: [],
      attachments: [],
      audit: [],
      meta: null,
      profile: null,
    };
    installSupabaseMock();
  });

  it("renders subject, status badge, and submitter line", async () => {
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-detail-subject")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("admin-ticket-detail-subject").textContent).toBe("Predmet žiadosti");
    expect(screen.getByTestId("admin-ticket-detail-status-badge").textContent).toBe("Nové");
    expect(screen.getByTestId("admin-ticket-detail-submitter").textContent).toContain(
      "user@example.com",
    );
  });

  it("renders admin message with solid bg-accent (not washed-out tint)", async () => {
    state.messages = [
      {
        id: "msg-admin-1",
        ticket_id: state.ticket!.id,
        created_at: "2026-05-20T11:00:00.000Z",
        author_kind: "admin",
        author_user_id: "admin-uuid",
        author_name: "Admin Bot",
        body: "Tu je odpoveď.",
      },
    ];
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    const adminMsg = await screen.findByTestId("admin-ticket-detail-message-msg-admin-1");
    expect(adminMsg.className).toContain("bg-accent");
    expect(adminMsg.className).toContain("border-l-primary");
    // No washed-out emerald tint.
    expect(adminMsg.className).not.toContain("bg-emerald-50");
    // Body uses paired token text-accent-foreground for AA contrast.
    expect(adminMsg.innerHTML).toContain("text-accent-foreground");
  });

  it("renders system message as muted timeline entry (no card chrome)", async () => {
    state.messages = [
      {
        id: "msg-sys-1",
        ticket_id: state.ticket!.id,
        created_at: "2026-05-20T11:30:00.000Z",
        author_kind: "system",
        author_user_id: null,
        author_name: "Systém",
        body: "Stav zmenený na in_progress",
      },
    ];
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    const sys = await screen.findByTestId("admin-ticket-detail-message-msg-sys-1");
    expect(sys.tagName).toBe("P");
    expect(sys.className).toContain("text-muted-foreground");
  });

  it.each([
    ["new", ["in_progress", "resolved", "archived"]],
    ["in_progress", ["waiting_user", "resolved", "archived"]],
    ["waiting_user", ["in_progress", "resolved"]],
    ["resolved", ["reopened", "archived"]],
    ["reopened", ["in_progress", "resolved"]],
    ["archived", ["in_progress"]],
  ] as const)("shows FSM transitions %s -> %s", async (status, expected) => {
    state.ticket = baseTicket({ status });
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    for (const to of expected) {
      await waitFor(() =>
        expect(screen.getByTestId(`admin-ticket-status-action-${to}`)).toBeInTheDocument(),
      );
    }
  });

  it("clicking resolve opens success confirm dialog before transitioning", async () => {
    state.ticket = baseTicket({ status: "in_progress" });
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    fireEvent.click(screen.getByTestId("admin-ticket-status-action-resolved"));
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("data-severity")).toBe("success");
  });

  it("clicking archive opens warning confirm dialog", async () => {
    state.ticket = baseTicket({ status: "resolved" });
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    fireEvent.click(screen.getByTestId("admin-ticket-status-action-archived"));
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(dialog.getAttribute("data-severity")).toBe("warning");
  });

  it("confirming a transition fires transition_ticket_status RPC with the target status", async () => {
    state.ticket = baseTicket({ status: "in_progress" });
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    fireEvent.click(screen.getByTestId("admin-ticket-status-action-resolved"));
    fireEvent.click(await screen.findByTestId("app-shell-confirm-dialog-confirm"));
    await waitFor(() => {
      expect(
        rpcCalls.find(
          (c) =>
            c.name === "transition_ticket_status" &&
            (c.params as { p_new_status?: string }).p_new_status === "resolved",
        ),
      ).toBeTruthy();
    });
  });

  it("kebab trigger and primary action button are present in header", async () => {
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    // The Radix dropdown menu items are portalled and only mount on
    // click + jsdom doesn't fire pointer events the same way; assert
    // on the trigger and header primary action, which are the
    // user-visible regressions we care about (the menu items have
    // their own data-testid for e2e tests).
    expect(await screen.findByTestId("admin-ticket-detail-kebab-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ticket-detail-header-primary")).toBeInTheDocument();
  });

  it("audit log renders entries when query returns data", async () => {
    state.audit = [
      {
        id: "audit-1",
        actor_name: "Admin Bot",
        action: "support_ticket.status_changed",
        at: new Date(Date.now() - 60_000).toISOString(),
        details: null,
      },
      {
        id: "audit-2",
        actor_name: "Admin Bot",
        action: "support_ticket.replied",
        at: new Date(Date.now() - 3_600_000).toISOString(),
        details: null,
      },
    ];
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-audit-log-entries")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("admin-ticket-audit-log-entry-audit-1")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ticket-audit-log-entry-audit-2")).toBeInTheDocument();
  });

  it("audit log empty state renders placeholder when no entries", async () => {
    state.audit = [];
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-audit-log-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("admin-ticket-audit-log-empty").textContent).toContain(
      "Žiadne záznamy",
    );
  });

  it("metadata panel shows source label (Slovak), ID, and updated timestamp", async () => {
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-metadata-source").textContent).toBe("Web"),
    );
    expect(screen.getByTestId("admin-ticket-metadata-id").textContent).toBe(
      state.ticket!.id as string,
    );
    expect(screen.getByTestId("admin-ticket-metadata-updated-at")).toBeInTheDocument();
  });

  it("E48-v4: internal note checkbox toggles button label + helper text and clears after send", async () => {
    state.ticket = baseTicket({ status: "in_progress" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message_id: "msg-internal-1", is_internal: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    try {
      const SupportTicketDetail = await loadComponent();
      renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
      await flushQueries();

      // Default state: public reply.
      const sendBtn = await screen.findByTestId("admin-ticket-detail-reply-send");
      expect(sendBtn.textContent).toContain("Odoslať odpoveď");

      // Type a body, then check the internal toggle.
      const textarea = screen.getByTestId("admin-ticket-detail-reply-textarea");
      fireEvent.change(textarea, { target: { value: "Interná poznámka o tomto tickete." } });
      const toggle = screen.getByTestId("admin-ticket-detail-reply-internal-toggle");
      fireEvent.click(toggle);

      // Button label flips to "Uložiť poznámku".
      await waitFor(() => expect(sendBtn.textContent).toContain("Uložiť poznámku"));
      // Helper text shifts to the internal-note variant (verbatim Slovak).
      expect(screen.getByTestId("admin-ticket-detail-composer").textContent).toContain(
        "Zákazník ju neuvidí",
      );

      // Click send — fetch must carry is_internal: true.
      fireEvent.click(sendBtn);
      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
      const [, init] = fetchSpy.mock.calls[0];
      const sentBody = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
      expect(sentBody.is_internal).toBe(true);
      expect(sentBody.body).toBe("Interná poznámka o tomto tickete.");

      // After successful send, the toggle resets and the button label
      // returns to "Odoslať odpoveď".
      await waitFor(() => expect(sendBtn.textContent).toContain("Odoslať odpoveď"));
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("E48-v4: thread renders Interná poznámka badge for is_internal=true messages", async () => {
    state.messages = [
      {
        id: "msg-internal-7",
        ticket_id: state.ticket!.id,
        created_at: "2026-05-20T11:00:00.000Z",
        author_kind: "admin",
        author_user_id: "admin-uuid",
        author_name: "Admin Bot",
        body: "Toto si zákazník nikdy nepozrie.",
        is_internal: true,
      },
    ];
    const SupportTicketDetail = await loadComponent();
    renderAdmin(<SupportTicketDetail ticketId={state.ticket!.id as string} />);
    await flushQueries();
    const badge = await screen.findByTestId(
      "admin-ticket-detail-message-internal-badge-msg-internal-7",
    );
    expect(badge.textContent).toContain("Interná poznámka");
    const bubble = screen.getByTestId("admin-ticket-detail-message-msg-internal-7");
    expect(bubble.getAttribute("data-is-internal")).toBe("true");
    // Amber palette signals private — not the regular bg-accent.
    expect(bubble.className).toContain("bg-amber-50");
  });

  it("renders not-found state when ticket is missing", async () => {
    state.ticket = null;
    const SupportTicketDetail = await loadComponent();
    const client = makeQueryClient();
    renderAdmin(<SupportTicketDetail ticketId="missing" />, client);
    await flushQueries();
    await waitFor(() =>
      expect(screen.getByTestId("admin-ticket-detail-not-found")).toBeInTheDocument(),
    );
  });
});
