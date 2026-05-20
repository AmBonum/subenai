import { describe, expect, it } from "vitest";
import { buildPdfData, buildPdfFilename, slugifyForFilename } from "@/lib/edu/pdf-data";
import type { RespondentRow } from "@/lib/edu/types";

const FIXED_TS = new Date("2026-05-20T10:00:00.000Z");

const row = (over: Partial<RespondentRow> = {}): RespondentRow => ({
  id: "att-x",
  share_id: "ABC23456",
  respondent_name: "Jana Nováková",
  respondent_email: "jana@skola.sk",
  final_score: 80,
  percentile: 75,
  total_time_ms: 90_000,
  created_at: "2026-05-15T10:00:00.000Z",
  answers: null,
  ...over,
});

const baseStats = {
  count: 4,
  avg_score: 71.25,
  min_score: 50,
  max_score: 92,
  median_score: 75,
  passing_threshold: 70,
  pass_count: 3,
  pass_rate: 75,
  histogram: [0, 1, 1, 2] as [number, number, number, number],
};

describe("edu/pdf-data — buildPdfData", () => {
  it("emits the same privacy disclosure as the CSV (regression sentinel)", () => {
    const data = buildPdfData({
      rows: [],
      stats: { ...baseStats, count: 0, pass_count: 0, histogram: [0, 0, 0, 0] },
      filters: {},
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.privacyLine).toContain("OBSAHUJE OSOBNÉ ÚDAJE");
    expect(data.privacyLine).toContain("meno");
    expect(data.privacyLine).toContain("email");
    expect(data.privacyLine).toContain("subenai.sk/privacy");
    expect(data.headerLine).toContain("2026-05-20T10:00:00.000Z");
  });

  it("formats every row with the same shape as the CSV export", () => {
    const data = buildPdfData({
      rows: [row({ final_score: 71, total_time_ms: 65_000 })],
      stats: baseStats,
      filters: {},
      passingThreshold: 70,
      creatorLabel: "Onboarding Q1",
      generatedAt: FIXED_TS,
    });
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toMatchObject({
      score: "71",
      passed: "áno",
      timeSec: "65",
      date: "2026-05-15",
    });
  });

  it("flips `passed` to 'nie' when final_score < threshold", () => {
    const data = buildPdfData({
      rows: [row({ final_score: 60 })],
      stats: baseStats,
      filters: {},
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.rows[0].passed).toBe("nie");
  });

  it("uses the CALLER-supplied passingThreshold, not a hard-coded value", () => {
    // Same row, two thresholds → different `passed` cells. Belt-and-braces
    // for the same kind of drift Phase D's helper guards against.
    const r = [row({ final_score: 75 })];
    const high = buildPdfData({
      rows: r,
      stats: baseStats,
      filters: {},
      passingThreshold: 80,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    const low = buildPdfData({
      rows: r,
      stats: baseStats,
      filters: {},
      passingThreshold: 60,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(high.rows[0].passed).toBe("nie");
    expect(low.rows[0].passed).toBe("áno");
  });

  it("respects URL filters — narrows the row list AND flags filteredOut", () => {
    const rows = [
      row({ id: "a", final_score: 90 }),
      row({ id: "b", final_score: 50 }),
      row({ id: "c", final_score: 75 }),
    ];
    const data = buildPdfData({
      rows,
      stats: baseStats,
      filters: { pass: "yes" },
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.rows.map((r) => r.id)).toEqual(["a", "c"]);
    expect(data.filteredOut).toBe(true);
    expect(data.totalRowCount).toBe(3);
  });

  it("filteredOut === false when no filter narrows the set", () => {
    const data = buildPdfData({
      rows: [row()],
      stats: baseStats,
      filters: {},
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.filteredOut).toBe(false);
    expect(data.totalRowCount).toBe(1);
    expect(data.rows).toHaveLength(1);
  });

  it("filterSummary is empty string when no filters are active", () => {
    const data = buildPdfData({
      rows: [],
      stats: baseStats,
      filters: {},
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.filterSummary).toBe("");
  });

  it("filterSummary describes pass + score range + date range in Slovak", () => {
    const data = buildPdfData({
      rows: [],
      stats: baseStats,
      filters: {
        pass: "yes",
        scoreMin: 60,
        scoreMax: 90,
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
      },
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.filterSummary).toContain("len vyhoveli");
    expect(data.filterSummary).toContain("skóre 60–90");
    expect(data.filterSummary).toContain("dátum 2026-05-01 – 2026-05-31");
  });

  it("filterSummary uses 'nevyhoveli' when pass='no'", () => {
    const data = buildPdfData({
      rows: [],
      stats: baseStats,
      filters: { pass: "no" },
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.filterSummary).toContain("len nevyhoveli");
  });

  it("aggregate cells pre-format their numbers (% suffix, comma-locale-stable)", () => {
    const data = buildPdfData({
      rows: [],
      stats: baseStats,
      filters: {},
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.aggregate.avg).toBe("71.3 %"); // toFixed(1) with rounding
    expect(data.aggregate.median).toBe("75.0 %");
    expect(data.aggregate.minMax).toBe("50 / 92 %");
    expect(data.aggregate.passed).toBe("3 (75.0 %)");
    expect(data.aggregate.threshold).toBe(70);
  });

  it("histogram bands carry the same four labels as AggregateStats + ResultsCharts", () => {
    const data = buildPdfData({
      rows: [],
      stats: baseStats,
      filters: {},
      passingThreshold: 70,
      creatorLabel: null,
      generatedAt: FIXED_TS,
    });
    expect(data.histogram.map((b) => b.label)).toEqual(["0–24", "25–49", "50–74", "75–100"]);
    expect(data.histogram.map((b) => b.count)).toEqual([0, 1, 1, 2]);
  });
});

describe("edu/pdf-data — slugifyForFilename", () => {
  it("slugifies a normal label to lowercase kebab-case", () => {
    expect(slugifyForFilename("Onboarding Q1 2026")).toBe("onboarding-q1-2026");
  });

  it("falls back to 'edu-test' when the label is null", () => {
    expect(slugifyForFilename(null)).toBe("edu-test");
  });

  it("falls back to 'edu-test' when the label collapses to dashes only", () => {
    // Regression sentinel — earlier implementation returned a bare "-"
    // because three slashes collapsed into a single dash that's truthy,
    // bypassing the empty-string fallback. The trim step fixes it.
    expect(slugifyForFilename("///")).toBe("edu-test");
  });
});

describe("edu/pdf-data — buildPdfFilename", () => {
  it("slugifies the creator label and appends the truncated set id", () => {
    expect(buildPdfFilename("Onboarding Q1 2026", "abcd1234-rest-of-uuid")).toBe(
      "onboarding-q1-2026-abcd1234.pdf",
    );
  });

  it("falls back to 'edu-test' when the label is null", () => {
    expect(buildPdfFilename(null, "abcd1234-rest-of-uuid")).toBe("edu-test-abcd1234.pdf");
  });

  it("falls back to 'edu-test' when the label slugifies to empty", () => {
    expect(buildPdfFilename("///", "abcd1234-rest-of-uuid")).toBe("edu-test-abcd1234.pdf");
  });
});
