import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Last N words of the title rendered with the lime→emerald gradient. Defaults to 1. */
  accentWords?: number;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  testId?: string;
}

export function PageHeader({
  eyebrow,
  title,
  accentWords = 1,
  subtitle,
  icon: Icon,
  actions,
  className,
  testId,
}: PageHeaderProps) {
  const words = title.trim().split(/\s+/);
  const splitAt = Math.max(0, words.length - accentWords);
  const head = words.slice(0, splitAt).join(" ");
  const accent = words.slice(splitAt).join(" ");

  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}
      data-testid={testId ?? "app-shell-page-header"}
    >
      <div className="min-w-0">
        {eyebrow && (
          <span className="eyebrow-badge mb-3" data-testid="app-shell-page-header-eyebrow">
            {eyebrow}
          </span>
        )}
        <h1
          className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          data-testid="app-shell-page-header-title"
        >
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          {head && <span>{head}</span>}
          {head && " "}
          <span className="text-gradient-primary">{accent}</span>
        </h1>
        {subtitle && (
          <p
            className="mt-1 text-sm text-muted-foreground"
            data-testid="app-shell-page-header-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div
          className="flex shrink-0 items-center gap-2"
          data-testid="app-shell-page-header-actions"
        >
          {actions}
        </div>
      )}
    </div>
  );
}
