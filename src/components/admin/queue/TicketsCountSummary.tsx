import { useTicketCounts } from "@/lib/admin/queries-tickets";

// E48-v2 PR-D — live header subtitle showing the most useful triage
// counts: new + waiting_user. The query refreshes every 30s (config
// lives in the hook itself); the component is purely a render shell.

export function TicketsCountSummary() {
  const countsQ = useTicketCounts();

  if (countsQ.isLoading || !countsQ.data) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="admin-tickets-header-count"
        data-state="loading"
      >
        Načítavam počty…
      </p>
    );
  }

  const { new: nNew, waiting_user: nWaiting, in_progress: nProgress } = countsQ.data;

  const parts: string[] = [];
  if (nNew > 0) parts.push(`${nNew} ${pluralFor(nNew, "nová", "nové", "nových")}`);
  if (nProgress > 0) parts.push(`${nProgress} v riešení`);
  if (nWaiting > 0) parts.push(`${nWaiting} čaká na používateľa`);

  return (
    <p
      className="text-sm text-muted-foreground"
      data-testid="admin-tickets-header-count"
      data-state="ready"
    >
      {parts.length === 0 ? "Žiadne aktívne žiadosti." : parts.join(" · ")}
    </p>
  );
}

// Slovak count-plural for the feminine noun "žiadosť".
function pluralFor(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
