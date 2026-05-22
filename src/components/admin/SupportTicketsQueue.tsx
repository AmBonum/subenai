import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  useAdminSupportTickets,
  useAdminSupportTicketAttachmentCounts,
  type SupportTicketSortKey,
} from "@/lib/admin/queries-tickets";
import { ticketCountLabel } from "@/lib/admin/format-time";
import { supabase } from "@/integrations/supabase/client";

import { TicketsToolbar, type ToolbarFilterState } from "./queue/TicketsToolbar";
import { TicketsTable } from "./queue/TicketsTable";
import { TicketsEmptyState, type TicketsEmptyVariant } from "./queue/TicketsEmptyState";
import { TicketsCountSummary } from "./queue/TicketsCountSummary";
import { KeyboardShortcutsFooter, KeyboardShortcutsHint } from "./queue/KeyboardShortcutsHint";

// E48-v2 PR-D — admin tickets queue orchestrator. Reads/writes the URL
// search params (`?status=…&q=…&sort=…`) so filter state is shareable
// across admins, owns the row-selection set, and composes the three
// presentational sub-components. The query layer (queries-tickets.ts)
// already handles all the filter-shape edge cases.

const DEFAULT_STATUSES = ["new", "in_progress", "waiting_user", "reopened"] as const;
const DEBOUNCE_MS = 300;

export function SupportTicketsQueue() {
  const search = useSearch({ from: "/admin/tickets" });
  const navigate = useNavigate({ from: "/admin/tickets" });

  // The toolbar mirrors URL state and writes through `setFilter`.
  const filters = useMemo<ToolbarFilterState>(
    () => ({
      statuses: search.status ?? [...DEFAULT_STATUSES],
      categories: search.category ?? [],
      assignedTo: search.assignedTo,
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      q: search.q ?? "",
      sort: (search.sort ?? "recency-desc") as SupportTicketSortKey,
    }),
    [search],
  );

  // Search input is debounced (300ms) — typing should NOT thrash the
  // Supabase query. Keep a local state for the input value and sync
  // back to the URL after debounce.
  const [searchDraft, setSearchDraft] = useState(filters.q);
  useEffect(() => {
    // Keep draft in sync if URL changed externally (e.g. shared link).
    setSearchDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (searchDraft === filters.q) return;
    const id = window.setTimeout(() => {
      updateUrl({ q: searchDraft || undefined });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const includeArchived = filters.statuses.includes("archived");

  const ticketsQ = useAdminSupportTickets({
    statuses: filters.statuses,
    categories: filters.categories,
    assignedTo: filters.assignedTo,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    query: filters.q,
    includeArchived,
    sortKey: filters.sort,
  });
  const tickets = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
  const ticketIds = useMemo(() => tickets.map((t) => t.id), [tickets]);
  const attachmentCountsQ = useAdminSupportTicketAttachmentCounts(ticketIds);
  const attachmentCounts = attachmentCountsQ.data ?? {};

  // Selection lives entirely in component state — never persists.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // If filters change (rows might disappear), drop selections that are
  // no longer visible to avoid acting on an invisible row.
  useEffect(() => {
    setSelectedIds((curr) => {
      const visible = new Set(tickets.map((t) => t.id));
      const next = new Set<string>();
      for (const id of curr) if (visible.has(id)) next.add(id);
      return next.size === curr.size ? curr : next;
    });
  }, [tickets]);

  function updateUrl(partial: Record<string, unknown>) {
    void navigate({
      replace: true,
      search: (prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev };
        for (const [k, v] of Object.entries(partial)) {
          if (v === undefined || (Array.isArray(v) && v.length === 0) || v === "") {
            delete next[k];
          } else {
            next[k] = v;
          }
        }
        return next;
      },
    });
  }

  function handleToolbarChange(next: Partial<ToolbarFilterState>) {
    const mapped: Record<string, unknown> = {};
    if (next.statuses !== undefined) mapped.status = next.statuses;
    if (next.categories !== undefined) mapped.category = next.categories;
    if (next.assignedTo !== undefined) mapped.assignedTo = next.assignedTo;
    if (next.dateFrom !== undefined) mapped.dateFrom = next.dateFrom;
    if (next.dateTo !== undefined) mapped.dateTo = next.dateTo;
    if (next.q !== undefined) {
      // The q input is debounced through `searchDraft`; bypass the URL
      // sync here and let the debounce effect handle it.
      setSearchDraft(next.q);
      return;
    }
    if (next.sort !== undefined) mapped.sort = next.sort;
    updateUrl(mapped);
  }

  function toggleRow(id: string) {
    setSelectedIds((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((curr) => {
      const allSelected = tickets.length > 0 && tickets.every((t) => curr.has(t.id));
      if (allSelected) return new Set();
      return new Set(tickets.map((t) => t.id));
    });
  }

  // Toolbar uses this ref to focus the search input on `/`.
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);

  // Global keyboard shortcuts — suppressed when the active element is
  // an input/textarea/contenteditable to keep typing unaffected.
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tgt?.isContentEditable;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/" && !isEditable) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "?" && !isEditable) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (isEditable) return;

      if (e.key === "Escape") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          clearSelection();
        }
        return;
      }
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        if (tickets.length === 0) return;
        setFocusedRow((curr) => {
          const dir = e.key === "j" ? 1 : -1;
          const next = curr === null ? 0 : Math.min(tickets.length - 1, Math.max(0, curr + dir));
          return next;
        });
        return;
      }
      if (e.key === "x") {
        if (focusedRow === null) return;
        const id = tickets[focusedRow]?.id;
        if (id) {
          e.preventDefault();
          toggleRow(id);
        }
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [tickets, focusedRow, selectedIds, clearSelection]);

  // Focus the row element when focusedRow changes (j/k navigation).
  useEffect(() => {
    if (focusedRow === null) return;
    const id = tickets[focusedRow]?.id;
    if (!id) return;
    const el = document.querySelector<HTMLTableRowElement>(
      `[data-testid="admin-tickets-row-${id}"]`,
    );
    el?.focus();
  }, [focusedRow, tickets]);

  async function handleExport(scope: "selected" | "filter" | "all") {
    const body = {
      filters,
      sort: filters.sort,
      scope,
      selectedIds: scope === "selected" ? Array.from(selectedIds) : undefined,
      includeArchived,
    };
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/tickets-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.status === 404) {
        toast.error("Export bude dostupný čoskoro.");
        return;
      }
      if (!res.ok) {
        toast.error("Export zlyhal. Skúste to neskôr.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export bude dostupný čoskoro.");
    }
  }

  const filterIsActive =
    filters.categories.length > 0 ||
    filters.assignedTo !== undefined ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    JSON.stringify([...filters.statuses].sort()) !== JSON.stringify([...DEFAULT_STATUSES].sort());
  const searchIsActive = filters.q.trim().length > 0;
  const emptyVariant: TicketsEmptyVariant = searchIsActive
    ? "search"
    : filterIsActive
      ? "filter"
      : "queue";

  function clearAllFilters() {
    setSearchDraft("");
    void navigate({ replace: true, search: {} });
  }
  function clearSearch() {
    setSearchDraft("");
  }

  return (
    <div className="space-y-4" data-testid="admin-tickets-queue">
      <TicketsCountSummary />

      <TicketsToolbar
        ref={searchInputRef}
        filters={{ ...filters, q: searchDraft }}
        onChange={handleToolbarChange}
        selectedIds={selectedIds}
        visibleIds={ticketIds}
        totalSelectableCount={tickets.length}
        onClearSelection={clearSelection}
        onExportRequest={handleExport}
      />

      {ticketsQ.isError ? (
        <div className="text-sm text-destructive" data-testid="admin-tickets-error">
          Nepodarilo sa načítať žiadosti. Skúste obnoviť stránku.
        </div>
      ) : ticketsQ.isLoading ? (
        <TicketsTable
          rows={[]}
          attachmentCounts={{}}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          isLoading
          focusedRowIndex={null}
        />
      ) : tickets.length === 0 ? (
        <TicketsEmptyState
          variant={emptyVariant}
          onClearFilters={clearAllFilters}
          onClearSearch={clearSearch}
          searchTerm={filters.q}
        />
      ) : (
        <>
          <TicketsTable
            rows={tickets}
            attachmentCounts={attachmentCounts}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            isLoading={false}
            focusedRowIndex={focusedRow}
          />
          <div
            className="flex items-center justify-between text-xs text-muted-foreground"
            data-testid="admin-tickets-count"
          >
            <span>{ticketCountLabel(tickets.length)}</span>
            {ticketsQ.isFetching ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Obnovujem…
              </span>
            ) : null}
          </div>
        </>
      )}

      <KeyboardShortcutsFooter />
      <KeyboardShortcutsHint open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
