// E48-v2 PR-X — admin support-tickets queries extracted from
// `./queries.ts`. The original file kept a back-compat re-export shim
// for one release cycle, so existing consumers keep working unchanged.
//
// New hooks (counts, badge, assign-to-me, bulk actions, extended
// filter/sort signature on `useAdminSupportTickets`) are added at the
// bottom — they back PR-D (admin queue UI overhaul).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_TICKET_CATEGORIES } from "@/components/support/support-form-config";

// ---------------------------------------------------------------------------
// Escape helpers — only used by ticket search today, but exported for the
// security regression tests that already pin their exact behaviour.
// ---------------------------------------------------------------------------

export function ilikePatternEscape(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
}

/**
 * Escape a value being embedded into a PostgREST `or(...)` filter
 * expression. PostgREST's tokeniser treats `,`, `(`, `)` as structural
 * separators; URL-encoding them yields literal matches after PostgREST
 * decodes the request, while keeping the tokeniser from seeing them.
 *
 * Caller is responsible for first applying `ilikePatternEscape` if the
 * value goes into an ILIKE pattern.
 *
 * Exported for unit testing.
 */
export function postgrestOrEscape(input: string): string {
  return input.replace(/,/g, "%2C").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]["value"];

export type SupportTicketSortKey = "recency-desc" | "recency-asc" | "status" | "category";

export interface SupportTicketsFilters {
  statuses?: string[];
  categories?: SupportTicketCategory[] | string[];
  query?: string;
  includeArchived?: boolean;
  assignedTo?: string | "me" | "unassigned" | null;
  dateFrom?: string;
  dateTo?: string;
  sortKey?: SupportTicketSortKey;
}

export interface AdminSupportTicketRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  category: string;
  source: string;
  subject: string;
  body: string;
  submitter_user_id: string | null;
  submitter_email: string;
  submitter_name: string | null;
  assigned_to: string | null;
  archived_at: string | null;
  deleted_at: string | null;
}

// E48-v3 PR-ASSIGN-DETAIL — multi-assignee shape returned by the
// `support_tickets_with_assignees` security_invoker view. The detail
// page reads this; the queue still reads the flat `support_tickets`
// table during the staged migration (Wave 2 will switch the queue).
export interface SupportTicketAssignee {
  user_id: string;
  email: string;
  display_name: string | null;
  assigned_at: string;
}

export interface AdminSupportTicketDetailRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  category: string;
  source: string;
  subject: string;
  body: string;
  submitter_user_id: string | null;
  submitter_email: string;
  submitter_name: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  assignees: SupportTicketAssignee[];
}

export interface AdminSupportTicketMessage {
  id: string;
  ticket_id: string;
  created_at: string;
  author_kind: string;
  author_user_id: string | null;
  author_name: string;
  body: string;
}

export interface AdminSupportTicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  scan_status: string;
  created_at: string;
}

// PR-D status sort order: triage funnel — items that need admin attention
// first (new + reopened), then in-flight, then terminal states.
const STATUS_ORDER: Record<string, number> = {
  new: 0,
  in_progress: 1,
  waiting_user: 2,
  reopened: 3,
  resolved: 4,
  archived: 5,
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SUPPORT_TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

// ---------------------------------------------------------------------------
// Hooks (moved from queries.ts — behaviour unchanged)
// ---------------------------------------------------------------------------

export function useAdminSupportTickets(filters: SupportTicketsFilters = {}) {
  const {
    statuses,
    categories,
    query,
    includeArchived,
    assignedTo,
    dateFrom,
    dateTo,
    sortKey = "recency-desc",
  } = filters;
  return useQuery({
    queryKey: [
      "admin",
      "support_tickets",
      statuses,
      categories,
      query,
      includeArchived,
      assignedTo,
      dateFrom,
      dateTo,
      sortKey,
    ],
    queryFn: async (): Promise<AdminSupportTicketRow[]> => {
      let q = supabase
        .from("support_tickets")
        .select(
          "id, created_at, updated_at, status, category, source, subject, body, submitter_user_id, submitter_email, submitter_name, assigned_to, archived_at, deleted_at",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: sortKey === "recency-asc" })
        .limit(200);

      if (!includeArchived) {
        q = q.is("archived_at", null);
      }
      if (statuses && statuses.length > 0) {
        q = q.in("status", statuses);
      }
      if (categories && categories.length > 0) {
        q = q.in("category", categories as string[]);
      }
      if (assignedTo === "me") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) q = q.eq("assigned_to", user.id);
      } else if (assignedTo === "unassigned") {
        q = q.is("assigned_to", null);
      } else if (typeof assignedTo === "string" && assignedTo) {
        q = q.eq("assigned_to", assignedTo);
      }
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo);
      if (query && query.trim().length >= 2) {
        // Two layers of escape are necessary on a `q.or(...)` ILIKE call:
        //
        //   1. PostgreSQL LIKE/ILIKE pattern escape — the three special
        //      chars are `\`, `%`, `_`. Backslash must be escaped FIRST
        //      (if we escaped `%`/`_` first, the new backslashes they
        //      emit would get doubled again on a second pass). CodeQL
        //      flagged the original 2-char-only escape as incomplete.
        //
        //   2. PostgREST `or()` parser escape (audit A4) — the parser
        //      uses `,`, `(`, `)` as structural separators. A search
        //      term containing them (e.g. `foo),id.eq.<uuid>`) would
        //      inject extra filter clauses. URL-encode them after the
        //      ILIKE escape: PostgREST decodes them back to literals,
        //      but the `or()` tokeniser doesn't.
        const ilikeEscaped = ilikePatternEscape(query.trim());
        const term = `%${postgrestOrEscape(ilikeEscaped)}%`;
        q = q.or(`subject.ilike.${term},body.ilike.${term},submitter_email.ilike.${term}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as AdminSupportTicketRow[];

      // Client-side sort for non-recency keys — PostgREST cannot express
      // CASE-based ordering, so we fetch newest-first and re-sort in JS.
      if (sortKey === "status") {
        rows = [...rows].sort(
          (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
        );
      } else if (sortKey === "category") {
        rows = [...rows].sort((a, b) => {
          const la = CATEGORY_LABEL[a.category] ?? a.category;
          const lb = CATEGORY_LABEL[b.category] ?? b.category;
          return la.localeCompare(lb, "sk");
        });
      }

      return rows;
    },
  });
}

export function useAdminSupportTicketAttachmentCounts(ticketIds: string[]) {
  return useQuery({
    queryKey: ["admin", "support_tickets", "attachment_counts", ...ticketIds],
    queryFn: async (): Promise<Record<string, number>> => {
      if (ticketIds.length === 0) return {};
      const { data, error } = await supabase
        .from("support_ticket_attachments")
        .select("ticket_id")
        .in("ticket_id", ticketIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of (data ?? []) as { ticket_id: string }[]) {
        counts[r.ticket_id] = (counts[r.ticket_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: ticketIds.length > 0,
  });
}

export function useAdminSupportTicket(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "support_ticket", ticketId],
    queryFn: async (): Promise<AdminSupportTicketDetailRow | null> => {
      // E48-v3 PR-ASSIGN-DETAIL — read from the security_invoker view so
      // the row carries `assignees: SupportTicketAssignee[]` populated by
      // the junction table. `assigned_to` no longer exists; multi-assign
      // replaces it. The view is created by the matching SQL migration —
      // until that ships to prod, this query fails and the detail page
      // surfaces the "not found" branch (acceptable for Wave 2 cutover).
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("support_tickets_with_assignees" as any)
        .select(
          "id, created_at, updated_at, status, category, source, subject, body, submitter_user_id, submitter_email, submitter_name, archived_at, deleted_at, assignees",
        )
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as AdminSupportTicketDetailRow;
      return { ...row, assignees: row.assignees ?? [] };
    },
    enabled: !!ticketId,
  });
}

export function useAdminSupportTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "support_ticket_messages", ticketId],
    queryFn: async (): Promise<AdminSupportTicketMessage[]> => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("id, ticket_id, created_at, author_kind, author_user_id, author_name, body")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminSupportTicketMessage[];
    },
    enabled: !!ticketId,
  });
}

export function useAdminSupportTicketAttachments(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "support_ticket_attachments", ticketId],
    queryFn: async (): Promise<AdminSupportTicketAttachment[]> => {
      const { data, error } = await supabase
        .from("support_ticket_attachments")
        .select(
          "id, ticket_id, message_id, filename, mime_type, size_bytes, scan_status, created_at",
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminSupportTicketAttachment[];
    },
    enabled: !!ticketId,
  });
}

export function useTransitionTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      newStatus,
      note,
    }: {
      ticketId: string;
      newStatus: string;
      note?: string;
    }) => {
      const { data, error } = await supabase.rpc("transition_ticket_status", {
        p_ticket_id: ticketId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p_new_status: newStatus as any,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    },
  });
}

// ---------------------------------------------------------------------------
// New hooks (PR-D — admin queue overhaul)
// ---------------------------------------------------------------------------

export function useTicketCounts() {
  return useQuery({
    queryKey: ["admin", "support_tickets", "counts"],
    queryFn: async () => {
      const statuses = ["new", "in_progress", "waiting_user", "resolved", "reopened"] as const;
      const counts = await Promise.all(
        statuses.map(async (s) => {
          const { count } = await supabase
            .from("support_tickets")
            .select("id", { count: "exact", head: true })
            .eq("status", s)
            .is("deleted_at", null)
            .is("archived_at", null);
          return [s, count ?? 0] as const;
        }),
      );
      const totalActive = counts.reduce((sum, [, c]) => sum + c, 0);
      return {
        new: counts.find(([s]) => s === "new")?.[1] ?? 0,
        in_progress: counts.find(([s]) => s === "in_progress")?.[1] ?? 0,
        waiting_user: counts.find(([s]) => s === "waiting_user")?.[1] ?? 0,
        resolved: counts.find(([s]) => s === "resolved")?.[1] ?? 0,
        reopened: counts.find(([s]) => s === "reopened")?.[1] ?? 0,
        totalActive,
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useTicketsNeedingAttentionCount() {
  return useQuery({
    queryKey: ["admin", "support_tickets", "needing-attention-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "reopened"])
        .is("deleted_at", null)
        .is("archived_at", null);
      if (error) {
        console.warn("useTicketsNeedingAttentionCount failed", error);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useAssignToMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to: user.id, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
      return { ticketId, assignedTo: user.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    },
  });
}

export function useBulkResolve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      if (ticketIds.length === 0) return { ok: 0, failed: 0 };
      const results = await Promise.allSettled(
        ticketIds.map((id) =>
          supabase.rpc("transition_ticket_status", {
            p_ticket_id: id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            p_new_status: "resolved" as any,
          }),
        ),
      );
      const ok = results.filter(
        (r) => r.status === "fulfilled" && !(r.value as { error?: unknown }).error,
      ).length;
      const failed = results.length - ok;
      return { ok, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    },
  });
}

// E48-v3 PR-ASSIGN-DETAIL — multi-assignment mutations. Both wrap the
// admin+AAL2-gated RPCs introduced by the matching SQL migration.
// `assign_admin_to_ticket` is idempotent on (ticket_id, user_id) via
// ON CONFLICT, and `unassign_admin_from_ticket` returns `removed: false`
// when the row didn't exist — UI surfaces neither as errors.

export function useAssignAdminToTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { data, error } = await supabase.rpc(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "assign_admin_to_ticket" as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { p_ticket_id: ticketId, p_user_id: userId } as any,
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support_ticket"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit_log"] });
    },
  });
}

export function useUnassignAdminFromTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { data, error } = await supabase.rpc(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "unassign_admin_from_ticket" as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { p_ticket_id: ticketId, p_user_id: userId } as any,
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support_ticket"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit_log"] });
    },
  });
}

export function useBulkArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      if (ticketIds.length === 0) return { ok: 0, failed: 0 };
      const results = await Promise.allSettled(
        ticketIds.map((id) =>
          supabase.rpc("transition_ticket_status", {
            p_ticket_id: id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            p_new_status: "archived" as any,
          }),
        ),
      );
      const ok = results.filter(
        (r) => r.status === "fulfilled" && !(r.value as { error?: unknown }).error,
      ).length;
      const failed = results.length - ok;
      return { ok, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    },
  });
}
