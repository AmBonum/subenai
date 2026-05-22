import { forwardRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Paperclip } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  AdminSupportTicketRow,
  SortColumn,
  TicketSortState,
} from "@/lib/admin/queries-tickets";
import { relativeTime } from "@/lib/admin/format-time";

import { TicketActionMenu } from "./TicketActionMenu";
import { AssigneesCell } from "./AssigneesCell";
import { QueueStatusPopover, type SupportTicketStatus } from "./QueueStatusPopover";
import { SortableHeader } from "./SortableHeader";

// E48-v2 PR-D — main rich tickets table. Headline UX change vs. the
// previous queue: whole-row clickability via `role="button"` + Enter,
// chevron affordance, sticky checkbox column for bulk operations, and a
// per-row "..." action menu. The component owns no state — selection
// + nav + sort are handed via props so the parent (queue orchestrator)
// keeps URL params + selection in sync.
//
// E48-v3 PR-QUEUE-EXTEND — extends the table with:
//   - Assigned column (AssigneesCell) between Téma and Stav
//   - Inline status badge replaced by QueueStatusPopover
//   - All headers (except checkbox + Prílohy + Akcie) are sortable

const CATEGORY_LABEL: Record<string, string> = {
  bug: "Chyba",
  question: "Otázka",
  feature_request: "Návrh",
  abuse_report: "Nevhodný obsah",
  billing: "Platby",
  gdpr: "GDPR",
  other: "Iné",
};

interface Props {
  rows: AdminSupportTicketRow[];
  attachmentCounts: Record<string, number>;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  isLoading: boolean;
  focusedRowIndex: number | null;
  currentSort: TicketSortState | null;
  onSortChange: (next: TicketSortState | null) => void;
}

export const TicketsTable = forwardRef<HTMLTableSectionElement, Props>(function TicketsTable(
  {
    rows,
    attachmentCounts,
    selectedIds,
    onToggleRow,
    onToggleAll,
    isLoading,
    focusedRowIndex,
    currentSort,
    onSortChange,
  },
  bodyRef,
) {
  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selectedIds.has(r.id));

  function header(column: SortColumn, label: string) {
    return (
      <SortableHeader
        column={column}
        label={label}
        currentSort={currentSort}
        onSortChange={onSortChange}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table
        className="min-w-full divide-y divide-border text-sm"
        data-testid="admin-tickets-table"
      >
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2" scope="col">
              <Checkbox
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={onToggleAll}
                aria-label="Vybrať všetky"
                data-testid="admin-tickets-select-all"
              />
            </th>
            {header("status", "Stav")}
            {header("category", "Kategória")}
            {header("subject", "Téma")}
            {header("submitter", "Odosielateľ")}
            {header("assigned", "Pridelení")}
            {header("created_at", "Vytvorené")}
            <th className="px-3 py-2 font-semibold" scope="col">
              Prílohy
            </th>
            <th className="w-8 px-2 py-2" aria-label="Akcie" />
            <th className="w-8 px-2 py-2" aria-label="Otvoriť" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border" ref={bodyRef}>
          {isLoading ? (
            <SkeletonRows />
          ) : (
            rows.map((row, idx) => (
              <TicketRow
                key={row.id}
                ticket={row}
                attachmentCount={attachmentCounts[row.id] ?? 0}
                isSelected={selectedIds.has(row.id)}
                isFocused={focusedRowIndex === idx}
                onToggleRow={onToggleRow}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} data-testid="admin-tickets-loading">
          <td className="px-3 py-3">
            <Skeleton className="size-4" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-5 w-16" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-4 w-64" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="h-4 w-6" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="size-4" />
          </td>
          <td className="px-3 py-3">
            <Skeleton className="size-4" />
          </td>
        </tr>
      ))}
    </>
  );
}

interface TicketRowProps {
  ticket: AdminSupportTicketRow;
  attachmentCount: number;
  isSelected: boolean;
  isFocused: boolean;
  onToggleRow: (id: string) => void;
}

function TicketRow({
  ticket,
  attachmentCount,
  isSelected,
  isFocused,
  onToggleRow,
}: TicketRowProps) {
  const navigate = useNavigate();
  const subject = ticket.subject.length > 90 ? `${ticket.subject.slice(0, 90)}…` : ticket.subject;

  function openDetail() {
    void navigate({ to: "/admin/tickets/$ticketId", params: { ticketId: ticket.id } });
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={`Otvoriť žiadosť: ${ticket.subject}`}
      data-testid={`admin-tickets-row-${ticket.id}`}
      data-selected={isSelected}
      data-focused={isFocused}
      onClick={(e) => {
        if (!e.defaultPrevented) openDetail();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openDetail();
        }
      }}
      className={cn(
        "group cursor-pointer transition-colors",
        "hover:bg-accent/60",
        "focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isSelected && "bg-accent/40",
      )}
    >
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleRow(ticket.id)}
          aria-label={`Označiť žiadosť ${ticket.id.slice(0, 8)}`}
          data-testid={`admin-tickets-row-checkbox-${ticket.id}`}
        />
      </td>
      <td className="px-3 py-2">
        <QueueStatusPopover
          ticketId={ticket.id}
          currentStatus={ticket.status as SupportTicketStatus}
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {CATEGORY_LABEL[ticket.category] ?? ticket.category}
      </td>
      <td className="px-3 py-2 max-w-md font-medium text-foreground" title={ticket.subject}>
        {subject}
      </td>
      <td className="px-3 py-2">
        <div className="text-sm">{ticket.submitter_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{ticket.submitter_email}</div>
      </td>
      <td className="px-3 py-2">
        <AssigneesCell ticketId={ticket.id} assignees={ticket.assignees ?? []} />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground" title={ticket.created_at}>
        {relativeTime(ticket.created_at)}
      </td>
      <td className="px-3 py-2 text-xs">
        {attachmentCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <Paperclip className="size-3" aria-hidden="true" />
            {attachmentCount}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
        <TicketActionMenu ticket={ticket} />
      </td>
      <td className="px-2 py-2 text-right text-muted-foreground">
        <ChevronRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
          data-testid={`admin-tickets-row-open-link-${ticket.id}`}
        />
      </td>
    </tr>
  );
}
