import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { avatarSwatch, initialsOf } from "@/lib/admin/avatar-palette";
import type { SupportTicketAssignee } from "@/lib/admin/queries-tickets";

// E48-v3 PR-QUEUE-EXTEND — stacked avatars + overflow chip for the queue
// "Pridelení" column. Avatars are 20px, overlap by -8px (visible portion
// = 12px), capped at 3 visible avatars + `+N` chip when more exist. The
// stack is wrapped in a single tooltip listing every full display name
// — individual avatar tooltips would create a wall of conflicting
// triggers on a busy queue.

export interface AssigneesCellProps {
  ticketId: string;
  assignees: Array<Pick<SupportTicketAssignee, "user_id" | "email" | "display_name">>;
}

const MAX_VISIBLE = 3;

export function AssigneesCell({ ticketId, assignees }: AssigneesCellProps) {
  if (!assignees || assignees.length === 0) {
    return (
      <span
        className="text-muted-foreground"
        data-testid={`admin-tickets-row-assigned-${ticketId}`}
        aria-label="Bez priradenia"
      >
        —
      </span>
    );
  }

  // Single assignee — show the avatar plus a truncated name so the
  // queue scans well in the common case (one owner per ticket).
  if (assignees.length === 1) {
    const a = assignees[0];
    const fullName = a.display_name || a.email;
    const visible = fullName.length > 20 ? `${fullName.slice(0, 20)}…` : fullName;
    return (
      <div
        className="flex items-center gap-2"
        data-testid={`admin-tickets-row-assigned-${ticketId}`}
        title={fullName}
      >
        <Avatar userId={a.user_id} displayName={a.display_name} email={a.email} />
        <span className="truncate text-xs text-foreground">{visible}</span>
      </div>
    );
  }

  const visibleAssignees = assignees.slice(0, MAX_VISIBLE);
  const overflowCount = assignees.length - MAX_VISIBLE;
  const tooltipText = `Pridelení: ${assignees.map((a) => a.display_name || a.email).join(", ")}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center"
            data-testid={`admin-tickets-row-assigned-${ticketId}`}
            aria-label={tooltipText}
          >
            <div className="flex items-center -space-x-2">
              {visibleAssignees.map((a) => (
                <Avatar
                  key={a.user_id}
                  userId={a.user_id}
                  displayName={a.display_name}
                  email={a.email}
                  bordered
                />
              ))}
              {overflowCount > 0 ? (
                <OverflowChip ticketId={ticketId} count={overflowCount} />
              ) : null}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AvatarProps {
  userId: string;
  displayName: string | null | undefined;
  email: string;
  bordered?: boolean;
}

function Avatar({ userId, displayName, email, bordered = false }: AvatarProps) {
  const swatch = avatarSwatch(userId);
  const initials = initialsOf(displayName, email);
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-[9px] font-semibold leading-none",
        swatch.bg,
        swatch.fg,
        bordered && "ring-2 ring-card",
      )}
      data-testid={`admin-tickets-row-assigned-avatar-${userId}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function OverflowChip({ ticketId, count }: { ticketId: string; count: number }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold leading-none text-muted-foreground",
        "ring-2 ring-card",
      )}
      data-testid={`admin-tickets-row-assigned-overflow-${ticketId}`}
      aria-label={`+${count} ďalších`}
    >
      +{count}
    </span>
  );
}
