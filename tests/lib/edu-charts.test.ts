import { describe, it, expect } from "vitest";
import { buildPassFailData, buildScoreDistribution, buildTimeBuckets } from "@/lib/edu/charts";
import type { AggregateStats, RespondentRow } from "@/lib/edu/types";

const aggregate = (over: Partial<AggregateStats> = {}): AggregateStats => ({
  count: 10,
  avg_score: 72,
  min_score: 30,
  max_score: 100,
  median_score: 75,
  passing_threshold: 70,
  pass_count: 6,
  pass_rate: 60,
  histogram: [1, 2, 3, 4],
  ...over,
});

const row = (over: Partial<RespondentRow> = {}): RespondentRow => ({
  id: "att-x",
  share_id: "ABC23456",
  respondent_name: "Test User",
  respondent_email: "test@skola.sk",
  final_score: 80,
  percentile: 75,
  total_time_ms: 60_000,
  created_at: "2026-05-15T10:00:00.000Z",
  answers: null,
  ...over,
});

describe("edu/charts — buildScoreDistribution", () => {
  it("maps the four histogram buckets onto labelled bands in order", () => {
    const bands = buildScoreDistribution(aggregate({ histogram: [5, 6, 7, 8] }));
    expect(bands).toEqual([
      { label: "0–24", count: 5 },
      { label: "25–49", count: 6 },
      { label: "50–74", count: 7 },
      { label: "75–100", count: 8 },
    ]);
  });

  it("labels mirror the existing AggregateStats distribution rows (sentinel)", () => {
    // Regression sentinel — if AggregateStats and ResultsCharts ever drift
    // apart authors will be reading two slightly different label sets for
    // the same data. Pin the four labels here.
    const bands = buildScoreDistribution(aggregate());
    expect(bands.map((b) => b.label)).toEqual(["0–24", "25–49", "50–74", "75–100"]);
  });
});

describe("edu/charts — buildPassFailData", () => {
  it("derives fail count as count - pass_count so the slices always sum to count", () => {
    const data = buildPassFailData(aggregate({ count: 10, pass_count: 7 }));
    expect(data).toEqual([
      { key: "pass", count: 7 },
      { key: "fail", count: 3 },
    ]);
    expect(data[0].count + data[1].count).toBe(10);
  });

  it("handles the 0-pass edge (every respondent failed)", () => {
    const data = buildPassFailData(aggregate({ count: 5, pass_count: 0 }));
    expect(data).toEqual([
      { key: "pass", count: 0 },
      { key: "fail", count: 5 },
    ]);
  });

  it("handles the all-pass edge (every respondent passed)", () => {
    const data = buildPassFailData(aggregate({ count: 4, pass_count: 4 }));
    expect(data).toEqual([
      { key: "pass", count: 4 },
      { key: "fail", count: 0 },
    ]);
  });
});

describe("edu/charts — buildTimeBuckets", () => {
  it("places every row into exactly one of four fixed-width minute buckets", () => {
    const rows: RespondentRow[] = [
      row({ id: "fast", total_time_ms: 30_000 }), // 30s → bucket 0
      row({ id: "fast2", total_time_ms: 119_000 }), // 1m59s → bucket 0 (boundary)
      row({ id: "mid-lo", total_time_ms: 120_000 }), // 2m exactly → bucket 1
      row({ id: "mid-hi", total_time_ms: 239_999 }), // 3m59.999s → bucket 1
      row({ id: "high", total_time_ms: 300_000 }), // 5m → bucket 2
      row({ id: "slow", total_time_ms: 600_000 }), // 10m → bucket 3
    ];
    const buckets = buildTimeBuckets(rows);
    expect(buckets.map((b) => b.count)).toEqual([2, 2, 1, 1]);
    expect(buckets.map((b) => b.label)).toEqual(["< 2 min", "2–4 min", "4–6 min", "6+ min"]);
  });

  it("returns four zero-count buckets when the row list is empty", () => {
    expect(buildTimeBuckets([]).map((b) => b.count)).toEqual([0, 0, 0, 0]);
  });

  it("exposes a stable `fromSec` lower bound on each bucket (for test keying)", () => {
    expect(buildTimeBuckets([]).map((b) => b.fromSec)).toEqual([0, 120, 240, 360]);
  });

  it("treats the lower bound as INCLUSIVE on each bucket (120s → 2–4 min, not < 2 min)", () => {
    // Regression sentinel — a naive `<=` on the lower bound would put 120s
    // into bucket 0, contradicting the label "< 2 min". The implementation
    // uses `< 120` for bucket 0, ie. 120s is the FLOOR of bucket 1.
    const buckets = buildTimeBuckets([row({ total_time_ms: 120_000 })]);
    expect(buckets[0].count).toBe(0);
    expect(buckets[1].count).toBe(1);
  });
});
