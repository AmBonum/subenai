import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AggregateStats, RespondentRow } from "@/lib/edu/types";
import { buildPassFailData, buildScoreDistribution, buildTimeBuckets } from "@/lib/edu/charts";
import { tFor } from "@/i18n/quiz";

interface Props {
  stats: AggregateStats;
  rows: RespondentRow[];
}

// Tailwind v4 design tokens are emitted as full `oklch(…)` values in
// styles.css, so the SVG fill is the raw CSS variable (no `hsl()`
// wrapper — that turns the value into invalid CSS and falls back to
// black). Recharts needs literal strings so we capture the two semantic
// tones (pass = primary, fail = destructive) once here rather than
// threading classNames into SVG nodes.
const COLOR_PASS = "var(--primary)";
const COLOR_FAIL = "var(--destructive)";
const COLOR_BAR = "var(--primary)";

export function ResultsCharts({ stats, rows }: Props) {
  const t = tFor("results_charts");
  if (stats.count === 0) {
    return null;
  }
  const scoreData = buildScoreDistribution(stats);
  const passFailData = buildPassFailData(stats);
  const timeData = buildTimeBuckets(rows);

  return (
    <section
      data-testid="results-charts-root"
      aria-labelledby="results-charts-h"
      className="grid gap-4 md:grid-cols-3"
    >
      <h2 id="results-charts-h" className="sr-only">
        {t("section_aria")}
      </h2>

      <ChartCard testId="results-chart-score" title={t("score_title")}>
        <p data-testid="results-chart-score-sr" className="sr-only">
          {t("score_sr", {
            b0: scoreData[0].count,
            b1: scoreData[1].count,
            b2: scoreData[2].count,
            b3: scoreData[3].count,
          })}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={scoreData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklch, var(--muted) 40%, transparent)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" fill={COLOR_BAR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard testId="results-chart-passfail" title={t("passfail_title")}>
        <p data-testid="results-chart-passfail-sr" className="sr-only">
          {t("passfail_sr", {
            pass: stats.pass_count,
            fail: stats.count - stats.pass_count,
            total: stats.count,
          })}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={passFailData}
              dataKey="count"
              nameKey="key"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {passFailData.map((slice) => (
                <Cell key={slice.key} fill={slice.key === "pass" ? COLOR_PASS : COLOR_FAIL} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, item) => {
                const key = (item?.payload as { key?: "pass" | "fail" } | undefined)?.key;
                return [
                  value,
                  key === "pass" ? t("passfail_legend_pass") : t("passfail_legend_fail"),
                ];
              }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <ul
          data-testid="results-chart-passfail-legend"
          className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground"
        >
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: COLOR_PASS }} />
            {t("passfail_legend_pass")}:{" "}
            <strong className="text-foreground">{stats.pass_count}</strong>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: COLOR_FAIL }} />
            {t("passfail_legend_fail")}:{" "}
            <strong className="text-foreground">{stats.count - stats.pass_count}</strong>
          </li>
        </ul>
      </ChartCard>

      <ChartCard testId="results-chart-time" title={t("time_title")}>
        <p data-testid="results-chart-time-sr" className="sr-only">
          {t("time_sr", {
            b0: timeData[0].count,
            b1: timeData[1].count,
            b2: timeData[2].count,
            b3: timeData[3].count,
          })}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={timeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklch, var(--muted) 40%, transparent)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" fill={COLOR_BAR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function ChartCard({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col rounded-2xl border border-border/60 bg-card/40 p-4"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-2 flex-1">{children}</div>
    </div>
  );
}
