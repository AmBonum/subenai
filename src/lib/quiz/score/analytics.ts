import type { Category } from "@/lib/quiz/bank/questions";
import type { AnswerRecord } from "@/lib/quiz/score/scoring";

/** Answers faster than this (and not a timeout) count as "rushed". Matches
 *  the <2s speed penalty in computeScore() so the two stay consistent. */
export const RUSH_THRESHOLD_MS = 2000;

export type DifficultyKey = "easy" | "medium" | "hard";

const DIFFICULTIES: DifficultyKey[] = ["easy", "medium", "hard"];
const CATEGORIES: Category[] = ["phishing", "url", "fake_vs_real", "scenario", "honeypot"];

export interface BucketStat {
  total: number;
  correct: number;
  /** 0–100; 0 when the bucket is empty. */
  accuracy: number;
  /** Rounded ms; 0 when the bucket is empty. */
  avgResponseMs: number;
}

export interface TestAnalytics {
  totalQuestions: number;
  answered: number;
  timedOut: number;
  totalTimeMs: number;
  avgResponseMs: number;
  medianResponseMs: number;
  fastest: { questionId: string; ms: number } | null;
  slowest: { questionId: string; ms: number } | null;
  /** 0–100, share of *answered* questions decided under RUSH_THRESHOLD_MS. */
  rushRate: number;
  longestCorrectStreak: number;
  byDifficulty: Record<DifficultyKey, BucketStat>;
  byCategory: Record<Category, BucketStat>;
}

function bucket(records: AnswerRecord[]): BucketStat {
  const total = records.length;
  if (total === 0) return { total: 0, correct: 0, accuracy: 0, avgResponseMs: 0 };
  const correct = records.filter((r) => r.correct).length;
  const sumMs = records.reduce((s, r) => s + r.responseMs, 0);
  return {
    total,
    correct,
    accuracy: Math.round((correct / total) * 100),
    avgResponseMs: Math.round(sumMs / total),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function computeAnalytics(answers: AnswerRecord[]): TestAnalytics {
  const byDifficulty = DIFFICULTIES.reduce(
    (acc, d) => {
      acc[d] = bucket(answers.filter((a) => a.difficulty === d));
      return acc;
    },
    {} as Record<DifficultyKey, BucketStat>,
  );
  const byCategory = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = bucket(answers.filter((a) => a.category === c));
      return acc;
    },
    {} as Record<Category, BucketStat>,
  );

  if (answers.length === 0) {
    return {
      totalQuestions: 0,
      answered: 0,
      timedOut: 0,
      totalTimeMs: 0,
      avgResponseMs: 0,
      medianResponseMs: 0,
      fastest: null,
      slowest: null,
      rushRate: 0,
      longestCorrectStreak: 0,
      byDifficulty,
      byCategory,
    };
  }

  const answered = answers.filter((a) => a.optionId !== null);
  const totalTimeMs = answers.reduce((s, a) => s + a.responseMs, 0);

  let fastest = answers[0];
  let slowest = answers[0];
  for (const a of answers) {
    if (a.responseMs < fastest.responseMs) fastest = a;
    if (a.responseMs > slowest.responseMs) slowest = a;
  }

  const rushed = answered.filter((a) => a.responseMs < RUSH_THRESHOLD_MS).length;
  const rushRate = answered.length > 0 ? Math.round((rushed / answered.length) * 100) : 0;

  let streak = 0;
  let longestCorrectStreak = 0;
  for (const a of answers) {
    if (a.correct) {
      streak++;
      if (streak > longestCorrectStreak) longestCorrectStreak = streak;
    } else {
      streak = 0;
    }
  }

  return {
    totalQuestions: answers.length,
    answered: answered.length,
    timedOut: answers.length - answered.length,
    totalTimeMs,
    avgResponseMs: Math.round(totalTimeMs / answers.length),
    medianResponseMs: median(answers.map((a) => a.responseMs)),
    fastest: { questionId: fastest.questionId, ms: fastest.responseMs },
    slowest: { questionId: slowest.questionId, ms: slowest.responseMs },
    rushRate,
    longestCorrectStreak,
    byDifficulty,
    byCategory,
  };
}
