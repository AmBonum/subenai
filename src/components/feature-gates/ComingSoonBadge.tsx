// E45 follow-up — "Coming soon" marker for features that exist in the
// codebase but aren't user-available yet (manual launch flag, never
// auto-unlocks; see src/lib/feature-gates.ts).
//
// Visual sibling to ProBadge — same compact pill shape so the page
// rhythm stays consistent when we mix gated features. Sky-blue instead
// of amber to differentiate at a glance: amber = "pay to unlock",
// sky = "we're working on it".

import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Compact "Pripravujeme" pill (default) or full "Pripravujeme" label. */
  compact?: boolean;
}

export function ComingSoonBadge({ className, compact = true }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-sky-400/60 bg-sky-50 text-[10px] font-semibold uppercase tracking-wide text-sky-900",
        className,
      )}
      data-testid="coming-soon-badge"
    >
      <Clock className="mr-0.5 h-2.5 w-2.5" aria-hidden />
      {compact ? "Pripravujeme" : "Pripravujeme"}
    </Badge>
  );
}
