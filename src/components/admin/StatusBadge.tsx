import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tFor } from "@/i18n/quiz";

const classNames: Record<string, string> = {
  // questions
  published: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  flagged: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground border-border",
  draft: "bg-warning/10 text-warning border-warning/20",
  // users
  active: "bg-success/10 text-success border-success/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  // reports
  open: "bg-destructive/10 text-destructive border-destructive/20",
  reviewing: "bg-warning/10 text-warning border-warning/20",
  resolved: "bg-success/10 text-success border-success/20",
  dismissed: "bg-muted text-muted-foreground border-border",
  // roles
  admin: "bg-primary/10 text-primary border-primary/20",
  moderator: "bg-accent text-accent-foreground border-accent",
  user: "bg-muted text-muted-foreground border-border",
};

const KNOWN_STATUSES = new Set(Object.keys(classNames));

export function StatusBadge({ status }: { status: string }) {
  const t = tFor("admin_status");
  const className = classNames[status] ?? "bg-muted text-muted-foreground border-border";
  // Fall back to the raw status string for unknown values — same behavior
  // as the previous implementation.
  const label = KNOWN_STATUSES.has(status) ? t(status) : status;
  return (
    <Badge
      variant="outline"
      data-testid="admin-status-badge"
      data-status={status}
      className={cn("font-medium", className)}
    >
      {label}
    </Badge>
  );
}
