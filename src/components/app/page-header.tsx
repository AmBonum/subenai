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
        {/* `flex items-center` keeps the icon + title aligned on a single
            line, but at <sm titles like "Tvoji respondenti vs. Slovensko"
            push the accent word out of column flow without flex-wrap and
            it visually detaches from the head (E36 A3 finding 2026-05-20).
            `flex-wrap` lets the accent fall to the next line cleanly while
            preserving the icon-aligned look on wider viewports.

            The explicit `{head && " "}` whitespace text node looks redundant
            next to `gap-x-2`, but it carries semantic weight: without it
            adjacent span DOM children concatenate via `textContent` as
            "Knižnicaotázok" (no space), breaking `toContainText("Knižnica otázok")`
            in tests and degrading screen reader pronunciation. The visual
            `gap` and the textual " " each address a different layer (CSS
            box-spacing vs. accessible text composition). */}
        <h1
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          data-testid="app-shell-page-header-title"
        >
          {Icon && <Icon className="h-6 w-6 shrink-0 text-primary" />}
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
