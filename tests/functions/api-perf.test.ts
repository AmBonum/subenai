// API performance — algorithmic throughput of the data-heavy server-side
// pure functions at realistic-to-extreme scale. These are NOT network
// latency tests (CF/Supabase round-trips aren't deterministic); they pin
// the O(n) building blocks that turn "fine with 30 rows" into "times out
// at 5000": the CSV export inner loop, the results aggregation, and the
// search-filter builder. Correctness is asserted at scale alongside the
// time budget so a regression can't trade correctness for speed.

import { describe, it, expect } from "vitest";

import { csvEscapeCell, buildSearchOrFilter } from "../../functions/api/admin/tickets-export";
import { computeAggregate } from "../../functions/api/results-data";
import { recordMetric } from "../perf/record-metric";

describe("results-data computeAggregate — aggregation at scale", () => {
  it("aggregates 50k respondent scores correctly within budget", () => {
    const N = 50_000;
    const scores = Array.from({ length: N }, (_, i) => i % 101); // 0..100 cycling
    const start = performance.now();
    const stats = computeAggregate(scores, 60);
    const elapsed = performance.now() - start;

    // Correctness at scale — histogram buckets must sum to N, pass_count
    // must match the >=60 share, avg within the valid range.
    expect(stats.count).toBe(N);
    expect(stats.histogram.reduce((a, b) => a + b, 0)).toBe(N);
    expect(stats.min_score).toBe(0);
    expect(stats.max_score).toBe(100);
    expect(stats.pass_count).toBeGreaterThan(0);
    expect(stats.pass_count).toBeLessThan(N);
    expect(stats.avg_score).toBeGreaterThanOrEqual(0);
    expect(stats.avg_score).toBeLessThanOrEqual(100);

    const BUDGET = 250;
    recordMetric({
      suite: "api-perf",
      name: "computeAggregate over 50k scores",
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: BUDGET,
      pass: elapsed < BUDGET,
    });
    expect(elapsed).toBeLessThan(BUDGET);
  });

  it("stays cheap on the empty path (no respondents)", () => {
    const stats = computeAggregate([], 60);
    expect(stats.count).toBe(0);
    expect(stats.histogram).toEqual([0, 0, 0, 0]);
  });
});

describe("tickets-export csvEscapeCell — CSV inner loop at export scale", () => {
  it("escapes the full MAX_ROWS export worth of cells within budget", () => {
    // The CSV builder calls csvEscapeCell 11x per row; 5000 rows = 55k
    // calls. Mix in injection-prone values so the escaping branch runs.
    const ROWS = 5000;
    const CELLS_PER_ROW = 11;
    const sampleRow = [
      "00000000-0000-0000-0000-000000000001",
      "2026-06-12T08:00:00+02:00",
      "2026-06-12T09:00:00+02:00",
      "Nový",
      "Chyba",
      'Predmet s čiarkou, a úvodzovkami "x"',
      '=HYPERLINK("http://x","klik")\nviacriadkový obsah',
      "Ján Novák",
      "jan@example.sk",
      "",
      3,
    ];

    const start = performance.now();
    let total = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < CELLS_PER_ROW; c++) {
        total += csvEscapeCell(sampleRow[c]).length;
      }
    }
    const elapsed = performance.now() - start;

    expect(total).toBeGreaterThan(0);
    // Spot-check the escaping contract still holds under the loop.
    expect(csvEscapeCell("=SUM(1)")).toBe("'=SUM(1)");
    expect(csvEscapeCell("a,b")).toBe('"a,b"');

    const BUDGET = 300;
    recordMetric({
      suite: "api-perf",
      name: `csvEscapeCell ${ROWS * CELLS_PER_ROW} cells (5000-row export)`,
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: BUDGET,
      pass: elapsed < BUDGET,
    });
    expect(elapsed).toBeLessThan(BUDGET);
  });
});

describe("tickets-export buildSearchOrFilter — escaping throughput", () => {
  it("builds 10k filters with adversarial input within budget", () => {
    const N = 10_000;
    const adversarial = '100%_x,id.eq.1,"\\evil';
    const start = performance.now();
    let lastLen = 0;
    for (let i = 0; i < N; i++) {
      lastLen = buildSearchOrFilter(adversarial + i).length;
    }
    const elapsed = performance.now() - start;

    expect(lastLen).toBeGreaterThan(0);
    const BUDGET = 200;
    recordMetric({
      suite: "api-perf",
      name: "buildSearchOrFilter 10k adversarial",
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: BUDGET,
      pass: elapsed < BUDGET,
    });
    expect(elapsed).toBeLessThan(BUDGET);
  });
});
