import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { AcademyEntryPage } from "@/components/academy/AcademyEntryPage";
import { useAcademyEntry } from "@/lib/academy/queries";

// E55.3 — lazy component for /academy/$slug. The TanStack Query cache makes
// the re-fetch a no-op when the loader already primed it.
export const Route = createLazyFileRoute("/academy/$slug")({
  component: AcademyEntryRoute,
});

function AcademyEntryRoute() {
  const { slug } = useParams({ from: "/academy/$slug" });
  const { data, isLoading } = useAcademyEntry(slug);

  if (isLoading) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-14 text-muted-foreground"
        data-testid="academy-entry-loading"
      >
        Načítavam…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14" data-testid="academy-entry-notfound">
        <p className="text-foreground">Tento obsah neexistuje.</p>
        <Link to="/academy" className="mt-3 inline-flex text-primary hover:opacity-80">
          Späť do akadémie
        </Link>
      </div>
    );
  }
  return <AcademyEntryPage entry={data} />;
}
