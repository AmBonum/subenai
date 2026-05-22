import { forwardRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminSupportTicketRow } from "@/lib/admin/queries-tickets";
import { relativeTime } from "@/lib/admin/format-time";

import { TicketActionMenu } from "./TicketActionMenu";

// E48-v2 PR-D — main rich tickets table. Headline UX change vs. the
// previous queue: whole-row clickability via `role="button"` + Enter,
// chevron affordance, sticky checkbox column for bulk operations, and a
// per-row "..." action menu. The component owns no state — selection
// + nav are handed via props so the parent (queue orchestrator) keeps
// URL params + selection in sync.

const STATUS_LABELS: Record<string, string> = {
  new: "Nové",
  in_progress: "Riešim",
  waiting_user: "Čaká",
  resolved: "Vyriešené",
  reopened: "Znovu otv.",
  archived: "Archív",
};

const CATEGORY_LABEL: Record<string, string> = {
  bug: "Chyba",
  question: "Otázka",
  feature_request: "Návrh",
  abuse_report: "Nevhodný obsah",
  billing: "Platby",
  gdpr: "GDPR",
  other: "Iné",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700",
  in_progress:
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
  waiting_user:
    "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700",
  resolved:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
  reopened:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700",
  archived:
    "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
};

interface Props {
  rows: AdminSupportTicketRow[];
  attachmentCounts: Record<string, number>;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  isLoading: boolean;
  focusedRowIndex: number | null;
}

export const TicketsTable = forwardRef<HTMLTableSectionElement, Props>(function TicketsTable(
  { rows, attachmentCounts, selectedIds, onToggleRow, onToggleAll, isLoading, focusedRowIndex },
  bodyRef,
) {
  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selectedIds.has(r.id));

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table
        className="min-w-full divide-y divide-border text-sm"
        data-testid="admin-tickets-table"
      >
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2">
              <Checkbox
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={onToggleAll}
                aria-label="Vybrať všetky"
                data-testid="admin-tickets-select-all"
              />
            </th>
            <th className="px-3 py-2 font-semibold">Stav</th>
            <th className="px-3 py-2 font-semibold">Kategória</th>
            <th className="px-3 py-2 font-semibold">Téma</th>
            <th className="px-3 py-2 font-semibold">Odosielateľ</th>
            <th className="px-3 py-2 font-semibold">Vytvorené</th>
            <th className="px-3 py-2 font-semibold">Prílohy</th>
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
        <Badge variant="outline" className={STATUS_BADGE_CLASS[ticket.status] ?? ""}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </Badge>
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
