import { describe, it, expect } from "vitest";
import { rowsToCsv } from "@/lib/edu/types";
import type { RespondentRow } from "@/lib/edu/types";

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
