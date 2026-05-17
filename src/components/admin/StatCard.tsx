import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive";
  /** data-testid override; falls back to "stat-card-${slug}" if not set. */
  testId?: string;
}

const tones: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "primary",
  testId,
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card
      className="overflow-hidden border-border/60 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elegant)]"
      data-testid={testId}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p
              className="text-sm font-medium text-muted-foreground"
              data-testid={testId ? `${testId}-label` : undefined}
            >
              {label}
            </p>
            <p
              className="text-3xl font-semibold tracking-tight text-foreground"
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {typeof value === "number" ? value.toLocaleString("sk-SK") : value}
            </p>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {typeof delta === "number" && (
          <div
            className="mt-3 flex items-center gap-1 text-xs"
            data-testid={testId ? `${testId}-delta` : undefined}
          >
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta)}%
            </span>
            <span className="text-muted-foreground">za posledných 7 dní</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
