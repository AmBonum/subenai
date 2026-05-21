// E45 Phase 3 — visual marker that a feature requires the PRO plan.
//
// Used inline next to feature labels. Today every PRO-marked feature
// renders the badge because nobody has PRO yet (see lib/billing/pro-features.ts).
// When billing launches and the user upgrades, isProFeatureLocked()
// flips to false → call sites stop rendering this component automatically.

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Render as a compact pill (default) or full label. */
  compact?: boolean;
}

export function ProBadge({ className, compact = true }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-400/60 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-900",
        className,
      )}
      data-testid="pro-badge"
    >
      <Sparkles className="mr-0.5 h-2.5 w-2.5" aria-hidden />
      {compact ? "PRO" : "Plán PRO"}
    </Badge>
  );
}
