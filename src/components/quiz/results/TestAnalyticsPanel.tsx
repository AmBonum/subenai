import { useMemo } from "react";
import type { AnswerRecord } from "@/lib/quiz/score/scoring";
import {
  computeAnalytics,
  RUSH_THRESHOLD_MS,
  type BucketStat,
  type DifficultyKey,
  type TestAnalytics,
} from "@/lib/quiz/score/analytics";
import type { Category } from "@/lib/quiz/bank/questions";
import { tFor } from "@/i18n/quiz";

const DIFFICULTY_ORDER: DifficultyKey[] = ["easy", "medium", "hard"];
const CATEGORY_ORDER: Category[] = ["phishing", "url", "fake_vs_real", "scenario", "honeypot"];

function secs(ms: number): string {
  return (ms / 1000).toFixed(1);
}

function formatDuration(ms: number): string {
  if (ms >= 60_000) {
    const m = Math.floor(ms / 60_000);
    const s = Math.round((ms % 60_000) / 1000);
    return `${m}m ${s}s`;
  }
  return `${secs(ms)}s`;
}

/** E59 — derives richer per-question timing/accuracy stats from the answer
 *  records already captured during the test and renders them as a panel on
 *  the results page. Pure presentation; no persistence. */
export function TestAnalyticsPanel({ answers }: { answers: AnswerRecord[] }) {
  const t = tFor("results");
  const a: TestAnalytics = useMemo(() => computeAnalytics(answers), [answers]);

  if (a.totalQuestions === 0) return null;

  const secSuffix = t("analytics.seconds_suffix");
  const accentBuckets = CATEGORY_ORDER.filter((c) => a.byCategory[c].total > 0);

  return (
    <div
      data-testid="results-analytics-panel"
      className="mt-6 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <h3 className="text-base font-bold">{t("analytics.title")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("analytics.subtitle")}</p>

      {/* Headline tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          testid="results-analytics-total-time"
          label={t("analytics.total_time")}
          value={formatDuration(a.totalTimeMs)}
        />
        <Tile
          testid="results-analytics-median-time"
          label={t("analytics.median_time")}
          value={`${secs(a.medianResponseMs)}${secSuffix}`}
        />
        <Tile
          testid="results-analytics-fastest"
          label={t("analytics.fastest")}
          value={a.fastest ? `${secs(a.fastest.ms)}${secSuffix}` : "—"}
        />
        <Tile
          testid="results-analytics-slowest"
          label={t("analytics.slowest")}
          value={a.slowest ? `${secs(a.slowest.ms)}${secSuffix}` : "—"}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          testid="results-analytics-rush-rate"
          label={t("analytics.rush_rate")}
          value={`${a.rushRate}%`}
          tone={a.rushRate >= 40 ? "warn" : "muted"}
        />
        <Tile
          testid="results-analytics-streak"
          label={t("analytics.streak")}
          value={`${a.longestCorrectStreak}${t("analytics.streak_suffix")}`}
        />
        <Tile
          testid="results-analytics-answered"
          label={t("analytics.answered")}
          value={`${a.answered}/${a.totalQuestions}`}
        />
        <Tile
          testid="results-analytics-timed-out"
          label={t("analytics.timed_out")}
          value={`${a.timedOut}`}
          tone={a.timedOut > 0 ? "warn" : "muted"}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("analytics.rush_hint", { threshold: RUSH_THRESHOLD_MS / 1000 })}
      </p>

      {/* By difficulty */}
      <BucketTable
        testidPrefix="results-analytics-difficulty"
        title={t("analytics.by_difficulty_title")}
        colAccuracy={t("analytics.col_accuracy")}
        colTime={t("analytics.col_avg_time")}
        secSuffix={secSuffix}
        rows={DIFFICULTY_ORDER.filter((d) => a.byDifficulty[d].total > 0).map((d) => ({
          key: d,
          label: t(`analytics.difficulty.${d}`),
          stat: a.byDifficulty[d],
        }))}
      />

      {/* By category */}
      <BucketTable
        testidPrefix="results-analytics-category"
        title={t("analytics.by_category_title")}
        colAccuracy={t("analytics.col_accuracy")}
        colTime={t("analytics.col_avg_time")}
        secSuffix={secSuffix}
        rows={accentBuckets.map((c) => ({
          key: c,
          label: t(`categories.${c}`),
          stat: a.byCategory[c],
        }))}
      />
    </div>
  );
}

function Tile({
  testid,
  label,
  value,
  tone = "muted",
}: {
  testid: string;
  label: string;
  value: string;
  tone?: "muted" | "warn";
}) {
  return (
    <div
      data-testid={testid}
      className="rounded-xl border border-border/60 bg-background/40 p-3 text-center"
    >
      <div
        className={`font-display text-xl font-black tabular-nums ${
          tone === "warn" ? "text-warning" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function BucketTable({
  testidPrefix,
  title,
  colAccuracy,
  colTime,
  secSuffix,
  rows,
}: {
  testidPrefix: string;
  title: string;
  colAccuracy: string;
  colTime: string;
  secSuffix: string;
  rows: { key: string; label: string; stat: BucketStat }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        <span className="flex gap-3 text-[10px] font-semibold uppercase">
          <span className="w-16 whitespace-nowrap text-right">{colAccuracy}</span>
          <span className="w-16 whitespace-nowrap text-right">{colTime}</span>
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.key}
            data-testid={`${testidPrefix}-${r.key}`}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-foreground/85">{r.label}</span>
            <span className="flex gap-3 font-mono tabular-nums">
              <span
                className={`w-16 text-right font-semibold ${
                  r.stat.accuracy >= 70
                    ? "text-success"
                    : r.stat.accuracy >= 40
                      ? "text-warning"
                      : "text-destructive"
                }`}
              >
                {r.stat.accuracy}%
              </span>
              <span className="w-16 text-right text-muted-foreground">
                {secs(r.stat.avgResponseMs)}
                {secSuffix}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
