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

describe("edu/types — rowsToCsv", () => {
  it("emits header + body with CRLF line endings", () => {
    const csv = rowsToCsv([sample()], 70);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Meno,Email,Skóre,Percentil,Vyhovel,Čas (s),Dátum");
    expect(lines).toHaveLength(2);
  });

  it('formats fields correctly: "Skóre" as raw, "Vyhovel" as "áno"/"nie", "Čas" in seconds', () => {
    const csv = rowsToCsv([sample({ total_time_ms: 90_000, final_score: 71 })], 70);
    const fields = csv.split("\r\n")[1].split(",");
    expect(fields[2]).toBe("71"); // Skóre
    expect(fields[4]).toBe("áno"); // Vyhovel
    expect(fields[5]).toBe("90"); // Čas (s)
  });

  it('flips "Vyhovel" to "nie" when score is below threshold', () => {
    const csv = rowsToCsv([sample({ final_score: 50 })], 70);
    const fields = csv.split("\r\n")[1].split(",");
    expect(fields[4]).toBe("nie");
  });

  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const row = sample({
      respondent_name: 'Jana, "the Boss" Nováková',
      respondent_email: "line\nbreak@example.sk",
    });
    const csv = rowsToCsv([row], 70);
    const body = csv.split("\r\n")[1];
    // Name has comma + quotes → wrapped in quotes, internal " doubled.
    expect(body).toContain('"Jana, ""the Boss"" Nováková"');
    // Email has \n → wrapped in quotes.
    expect(body).toContain('"line\nbreak@example.sk"');
  });

  it("returns header-only when rows is empty", () => {
    const csv = rowsToCsv([], 70);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});
