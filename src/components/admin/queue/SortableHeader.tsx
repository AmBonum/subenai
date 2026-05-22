import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { SortColumn, TicketSortState } from "@/lib/admin/queries-tickets";

// E48-v3 PR-QUEUE-EXTEND — sortable column header. Renders a <button>
// inside the existing <th> and runs a 3-cycle (asc → desc → unsorted)
// on each click. Only one column is ever in the active state at a time;
// the parent table owns the single `currentSort` and pushes it on each
// click so the URL stays the source of truth.

export interface SortableHeaderProps {
  column: SortColumn;
  label: ReactNode;
  currentSort: TicketSortState | null;
  onSortChange: (next: TicketSortState | null) => void;
  /** Optional right-aligned column (e.g. numeric metrics). */
  align?: "left" | "right";
  className?: string;
}

export function SortableHeader({
  column,
  label,
  currentSort,
  onSortChange,
  align = "left",
  className,
}: SortableHeaderProps) {
  const isActive = currentSort?.column === column;
  const direction = isActive ? currentSort.direction : null;

  function cycle() {
    if (!isActive) {
      onSortChange({ column, direction: "asc" });
      return;
    }
    if (direction === "asc") {
      onSortChange({ column, direction: "desc" });
      return;
    }
    onSortChange(null);
  }

  const ariaSort: "ascending" | "descending" | "none" = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th scope="col" aria-sort={ariaSort} className={cn("px-3 py-2 font-semibold", className)}>
      <button
        type="button"
        data-testid={`admin-tickets-sort-${column}`}
        data-active={isActive ? "true" : "false"}
        onClick={cycle}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors",
          "hover:text-foreground focus-visible:outline-none focus-visible:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse",
        )}
        aria-label={`Zoradiť: ${typeof label === "string" ? label : column}`}
      >
        <span>{label}</span>
        <SortIcon column={column} direction={direction} isActive={isActive} />
      </button>
    </th>
  );
}

function SortIcon({
  column,
  direction,
  isActive,
}: {
  column: SortColumn;
  direction: "asc" | "desc" | null;
  isActive: boolean;
}) {
  const testId = `admin-tickets-sort-indicator-${column}`;
  if (!isActive || direction === null) {
    return (
      <ChevronsUpDown
        className="size-3.5 opacity-40"
        aria-hidden="true"
        data-testid={testId}
        data-direction="none"
      />
    );
  }
  if (direction === "asc") {
    return (
      <ChevronUp
        className="size-3.5"
        aria-hidden="true"
        data-testid={testId}
        data-direction="asc"
      />
    );
  }
  return (
    <ChevronDown
      className="size-3.5"
      aria-hidden="true"
      data-testid={testId}
      data-direction="desc"
    />
  );
}
