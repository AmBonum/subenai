/**
 * E38 Phase C — pure data-shaping helpers for the results dashboard
 * charts. Kept out of the React tree so they're trivially unit-testable
 * and so the same shape can later feed a PDF export (Phase E) or a
 * server-side aggregation without rewriting the logic.
 */
import type { AggregateStats, RespondentRow } from "./types";

export interface ScoreBand {
  /** "0–24", "25–49", "50–74", "75–100" — verbatim into the bar label. */
  label: string;
  /** How many respondents fell in this band. */
  count: number;
}

/** Four score-bands derived from `stats.histogram`. Labels match the
 *  existing `AggregateStats` distribution list so the two views agree. */
export function buildScoreDistribution(stats: AggregateStats): ScoreBand[] {
  const labels = ["0–24", "25–49", "50–74", "75–100"];
  return labels.map((label, i) => ({ label, count: stats.histogram[i] }));
}

export interface PassFailSlice {
  /** i18n-resolved short label. */
  key: "pass" | "fail";
  count: number;
}

/** Two-slice donut data. `pass_count` from the aggregate is authoritative;
 *  we derive `fail` so the two always sum to `count`. */
export function buildPassFailData(stats: AggregateStats): PassFailSlice[] {
  return [
    { key: "pass", count: stats.pass_count },
    { key: "fail", count: stats.count - stats.pass_count },
  ];
}

/** Fixed-width minute buckets chosen for the typical edu-test span
 *  (15 questions ≈ 3–8 minutes). Each respondent gets bucketed once;
 *  the boundary is inclusive on the upper end of each bucket except
 *  the last which is `>=` to catch the long tail.
 *
 *  Buckets (seconds):
 *    [0, 120)   → "< 2 min"
 *    [120, 240) → "2–4 min"
 *    [240, 360) → "4–6 min"
 *    [360, ∞)   → "6+ min"
 */
export interface TimeBucket {
  label: string;
  count: number;
  /** Inclusive lower bound in seconds — used for stable keying in tests. */
  fromSec: number;
}

const TIME_BUCKETS_TEMPLATE: ReadonlyArray<Omit<TimeBucket, "count">> = [
  { label: "< 2 min", fromSec: 0 },
  { label: "2–4 min", fromSec: 120 },
  { label: "4–6 min", fromSec: 240 },
  { label: "6+ min", fromSec: 360 },
];

export function buildTimeBuckets(rows: RespondentRow[]): TimeBucket[] {
  const counts = [0, 0, 0, 0];
  for (const r of rows) {
    const sec = r.total_time_ms / 1000;
    const idx = sec < 120 ? 0 : sec < 240 ? 1 : sec < 360 ? 2 : 3;
    counts[idx] += 1;
  }
  return TIME_BUCKETS_TEMPLATE.map((b, i) => ({ ...b, count: counts[i] }));
}
