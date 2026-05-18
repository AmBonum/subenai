interface LoadingProps {
  testId?: string;
}

export function AdminListLoading({ testId = "admin-list-loading" }: LoadingProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground"
    >
      Načítavam…
    </div>
  );
}

interface ErrorProps {
  error: Error;
  testId?: string;
}

export function AdminListError({ error, testId = "admin-list-error" }: ErrorProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive"
    >
      <p className="font-medium">Nepodarilo sa načítať údaje.</p>
      <p className="mt-1 text-destructive/80">{error.message}</p>
    </div>
  );
}
