/**
 * E38 Phase E — pure shape helpers for the PDF export. Kept out of the
 * React-PDF tree so we can unit-test bucketing/formatting without
 * importing @react-pdf/renderer (which bloats the test runner).
 *
 * Mirrors the CSV/JSON exports' privacy posture: the generated_at
 * timestamp is injected by the caller (tests pin it; production passes
 * `new Date()`) and the GDPR caveat string is part of the rendered
 * document, not a side-channel.
 */
import { applyRespondentFilters, type RespondentFilters, type RespondentRow } from "./types";

export interface PdfRowFormatted {
  /** Stable react-pdf key. */
  id: string;
  name: string;
  email: string;
  /** "85" — the bare number, formatted by the caller with "%" if desired. */
  score: string;
  /** Localised "áno" / "nie". */
  passed: string;
  /** Seconds rounded — matches the CSV column. */
  timeSec: string;
  /** ISO date, sliced to YYYY-MM-DD for legibility on paper. */
  date: string;
}

export interface PdfData {
  /** "subenai.sk — výsledky edu testu · vygenerované 2026-05-20T10:00:00Z" */
  headerLine: string;
  /** "OBSAHUJE OSOBNÉ ÚDAJE …" — same wording as CSV. */
  privacyLine: string;
  /** Author-facing display label; null → fall back to creator_label. */
  creatorLabel: string | null;
  /** Aggregate stats numbers, pre-formatted for direct rendering. */
  aggregate: {
    count: string;
    avg: string;
    median: string;
    minMax: string;
    passed: string;
    threshold: number;
  };
  /** Histogram bands — labels mirror AggregateStats + ResultsCharts so the
   *  PDF reader sees the same four bins as the dashboard. */
  histogram: Array<{ label: string; count: number }>;
  /** Filter narrative — "Aktívne filtre: skóre 50–80, len vyhoveli". Empty
   *  string when no filters are active (caller can suppress the line). */
  filterSummary: string;
  /** Filtered + formatted respondent rows ready for table rendering. */
  rows: PdfRowFormatted[];
  /** True iff filters narrowed the row set; the renderer surfaces a
   *  "(zúžené filtrom)" note next to the rows count. */
  filteredOut: boolean;
  /** Total row count BEFORE filtering — used in the "showing X of Y" line. */
  totalRowCount: number;
}

interface AggregateStatsLike {
  count: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  median_score: number;
  passing_threshold: number;
  pass_count: number;
  pass_rate: number;
  histogram: [number, number, number, number];
}

interface BuildArgs {
  rows: RespondentRow[];
  stats: AggregateStatsLike;
  filters: RespondentFilters;
  passingThreshold: number;
  creatorLabel: string | null;
  generatedAt: Date;
}

const HISTOGRAM_LABELS = ["0–24", "25–49", "50–74", "75–100"] as const;

export function buildPdfData(args: BuildArgs): PdfData {
  const { rows, stats, filters, passingThreshold, creatorLabel, generatedAt } = args;
  const filtered = applyRespondentFilters(rows, filters, passingThreshold);

  const formatRow = (r: RespondentRow): PdfRowFormatted => ({
    id: r.id,
    name: r.respondent_name,
    email: r.respondent_email,
    score: String(r.final_score),
    passed: r.final_score >= passingThreshold ? "áno" : "nie",
    timeSec: String(Math.round(r.total_time_ms / 1000)),
    date: r.created_at.slice(0, 10),
  });

  return {
    headerLine: `subenai.sk — výsledky edu testu · vygenerované ${generatedAt.toISOString()}`,
    privacyLine:
      "OBSAHUJE OSOBNÉ ÚDAJE (meno, email respondentov). Spracuj v súlade s GDPR — viď subenai.sk/privacy",
    creatorLabel,
    aggregate: {
      count: String(stats.count),
      avg: `${stats.avg_score.toFixed(1)} %`,
      median: `${stats.median_score.toFixed(1)} %`,
      minMax: `${stats.min_score} / ${stats.max_score} %`,
      passed: `${stats.pass_count} (${stats.pass_rate.toFixed(1)} %)`,
      threshold: stats.passing_threshold,
    },
    histogram: HISTOGRAM_LABELS.map((label, i) => ({ label, count: stats.histogram[i] })),
    filterSummary: summariseFilters(filters),
    rows: filtered.map(formatRow),
    filteredOut: filtered.length !== rows.length,
    totalRowCount: rows.length,
  };
}

function summariseFilters(f: RespondentFilters): string {
  const parts: string[] = [];
  if (f.pass === "yes") parts.push("len vyhoveli");
  else if (f.pass === "no") parts.push("len nevyhoveli");
  if (f.scoreMin !== undefined || f.scoreMax !== undefined) {
    const lo = f.scoreMin ?? 0;
    const hi = f.scoreMax ?? 100;
    parts.push(`skóre ${lo}–${hi}`);
  }
  if (f.dateFrom || f.dateTo) {
    parts.push(`dátum ${f.dateFrom ?? "…"} – ${f.dateTo ?? "…"}`);
  }
  return parts.length === 0 ? "" : `Aktívne filtre: ${parts.join(", ")}`;
}

/** Lowercase kebab-case slug for filenames. Trims leading/trailing
 *  dashes after replacement so a label like "///" doesn't slugify to a
 *  bare "-" that sneaks past the empty-string fallback. Shared with the
 *  CSV/JSON download paths in the /results route. */
export function slugifyForFilename(label: string | null): string {
  const slug = (label ?? "edu-test")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "edu-test";
}

export function buildPdfFilename(creatorLabel: string | null, setId: string): string {
  return `${slugifyForFilename(creatorLabel)}-${setId.slice(0, 8)}.pdf`;
}
