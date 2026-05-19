/**
 * Module-local counters used by every seed factory. Reset is a single
 * exported function so tests don't need to know how many counters
 * exist — they just call `resetSeedCounters()` in `beforeEach`.
 */

const counters: Record<string, number> = {};

export function nextId(domain: string): number {
  counters[domain] = (counters[domain] ?? 0) + 1;
  return counters[domain];
}

export function pad(n: number, width: number = 3): string {
  return String(n).padStart(width, "0");
}

export function resetSeedCounters(): void {
  for (const key of Object.keys(counters)) {
    delete counters[key];
  }
}
