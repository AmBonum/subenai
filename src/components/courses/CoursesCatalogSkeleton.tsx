export function CoursesCatalogSkeleton() {
  return (
    <div
      data-testid="courses-catalog-skeleton"
      className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card/30">
          <div className="h-32 animate-pulse bg-muted/40" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-16 animate-pulse rounded-full bg-muted/40" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted/50" />
            <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
