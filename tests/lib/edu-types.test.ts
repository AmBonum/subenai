import { describe, it, expect } from "vitest";
import { applyRespondentFilters, countActiveFilters, rowsToCsv } from "@/lib/edu/types";
import type { RespondentFilters, RespondentRow } from "@/lib/edu/types";

const sample = (over: Partial<RespondentRow> = {}): RespondentRow => ({
  id: "att-1",
  share_id: "ABC23456",
  respondent_name: "Jana Nováková",
  respondent_email: "jana@skola.sk",
  final_score: 80,
  percentile: 75,
  total_time_ms: 123_456,
  created_at: "2026-05-01T08:00:00.000Z",
  // E34 Phase 1 — `answers` is part of the contract. `null` here because
  // rowsToCsv() doesn't consume it (CSV stays at aggregate level by design).
  answers: null,
  ...over,
});

// E34 Phase 3 (D6) — output begins with TWO `#`-prefixed comment lines
// (timestamp + GDPR caveat) before the column header. Tests therefore
// index the body row at offset 3, not 1. The shape is intentional —
// authors who download the file see the privacy obligation BEFORE the
// data they're about to handle.
const HEADER_ROW_INDEX = 2;
const BODY_ROW_INDEX = 3;
// Frozen timestamp for deterministic assertions across runs.
const FIXED_TS = new Date("2026-05-20T10:00:00.000Z");

describe("edu/types — rowsToCsv", () => {
  it("prepends a GDPR caveat header + timestamp (D6 regression sentinel)", () => {
    const csv = rowsToCsv([sample()], 70, FIXED_TS);
    const lines = csv.split("\r\n");
    // Line 1: file identity + ISO timestamp.
    expect(lines[0]).toMatch(/^# subenai\.sk — výsledky edu testu · vygenerované /);
    expect(lines[0]).toContain("2026-05-20T10:00:00.000Z");
    // Line 2: GDPR caveat that names the personal-data fields + privacy URL.
    expect(lines[1]).toMatch(/^# OBSAHUJE OSOBNÉ ÚDAJE/);
    expect(lines[1]).toContain("meno");
    expect(lines[1]).toContain("email");
    expect(lines[1]).toContain("subenai.sk/privacy");
  });

  it("emits header + body with CRLF line endings (header lives below the 2 comment lines)", () => {
    const csv = rowsToCsv([sample()], 70, FIXED_TS);
    const lines = csv.split("\r\n");
    expect(lines[HEADER_ROW_INDEX]).toBe("Meno,Email,Skóre,Percentil,Vyhovel,Čas (s),Dátum");
    // 2 comment lines + header + 1 body row = 4 total.
    expect(lines).toHaveLength(4);
  });

  it('formats fields correctly: "Skóre" as raw, "Vyhovel" as "áno"/"nie", "Čas" in seconds', () => {
    const csv = rowsToCsv([sample({ total_time_ms: 90_000, final_score: 71 })], 70, FIXED_TS);
    const fields = csv.split("\r\n")[BODY_ROW_INDEX].split(",");
    expect(fields[2]).toBe("71"); // Skóre
    expect(fields[4]).toBe("áno"); // Vyhovel
    expect(fields[5]).toBe("90"); // Čas (s)
  });

  it('flips "Vyhovel" to "nie" when score is below threshold', () => {
    const csv = rowsToCsv([sample({ final_score: 50 })], 70, FIXED_TS);
    const fields = csv.split("\r\n")[BODY_ROW_INDEX].split(",");
    expect(fields[4]).toBe("nie");
  });

  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const row = sample({
      respondent_name: 'Jana, "the Boss" Nováková',
      respondent_email: "line\nbreak@example.sk",
    });
    const csv = rowsToCsv([row], 70, FIXED_TS);
    // The `\n` inside the email field breaks the body across raw lines;
    // assert via the full csv string instead of split-by-line.
    expect(csv).toContain('"Jana, ""the Boss"" Nováková"');
    expect(csv).toContain('"line\nbreak@example.sk"');
  });

  it("returns the 2 caveat lines + header when rows is empty", () => {
    const csv = rowsToCsv([], 70, FIXED_TS);
    const lines = csv.split("\r\n");
    // 2 comments + 1 header = 3 lines, no data row.
    expect(lines).toHaveLength(3);
    expect(lines[HEADER_ROW_INDEX]).toBe("Meno,Email,Skóre,Percentil,Vyhovel,Čas (s),Dátum");
  });

  it("defaults to `new Date()` when generatedAt is omitted (production path)", () => {
    const before = Date.now();
    const csv = rowsToCsv([], 70);
    const after = Date.now();
    const match = csv.match(/vygenerované (\S+)/);
    expect(match).not.toBeNull();
    const stamp = new Date(match![1]).getTime();
    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(after);
  });
});

describe("edu/types — countActiveFilters", () => {
  it("returns 0 for the empty filter object (Clear filters baseline)", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("counts each axis independently — one chip per non-undefined key", () => {
    expect(countActiveFilters({ pass: "yes" })).toBe(1);
    expect(countActiveFilters({ scoreMin: 60 })).toBe(1);
    expect(countActiveFilters({ scoreMax: 90 })).toBe(1);
    expect(countActiveFilters({ dateFrom: "2026-05-01" })).toBe(1);
    expect(countActiveFilters({ dateTo: "2026-05-31" })).toBe(1);
  });

  it("sums every active axis", () => {
    const f: RespondentFilters = {
      pass: "no",
      scoreMin: 0,
      scoreMax: 50,
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    };
    expect(countActiveFilters(f)).toBe(5);
  });

  it("treats numeric 0 / empty-string date as ACTIVE — only `undefined` means inactive", () => {
    // Regression sentinel: a naive truthy check would drop `scoreMin: 0`
    // and let "all rows above 0" silently turn into "no filter". The chip
    // counter has to mirror what applyRespondentFilters() actually enforces.
    expect(countActiveFilters({ scoreMin: 0 })).toBe(1);
    expect(countActiveFilters({ scoreMax: 0 })).toBe(1);
  });
});

describe("edu/types — applyRespondentFilters", () => {
  const row = (over: Partial<RespondentRow>): RespondentRow => ({
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

  it("returns the input unchanged when filters are empty", () => {
    const rows = [row({ id: "a", final_score: 50 }), row({ id: "b", final_score: 90 })];
    expect(applyRespondentFilters(rows, {}, 70)).toEqual(rows);
  });

  it("`pass: yes` keeps only rows with final_score ≥ passingThreshold (inclusive)", () => {
    const rows = [
      row({ id: "below", final_score: 69 }),
      row({ id: "edge", final_score: 70 }), // === threshold → still passes
      row({ id: "above", final_score: 71 }),
    ];
    expect(applyRespondentFilters(rows, { pass: "yes" }, 70).map((r) => r.id)).toEqual([
      "edge",
      "above",
    ]);
  });

  it("`pass: no` keeps only rows with final_score < passingThreshold (strict)", () => {
    const rows = [
      row({ id: "below", final_score: 69 }),
      row({ id: "edge", final_score: 70 }), // threshold counts as passing → excluded
      row({ id: "above", final_score: 71 }),
    ];
    expect(applyRespondentFilters(rows, { pass: "no" }, 70).map((r) => r.id)).toEqual(["below"]);
  });

  it("respects the passingThreshold argument, not a hard-coded 70", () => {
    // E38 D regression — earlier draft used a literal 70; ensure caller-supplied
    // threshold actually drives the comparison.
    const rows = [row({ id: "lo", final_score: 50 }), row({ id: "hi", final_score: 85 })];
    expect(applyRespondentFilters(rows, { pass: "yes" }, 80).map((r) => r.id)).toEqual(["hi"]);
    expect(applyRespondentFilters(rows, { pass: "yes" }, 40).map((r) => r.id)).toEqual([
      "lo",
      "hi",
    ]);
  });

  it("scoreMin / scoreMax are inclusive on both ends", () => {
    const rows = [
      row({ id: "a", final_score: 49 }),
      row({ id: "b", final_score: 50 }),
      row({ id: "c", final_score: 75 }),
      row({ id: "d", final_score: 90 }),
      row({ id: "e", final_score: 91 }),
    ];
    expect(
      applyRespondentFilters(rows, { scoreMin: 50, scoreMax: 90 }, 70).map((r) => r.id),
    ).toEqual(["b", "c", "d"]);
  });

  it("dateFrom filters out rows BEFORE the given calendar day", () => {
    const rows = [
      row({ id: "before", created_at: "2026-04-30T23:59:59.000Z" }),
      row({ id: "boundary", created_at: "2026-05-01T00:00:00.000Z" }),
      row({ id: "after", created_at: "2026-05-02T10:00:00.000Z" }),
    ];
    expect(applyRespondentFilters(rows, { dateFrom: "2026-05-01" }, 70).map((r) => r.id)).toEqual([
      "boundary",
      "after",
    ]);
  });

  it("dateTo is END-OF-DAY inclusive (timestamps at 23:58 on the cut-off day still count)", () => {
    // Critical UX assertion — author types "to: May 1" expecting "everything
    // through May 1" not "before midnight at the start of May 1".
    const rows = [
      row({ id: "morning", created_at: "2026-05-01T08:00:00.000Z" }),
      row({ id: "late", created_at: "2026-05-01T23:58:00.000Z" }),
      row({ id: "next", created_at: "2026-05-02T00:00:01.000Z" }),
    ];
    expect(applyRespondentFilters(rows, { dateTo: "2026-05-01" }, 70).map((r) => r.id)).toEqual([
      "morning",
      "late",
    ]);
  });

  it("composes every axis with AND semantics", () => {
    const rows = [
      row({ id: "fail-in-range", final_score: 55, created_at: "2026-05-10T10:00:00.000Z" }),
      row({ id: "pass-in-range", final_score: 80, created_at: "2026-05-10T10:00:00.000Z" }),
      row({ id: "pass-too-low", final_score: 75, created_at: "2026-05-10T10:00:00.000Z" }),
      row({ id: "pass-out-of-range", final_score: 85, created_at: "2026-06-01T10:00:00.000Z" }),
    ];
    const out = applyRespondentFilters(
      rows,
      {
        pass: "yes",
        scoreMin: 80,
        scoreMax: 95,
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
      },
      70,
    );
    expect(out.map((r) => r.id)).toEqual(["pass-in-range"]);
  });

  it("returns an empty list when no row satisfies the filter (caller renders empty-state copy)", () => {
    const rows = [row({ final_score: 50 }), row({ final_score: 60 })];
    expect(applyRespondentFilters(rows, { pass: "yes" }, 70)).toEqual([]);
  });
});
