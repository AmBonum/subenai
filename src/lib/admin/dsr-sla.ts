// Pure SLA classification for the admin DSR queue (AH-7.5). GDPR Article 12(3)
// mandates a one-month response window; we surface three states:
//   - "ok":      more than 14 days remaining
//   - "warn":    between 3 and 14 days remaining (inclusive)
//   - "overdue": less than 3 days remaining OR past the 30-day deadline
const DEADLINE_MS = 30 * 86_400_000;
const WARN_MS = 14 * 86_400_000;
const OVERDUE_MS = 3 * 86_400_000;

export type DsrSlaVariant = "ok" | "warn" | "overdue";

export function classifyDsrSla(submittedAt: Date, now: Date): DsrSlaVariant {
  const elapsed = now.getTime() - submittedAt.getTime();
  const remaining = DEADLINE_MS - elapsed;
  if (remaining < OVERDUE_MS) return "overdue";
  if (remaining <= WARN_MS) return "warn";
  return "ok";
}

export function daysRemaining(submittedAt: Date, now: Date): number {
  const elapsed = now.getTime() - submittedAt.getTime();
  const remainingMs = DEADLINE_MS - elapsed;
  // Round toward zero so e.g. 2.5 days remaining shows as "2 days".
  return Math.trunc(remainingMs / 86_400_000);
}
