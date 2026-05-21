import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";

import {
  useAdminSupportTickets,
  useAdminSupportTicketAttachmentCounts,
  type AdminSupportTicketRow,
} from "@/lib/admin/queries";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// E48.6 — Admin tickets index. List + filter chips + search + per-row
// link to the detail page (E48.7). Pure presentational on top of the
// useAdminSupportTickets query hook.

const STATUS_FILTERS = [
  { value: "new", label: "Nové" },
  { value: "in_progress", label: "Riešim" },
  { value: "waiting_user", label: "Čaká na používateľa" },
  { value: "resolved", label: "Vyriešené" },
  { value: "reopened", label: "Znovu otvorené" },
  { value: "archived", label: "Archivované" },
] as const;

const CATEGORY_LABEL_SK: Record<string, string> = {
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
  reopened: "bg-orange-100 text-orange-900 border-orange-300",
  archived: "bg-slate-100 text-slate-700 border-slate-300",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "pred chvíľou";
  if (diffSec < 3600) return `pred ${Math.round(diffSec / 60)} min`;
  if (diffSec < 86400) return `pred ${Math.round(diffSec / 3600)} h`;
  return `pred ${Math.round(diffSec / 86400)} d`;
}

interface StatusFilterChipProps {
  value: (typeof STATUS_FILTERS)[number]["value"];
  label: string;
  active: boolean;
  onToggle: () => void;
}

function StatusFilterChip({ value, label, active, onToggle }: StatusFilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      data-testid={`admin-tickets-filter-status-${value}`}
      className={
        active
          ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          : "rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary/60"
      }
    >
      {label}
    </button>
  );
}

const DEFAULT_STATUSES = ["new", "in_progress", "waiting_user"] as const;

export function SupportTicketsQueue() {
  const [statuses, setStatuses] = useState<string[]>([...DEFAULT_STATUSES]);
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const ticketsQ = useAdminSupportTickets({ statuses, query, includeArchived });
  const tickets = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
  const ticketIds = useMemo(() => tickets.map((t) => t.id), [tickets]);
  const attachmentCountsQ = useAdminSupportTicketAttachmentCounts(ticketIds);
  const attachmentCounts = attachmentCountsQ.data ?? {};

  function toggleStatus(value: string) {
    setStatuses((curr) =>
      curr.includes(value) ? curr.filter((s) => s !== value) : [...curr, value],
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-tickets-queue">
      <div className="flex flex-wrap items-center gap-2" data-testid="admin-tickets-filters">
        {STATUS_FILTERS.map((f) => (
          <StatusFilterChip
            key={f.value}
            value={f.value}
            label={f.label}
            active={statuses.includes(f.value)}
            onToggle={() => toggleStatus(f.value)}
          />
        ))}
        <label
          className="ml-2 flex items-center gap-2 text-xs text-muted-foreground"
          data-testid="admin-tickets-filter-archived-label"
        >
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            data-testid="admin-tickets-filter-archived-toggle"
          />
          Zobraziť archivované
        </label>
      </div>

      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Vyhľadávanie v žiadostiach"
          placeholder="Hľadať v predmete, správe, e-maile…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          data-testid="admin-tickets-search-input"
        />
      </div>

      {ticketsQ.isLoading ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="admin-tickets-loading"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Načítavam žiadosti…
        </div>
      ) : ticketsQ.isError ? (
        <div className="text-sm text-destructive" data-testid="admin-tickets-error">
          Nepodarilo sa načítať žiadosti. Skúste obnoviť stránku.
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-sm text-muted-foreground" data-testid="admin-tickets-empty-state">
          Žiadne žiadosti tohto typu.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table
            className="min-w-full divide-y divide-border text-sm"
            data-testid="admin-tickets-table"
          >
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Stav</th>
                <th className="px-3 py-2 font-semibold">Kategória</th>
                <th className="px-3 py-2 font-semibold">Téma</th>
                <th className="px-3 py-2 font-semibold">Odosielateľ</th>
                <th className="px-3 py-2 font-semibold">Vytvorené</th>
                <th className="px-3 py-2 font-semibold">Prílohy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} attachmentCount={attachmentCounts[t.id] ?? 0} />
              ))}
            </tbody>
          </table>
          <p
            className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
            data-testid="admin-tickets-count"
          >
            {tickets.length} žiadost{tickets.length === 1 ? "" : tickets.length < 5 ? "i" : "í"}
          </p>
        </div>
      )}
    </div>
  );
}

interface TicketRowProps {
  ticket: AdminSupportTicketRow;
  attachmentCount: number;
}

function TicketRow({ ticket, attachmentCount }: TicketRowProps) {
  const categoryLabel = CATEGORY_LABEL_SK[ticket.category] ?? ticket.category;
  const statusClass = STATUS_BADGE_CLASS[ticket.status] ?? "";

  return (
    <tr className="hover:bg-muted/40" data-testid={`admin-tickets-row-${ticket.id}`}>
      <td className="px-3 py-2">
        <Badge variant="outline" className={statusClass}>
          {STATUS_FILTERS.find((s) => s.value === ticket.status)?.label ?? ticket.status}
        </Badge>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{categoryLabel}</td>
      <td className="px-3 py-2 max-w-md">
        <Link
          to="/admin/tickets/$ticketId"
          params={{ ticketId: ticket.id }}
          className="font-medium text-foreground hover:underline"
          data-testid={`admin-tickets-row-link-${ticket.id}`}
          title={ticket.subject}
        >
          {ticket.subject.length > 80 ? `${ticket.subject.slice(0, 80)}…` : ticket.subject}
        </Link>
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
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {attachmentCount} ✓
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
