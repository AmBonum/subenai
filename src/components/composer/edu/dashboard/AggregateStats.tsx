import type { AggregateStats as Stats } from "@/lib/edu/types";
import { tFor } from "@/i18n/quiz";

interface Props {
  stats: Stats;
}

export function AggregateStats({ stats }: Props) {
  const t = tFor("aggregate");
  if (stats.count === 0) {
    return null;
  }
  const max = Math.max(...stats.histogram, 1);
  const bands: Array<{ label: string; value: number }> = [
    { label: "0–24", value: stats.histogram[0] },
    { label: "25–49", value: stats.histogram[1] },
    { label: "50–74", value: stats.histogram[2] },
    { label: "75–100", value: stats.histogram[3] },
  ];

  return (
    <section
      data-testid="agg-stats-root"
      aria-labelledby="agg-h"
      className="grid gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 md:grid-cols-2"
    >
      <h2 id="agg-h" className="sr-only">
        {t("section_aria")}
      </h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Cell label={t("respondents")} value={String(stats.count)} testId="agg-stats-count" />
        <Cell
          label={t("average")}
          value={`${stats.avg_score.toFixed(1)} %`}
          testId="agg-stats-avg"
        />
        <Cell
          label={t("median")}
          value={`${stats.median_score.toFixed(1)} %`}
          testId="agg-stats-median"
        />
        <Cell
          label={t("min_max")}
          value={`${stats.min_score} / ${stats.max_score} %`}
          testId="agg-stats-min-max"
        />
        <Cell
          label={t("passed_label", { threshold: stats.passing_threshold })}
          value={t("passed_value", { count: stats.pass_count, rate: stats.pass_rate.toFixed(1) })}
          span={2}
          testId="agg-stats-pass-value"
        />
      </dl>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("distribution")}
        </p>
        <ul className="mt-2 space-y-2">
          {bands.map((b, i) => (
            <li
              key={b.label}
              data-testid={`agg-stats-band-${i}`}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-14 shrink-0 text-muted-foreground">{b.label}</span>
              <span
                role="presentation"
                className="h-3 rounded-full bg-primary/60"
                style={{ width: `${(b.value / max) * 100}%`, minWidth: b.value > 0 ? "8px" : 0 }}
              />
              <span className="ml-auto tabular-nums text-foreground">{b.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  span = 1,
  testId,
}: {
  label: string;
  value: string;
  span?: 1 | 2;
  testId?: string;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : undefined}>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd data-testid={testId} className="mt-1 text-2xl font-black text-foreground">
        {value}
      </dd>
    </div>
  );
}
