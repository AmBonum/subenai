import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AssigneeChipProps {
  userId: string;
  email: string;
  displayName: string | null;
  isCurrentUser?: boolean;
  onRemove: () => void;
  disabled?: boolean;
}

function initialsFor(displayName: string | null, email: string): string {
  const source = (displayName ?? "").trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function AssigneeChip({
  userId,
  email,
  displayName,
  isCurrentUser = false,
  onRemove,
  disabled = false,
}: AssigneeChipProps): JSX.Element {
  const label = displayName?.trim() || email;
  const initials = initialsFor(displayName, email);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card pl-1 pr-1.5 py-1 text-xs",
        isCurrentUser
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border text-foreground",
      )}
      data-testid={`admin-ticket-assignee-chip-${userId}`}
      title={`${label} <${email}>`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold uppercase",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {initials}
      </span>
      <span className="max-w-[10rem] truncate font-medium">
        {label}
        {isCurrentUser ? <span className="ml-1 text-muted-foreground">(vy)</span> : null}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className={cn(
          "ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors",
          "hover:bg-destructive/10 hover:text-destructive",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        aria-label={`Odobrať pridelenie: ${label}`}
        data-testid={`admin-ticket-assignee-remove-${userId}`}
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}
