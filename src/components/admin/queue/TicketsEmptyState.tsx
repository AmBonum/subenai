import { Inbox, FilterX, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

// E48-v2 PR-D — three empty-state variants for the admin tickets queue.
// `variant` is picked by the caller from the current filter shape:
//   - "queue"  → no rows at all, no filters set     (good news: empty inbox)
//   - "filter" → filters applied, nothing matches    (offer "clear filters")
//   - "search" → search query active, nothing matches (offer "clear search")
//
// The component intentionally has no internal state — the caller owns
// the reset handlers so URL/state stays consistent.

export type TicketsEmptyVariant = "queue" | "filter" | "search";

interface Props {
  variant: TicketsEmptyVariant;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  searchTerm?: string;
}

const COPY: Record<
  TicketsEmptyVariant,
  { Icon: typeof Inbox; title: string; description: string }
> = {
  queue: {
    Icon: Inbox,
    title: "Žiadne aktívne žiadosti",
    description: "Skvelé — fronta podpory je momentálne prázdna.",
  },
  filter: {
    Icon: FilterX,
    title: "Žiadne žiadosti pre tieto filtre",
    description: "Skúste odstrániť niektoré filtre, alebo zmeňte rozsah dátumov.",
  },
  search: {
    Icon: SearchX,
    title: "Hľadanie nič nenašlo",
    description: "Skúste skrátiť výraz alebo vyhľadajte podľa e-mailu odosielateľa.",
  },
};

export function TicketsEmptyState({ variant, onClearFilters, onClearSearch, searchTerm }: Props) {
  const { Icon, title, description } = COPY[variant];
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card/40 px-6 py-12 text-center"
      data-testid="admin-tickets-empty-state"
      data-variant={variant}
    >
      <Icon className="size-10 text-muted-foreground/60" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {variant === "search" && searchTerm
            ? `Pre dopyt „${searchTerm}“. ${description}`
            : description}
        </p>
      </div>
      {variant === "filter" && onClearFilters ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          data-testid="admin-tickets-empty-clear-filters"
        >
          Vyčistiť filtre
        </Button>
      ) : null}
      {variant === "search" && onClearSearch ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          data-testid="admin-tickets-empty-clear-search"
        >
          Vyčistiť hľadanie
        </Button>
      ) : null}
    </div>
  );
}
