import type { RpcContext } from "../mocks/supabase";
import { nextId, pad } from "./counters";

/**
 * Mock-seed helpers for the admin support-tickets stack.
 *
 * The admin queue + detail pages read the `support_tickets_with_assignees`
 * VIEW while counts/badges read the `support_tickets` TABLE, and every
 * mutation goes through SECURITY DEFINER RPCs. Specs that seed only the
 * table render an error state (the mock 404s unknown "tables", views
 * included), and specs that mock the RPCs as constants never see the
 * refetched rows change. These helpers keep BOTH arrays in sync:
 *
 *   - `supportTicketTables(tickets)` derives the view rows (assignees,
 *     is_assigned, first_assignee_display_name) from the seeded tickets.
 *   - `supportTicketRpcs({ admins })` returns RPC resolvers that mutate
 *     the live `ctx.tables` arrays the way the real Postgres functions
 *     would, so invalidate-and-refetch cycles observe the side effects.
 */

type Row = Record<string, unknown>;

export interface SupportTicketAssigneeRow {
  user_id: string;
  email: string;
  display_name: string | null;
  assigned_at: string;
}

export interface SupportTicketAdmin {
  user_id: string;
  email: string;
  display_name: string;
}

const SEED_TIMESTAMP = "2026-05-21T10:00:00.000Z";

/** Deterministic uuid-shaped id so queue row testids are predictable. */
function ticketUuid(n: number): string {
  return `00000000-0000-4000-8000-${pad(n, 12)}`;
}

export function seedSupportTicket(overrides: Row = {}): Row {
  const n = nextId("support_ticket");
  return {
    id: ticketUuid(n),
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
    status: "new",
    category: "question",
    source: "public_kontakt",
    subject: `E2E ticket ${n}`,
    body: `Seeded e2e support ticket #${n} with at least twenty characters.`,
    submitter_user_id: null,
    submitter_email: `submitter-${n}@e2e.test`,
    submitter_name: `Submitter ${n}`,
    archived_at: null,
    deleted_at: null,
    resolved_at: null,
    assignees: [] as SupportTicketAssigneeRow[],
    ...overrides,
  };
}

export function seedTicketAssignee(
  admin: SupportTicketAdmin,
  assignedAt: string = SEED_TIMESTAMP,
): SupportTicketAssigneeRow {
  return {
    user_id: admin.user_id,
    email: admin.email,
    display_name: admin.display_name,
    assigned_at: assignedAt,
  };
}

export function seedSupportTicketAdmin(overrides: Partial<SupportTicketAdmin> = {}) {
  const n = nextId("support_ticket_admin");
  return {
    user_id: `00000000-0000-4000-9000-${pad(n, 12)}`,
    email: `ticket-admin-${n}@e2e.test`,
    display_name: `Ticket Admin ${n}`,
    ...overrides,
  } satisfies SupportTicketAdmin;
}

function viewRow(ticket: Row): Row {
  const assignees = (ticket.assignees as SupportTicketAssigneeRow[] | undefined) ?? [];
  const first = assignees[0];
  return {
    ...ticket,
    assignees,
    is_assigned: assignees.length > 0,
    first_assignee_display_name: first ? (first.display_name ?? first.email) : null,
  };
}

function tableRow(ticket: Row): Row {
  const { assignees: _assignees, ...rest } = ticket;
  return { ...rest };
}

/**
 * Build the full table seed for the tickets stack. Spread the result and
 * override `support_ticket_messages` / `support_ticket_attachments` when
 * a spec needs thread or attachment rows.
 */
export function supportTicketTables(tickets: Row[]): Record<string, Row[]> {
  return {
    support_tickets: tickets.map(tableRow),
    support_tickets_with_assignees: tickets.map(viewRow),
    support_ticket_messages: [],
    support_ticket_attachments: [],
    audit_log: [],
  };
}

function ticketRowsIn(ctx: RpcContext, ticketId: string): Row[] {
  const out: Row[] = [];
  for (const name of ["support_tickets", "support_tickets_with_assignees"]) {
    for (const row of ctx.tables[name] ?? []) {
      if (row.id === ticketId) out.push(row);
    }
  }
  return out;
}

function syncViewComputedColumns(row: Row): void {
  if (!("is_assigned" in row)) return;
  const assignees = (row.assignees as SupportTicketAssigneeRow[] | undefined) ?? [];
  const first = assignees[0];
  row.is_assigned = assignees.length > 0;
  row.first_assignee_display_name = first ? (first.display_name ?? first.email) : null;
}

export interface SupportTicketRpcsOptions {
  /** Admin directory served by `list_admin_users` and used to enrich assignee rows. */
  admins?: SupportTicketAdmin[];
}

/**
 * RPC resolvers that mutate the seeded tables (both the base table and
 * the view) the way the real SECURITY DEFINER functions do, so the UI's
 * invalidate-and-refetch after a mutation observes the new state.
 */
export function supportTicketRpcs(options: SupportTicketRpcsOptions = {}): Record<string, unknown> {
  const admins = options.admins ?? [];

  return {
    list_admin_users: admins,

    transition_ticket_status: (body: unknown, ctx: RpcContext) => {
      const { p_ticket_id, p_new_status } = body as {
        p_ticket_id: string;
        p_new_status: string;
      };
      const stamp = new Date().toISOString();
      let fromStatus: unknown = null;
      for (const row of ticketRowsIn(ctx, p_ticket_id)) {
        fromStatus = row.status;
        row.status = p_new_status;
        row.updated_at = stamp;
        if (p_new_status === "resolved") row.resolved_at = stamp;
        if (p_new_status === "archived") {
          row.archived_at = stamp;
        } else {
          row.archived_at = null;
        }
      }
      return { ticket_id: p_ticket_id, from_status: fromStatus, to_status: p_new_status };
    },

    assign_admin_to_ticket: (body: unknown, ctx: RpcContext) => {
      const { p_ticket_id, p_user_id } = body as { p_ticket_id: string; p_user_id: string };
      const admin = admins.find((a) => a.user_id === p_user_id);
      const stamp = new Date().toISOString();
      for (const row of ticketRowsIn(ctx, p_ticket_id)) {
        if (!("is_assigned" in row)) {
          row.updated_at = stamp;
          continue;
        }
        const assignees = [...((row.assignees as SupportTicketAssigneeRow[] | undefined) ?? [])];
        if (!assignees.some((a) => a.user_id === p_user_id)) {
          assignees.push({
            user_id: p_user_id,
            email: admin?.email ?? `admin-${p_user_id}@e2e.test`,
            display_name: admin?.display_name ?? null,
            assigned_at: stamp,
          });
        }
        row.assignees = assignees;
        row.updated_at = stamp;
        syncViewComputedColumns(row);
      }
      return { ticket_id: p_ticket_id, user_id: p_user_id };
    },

    unassign_admin_from_ticket: (body: unknown, ctx: RpcContext) => {
      const { p_ticket_id, p_user_id } = body as { p_ticket_id: string; p_user_id: string };
      const stamp = new Date().toISOString();
      let removed = false;
      for (const row of ticketRowsIn(ctx, p_ticket_id)) {
        if (!("is_assigned" in row)) continue;
        const assignees = (row.assignees as SupportTicketAssigneeRow[] | undefined) ?? [];
        const next = assignees.filter((a) => a.user_id !== p_user_id);
        removed = removed || next.length !== assignees.length;
        row.assignees = next;
        if (removed) row.updated_at = stamp;
        syncViewComputedColumns(row);
      }
      return { ticket_id: p_ticket_id, user_id: p_user_id, removed };
    },
  };
}
