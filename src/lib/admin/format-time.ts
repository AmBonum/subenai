// E48-v2 PR-D — small Slovak-language formatting helpers extracted from
// SupportTicketsQueue. Kept dependency-free so it can be unit-tested in
// isolation and reused by the upcoming export endpoint (PR-E).

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "pred chvíľou";
  if (diffSec < 3600) return `pred ${Math.round(diffSec / 60)} min`;
  if (diffSec < 86400) return `pred ${Math.round(diffSec / 3600)} h`;
  return `pred ${Math.round(diffSec / 86400)} d`;
}

// Slovak count-plural — 1 žiadosť, 2-4 žiadosti, 5+ žiadostí.
export function ticketCountLabel(count: number): string {
  const n = Math.abs(count);
  if (n === 1) return `${count} žiadosť`;
  if (n >= 2 && n <= 4) return `${count} žiadosti`;
  return `${count} žiadostí`;
}
