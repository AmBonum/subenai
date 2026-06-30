import { describe, it, expect } from "vitest";
import { computeAnalytics, RUSH_THRESHOLD_MS } from "@/lib/quiz/score/analytics";
import type { AnswerRecord } from "@/lib/quiz/score/scoring";

function rec(p: Partial<AnswerRecord> & { responseMs: number }): AnswerRecord {
  return {
    questionId: p.questionId ?? "q",
    optionId: p.optionId === undefined ? "a" : p.optionId,
    correct: p.correct ?? true,
    severity: p.severity ?? null,
    responseMs: p.responseMs,
    category: p.category ?? "phishing",
    difficulty: p.difficulty ?? "easy",
  };
}

describe("computeAnalytics (E59)", () => {
  it("returns a zeroed shell for no answers", () => {
    const a = computeAnalytics([]);
    expect(a.totalQuestions).toBe(0);
    expect(a.answered).toBe(0);
    expect(a.avgResponseMs).toBe(0);
    expect(a.medianResponseMs).toBe(0);
    expect(a.fastest).toBeNull();
    expect(a.slowest).toBeNull();
    expect(a.rushRate).toBe(0);
    expect(a.longestCorrectStreak).toBe(0);
  });

  it("computes timing aggregates", () => {
    const a = computeAnalytics([
      rec({ questionId: "q1", responseMs: 1000 }),
      rec({ questionId: "q2", responseMs: 3000 }),
      rec({ questionId: "q3", responseMs: 5000 }),
    ]);
    expect(a.totalTimeMs).toBe(9000);
    expect(a.avgResponseMs).toBe(3000);
    expect(a.medianResponseMs).toBe(3000);
    expect(a.fastest).toEqual({ questionId: "q1", ms: 1000 });
    expect(a.slowest).toEqual({ questionId: "q3", ms: 5000 });
  });

  it("averages the two middle values for an even-length median", () => {
    const a = computeAnalytics([
      rec({ responseMs: 1000 }),
      rec({ responseMs: 2000 }),
      rec({ responseMs: 4000 }),
      rec({ responseMs: 5000 }),
    ]);
    expect(a.medianResponseMs).toBe(3000);
  });

  it("counts answered vs timed-out and rush rate (only answered count toward rush)", () => {
    const a = computeAnalytics([
      rec({ responseMs: 500, optionId: "a" }), // rushed answer
      rec({ responseMs: 4000, optionId: "b" }),
      rec({ responseMs: 100, optionId: null, correct: false, severity: "medium" }), // timeout, not a rush
    ]);
    expect(a.answered).toBe(2);
    expect(a.timedOut).toBe(1);
    // 1 of 2 answered was under the rush threshold → 50%
    expect(a.rushRate).toBe(50);
    expect(RUSH_THRESHOLD_MS).toBe(2000);
  });

  it("aggregates accuracy + time per difficulty", () => {
    const a = computeAnalytics([
      rec({ difficulty: "easy", correct: true, responseMs: 1000 }),
      rec({ difficulty: "easy", correct: false, severity: "minor", responseMs: 3000 }),
      rec({ difficulty: "hard", correct: true, responseMs: 6000 }),
    ]);
    expect(a.byDifficulty.easy.total).toBe(2);
    expect(a.byDifficulty.easy.correct).toBe(1);
    expect(a.byDifficulty.easy.accuracy).toBe(50);
    expect(a.byDifficulty.easy.avgResponseMs).toBe(2000);
    expect(a.byDifficulty.hard.total).toBe(1);
    expect(a.byDifficulty.hard.accuracy).toBe(100);
    expect(a.byDifficulty.medium.total).toBe(0);
    expect(a.byDifficulty.medium.accuracy).toBe(0);
  });

  it("aggregates accuracy per category including honeypot", () => {
    const a = computeAnalytics([
      rec({ category: "honeypot", correct: false, severity: "critical", responseMs: 1000 }),
      rec({ category: "phishing", correct: true, responseMs: 1000 }),
    ]);
    expect(a.byCategory.honeypot.total).toBe(1);
    expect(a.byCategory.honeypot.accuracy).toBe(0);
    expect(a.byCategory.phishing.accuracy).toBe(100);
    expect(a.byCategory.url.total).toBe(0);
  });

  it("finds the longest run of consecutive correct answers", () => {
    const a = computeAnalytics([
      rec({ correct: true, responseMs: 1000 }),
      rec({ correct: true, responseMs: 1000 }),
      rec({ correct: false, severity: "minor", responseMs: 1000 }),
      rec({ correct: true, responseMs: 1000 }),
      rec({ correct: true, responseMs: 1000 }),
      rec({ correct: true, responseMs: 1000 }),
    ]);
    expect(a.longestCorrectStreak).toBe(3);
  });
});
