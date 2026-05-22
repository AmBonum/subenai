import { forwardRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  ChevronsUpDown,
  Check,
  UserCheck2,
  CheckCircle2,
  Archive,
  Download,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SUPPORT_TICKET_CATEGORIES } from "@/components/support/support-form-config";
import { supabase } from "@/integrations/supabase/client";
import {
  useAssignAdminToTicket,
  useBulkArchive,
  useBulkResolve,
} from "@/lib/admin/queries-tickets";
import { cn } from "@/lib/utils";

function useCurrentUserId() {
  return useQuery({
    queryKey: ["auth", "current-user-id"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

// E48-v2 PR-D — sticky 3-row toolbar:
//   1. status filter chips (sort dropdown removed in E48-v3; sorting
//      is now per-column on each table header)
//   2. category multi-select, assignee, date-range, search
//   3. bulk actions row (only when ≥1 row selected)

const STATUS_FILTERS = [
  { value: "new", label: "Nové" },
  { value: "in_progress", label: "Riešim" },
  { value: "waiting_user", label: "Čaká na používateľa" },
  { value: "resolved", label: "Vyriešené" },
  { value: "reopened", label: "Znovu otvorené" },
  { value: "archived", label: "Archivované" },
] as const;

export interface ToolbarFilterState {
  statuses: string[];
  categories: string[];
  assignedTo: string | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  q: string;
}

interface Props {
  filters: ToolbarFilterState;
  onChange: (next: Partial<ToolbarFilterState>) => void;
  selectedIds: Set<string>;
  visibleIds: string[];
  totalSelectableCount: number;
  onClearSelection: () => void;
  onExportRequest: (scope: "selected" | "filter" | "all") => void;
}

export const TicketsToolbar = forwardRef<HTMLInputElement, Props>(function TicketsToolbar(
  {
    filters,
    onChange,
    selectedIds,
    visibleIds,
    totalSelectableCount,
    onClearSelection,
    onExportRequest,
  },
  searchInputRef,
) {
  const { data: currentUserId } = useCurrentUserId();
  const assign = useAssignAdminToTicket();
  const bulkResolve = useBulkResolve();
  const bulkArchive = useBulkArchive();
  const [confirmKind, setConfirmKind] = useState<"resolve" | "archive" | null>(null);

  const selectedArr = Array.from(selectedIds).filter((id) => visibleIds.includes(id));
  const selectedCount = selectedArr.length;

  function toggleStatus(value: string) {
    const next = filters.statuses.includes(value)
      ? filters.statuses.filter((s) => s !== value)
      : [...filters.statuses, value];
    onChange({ statuses: next });
  }

  function toggleCategory(value: string) {
    const next = filters.categories.includes(value)
      ? filters.categories.filter((s) => s !== value)
      : [...filters.categories, value];
    onChange({ categories: next });
  }

  function handleBulkAssign() {
    if (!currentUserId) return;
    Promise.allSettled(
      selectedArr.map((id) => assign.mutateAsync({ ticketId: id, userId: currentUserId })),
    ).then((results) => {
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (failed > 0) {
        toast.error(`Pridelené: ${ok}, zlyhalo: ${failed}`);
      } else {
        toast.success(`Pridelené vám: ${ok}`);
      }
      onClearSelection();
    });
  }

  function handleBulkResolve() {
    bulkResolve.mutate(selectedArr, {
      onSuccess: ({ ok, failed }) => {
        if (failed > 0) toast.error(`Vyriešené: ${ok}, zlyhalo: ${failed}`);
        else toast.success(`Vyriešené: ${ok}`);
        onClearSelection();
      },
      onError: () => toast.error("Hromadná akcia zlyhala."),
    });
  }

  function handleBulkArchive() {
    bulkArchive.mutate(selectedArr, {
      onSuccess: ({ ok, failed }) => {
        if (failed > 0) toast.error(`Archivované: ${ok}, zlyhalo: ${failed}`);
        else toast.success(`Archivované: ${ok}`);
        onClearSelection();
      },
      onError: () => toast.error("Hromadná akcia zlyhala."),
    });
  }

  return (
    <div
      className="sticky top-0 z-10 -mx-1 space-y-3 rounded-md border border-border bg-card/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      data-testid="admin-tickets-toolbar"
    >
      {/* Row 1 — status chips (sort moved to per-column table headers in E48-v3) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" data-testid="admin-tickets-filters">
          {STATUS_FILTERS.map((f) => {
            const active = filters.statuses.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStatus(f.value)}
                data-testid={`admin-tickets-filter-status-${f.value}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2 — category, assignee, date range, search */}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryFilter
          value={filters.categories}
          onToggle={toggleCategory}
          onClear={() => onChange({ categories: [] })}
        />
        <Select
          value={filters.assignedTo ?? "any"}
          onValueChange={(v) => onChange({ assignedTo: v === "any" ? undefined : v })}
        >
          <SelectTrigger
            className="h-8 w-40 text-xs"
            data-testid="admin-tickets-filter-assignee"
            aria-label="Pridelené"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Pridelené: ktokoľvek</SelectItem>
            <SelectItem value="me">Pridelené mne</SelectItem>
            <SelectItem value="unassigned">Bez priradenia</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
          className="h-8 w-36 text-xs"
          data-testid="admin-tickets-filter-daterange-from"
          aria-label="Dátum od"
        />
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
          className="h-8 w-36 text-xs"
          data-testid="admin-tickets-filter-daterange-to"
          aria-label="Dátum do"
        />
        <div className="relative ml-auto min-w-[14rem] flex-1">
          <Search
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Hľadať v predmete, správe, e-maile…"
            aria-label="Vyhľadávanie v žiadostiach"
            className="h-8 pl-8 text-xs"
            data-testid="admin-tickets-search-input"
          />
        </div>

        {/* Export action — opens a dropdown so the admin can pick scope. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              data-testid="admin-tickets-export-csv"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              data-testid="admin-tickets-export-option-filter"
              onSelect={() => onExportRequest("filter")}
            >
              Aktuálny filter ({totalSelectableCount})
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="admin-tickets-export-option-selected"
              disabled={selectedCount === 0}
              onSelect={() => onExportRequest("selected")}
            >
              Označené ({selectedCount})
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="admin-tickets-export-option-all"
              onSelect={() => onExportRequest("all")}
            >
              Všetky (bez filtra)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 3 — bulk actions (only when ≥1 row selected) */}
      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs"
          data-testid="admin-tickets-bulk-action-bar"
        >
          <Badge variant="secondary" data-testid="admin-tickets-bulk-selection-count">
            {selectedCount} označen{selectedCount === 1 ? "á" : selectedCount < 5 ? "é" : "ých"}
          </Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleBulkAssign}
              disabled={assign.isPending}
              data-testid="admin-tickets-bulk-action-assign"
            >
              <UserCheck2 className="size-3.5" aria-hidden="true" /> Prideliť mne
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setConfirmKind("resolve")}
              disabled={bulkResolve.isPending}
              data-testid="admin-tickets-bulk-action-resolve"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Vyriešiť
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setConfirmKind("archive")}
              disabled={bulkArchive.isPending}
              data-testid="admin-tickets-bulk-action-archive"
            >
              <Archive className="size-3.5" aria-hidden="true" /> Archivovať
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={onClearSelection}
              data-testid="admin-tickets-bulk-action-clear"
            >
              <X className="size-3.5" aria-hidden="true" /> Zrušiť výber
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmKind === "resolve"}
        onOpenChange={(o) => {
          if (!o) setConfirmKind(null);
        }}
        severity="success"
        title={`Označiť ${selectedCount} žiadostí ako vyriešené?`}
        description="Pre každú žiadosť sa zaznamená systémová správa o zmene stavu."
        confirmLabel="Vyriešiť všetky"
        onConfirm={handleBulkResolve}
      />
      <ConfirmDialog
        open={confirmKind === "archive"}
        onOpenChange={(o) => {
          if (!o) setConfirmKind(null);
        }}
        severity="warning"
        title={`Archivovať ${selectedCount} žiadostí?`}
        description="Archivované žiadosti zmiznú z hlavného zoznamu, ale dajú sa kedykoľvek obnoviť."
        confirmLabel="Archivovať všetky"
        onConfirm={handleBulkArchive}
      />
    </div>
  );
});

interface CategoryFilterProps {
  value: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}

function CategoryFilter({ value, onToggle, onClear }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const label =
    value.length === 0
      ? "Kategória: všetky"
      : value.length === 1
        ? `Kategória: ${SUPPORT_TICKET_CATEGORIES.find((c) => c.value === value[0])?.label ?? value[0]}`
        : `Kategória: ${value.length}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          data-testid="admin-tickets-filter-category-trigger"
        >
          {label}
          <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>Žiadne kategórie.</CommandEmpty>
            <CommandGroup>
              {SUPPORT_TICKET_CATEGORIES.map((c) => {
                const selected = value.includes(c.value);
                return (
                  <CommandItem
                    key={c.value}
                    onSelect={() => onToggle(c.value)}
                    data-testid={`admin-tickets-filter-category-${c.value}`}
                    aria-selected={selected}
                  >
                    <Check className={cn("mr-2 size-4", selected ? "opacity-100" : "opacity-0")} />
                    {c.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {value.length > 0 ? (
            <div className="border-t border-border/40 p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onClear}
                data-testid="admin-tickets-filter-category-clear"
              >
                Zrušiť výber
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
