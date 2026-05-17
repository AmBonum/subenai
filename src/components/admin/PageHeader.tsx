import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  testId?: string;
}

export function PageHeader({ title, description, actions, testId }: PageHeaderProps) {
  const prefix = testId ?? "admin-page-header";
  return (
    <div
      data-testid={`${prefix}-root`}
      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1
          data-testid={`${prefix}-title`}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h1>
        {description && (
          <p data-testid={`${prefix}-description`} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div data-testid={`${prefix}-actions`} className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
