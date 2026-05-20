/**
 * Shape of an edu attempts row exposed by `/api/results-data`.
 * Keep in sync with `RespondentRow` in functions/api/results-data.ts.
 */
export interface RespondentRow {
  id: string;
  share_id: string;
  respondent_name: string;
  respondent_email: string;
  final_score: number;
  percentile: number;
  total_time_ms: number;
  created_at: string;
  /**
   * Raw `attempts.answers` JSONB. Validate via `parseAnswers()` from
   * `@/lib/quiz/bank/schema` at the drill-down render boundary (E34 Phase 1).
   * `null` for historical rows where the column was not yet populated;
   * the modal then renders the documented fallback.
   */
  answers: unknown;
}

export interface AggregateStats {
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

export interface ResultsDataPayload {
  set_id: string;
  creator_label: string | null;
  passing_threshold: number;
  question_count: number;
  collects_responses: boolean;
  rows: RespondentRow[];
  stats: AggregateStats;
}

/** Build a CSV string from respondent rows — kept here so server + client
 *  agree on the shape and unit tests cover it without DOM. */
export function rowsToCsv(rows: RespondentRow[], passingThreshold: number): string {
  const header = ["Meno", "Email", "Skóre", "Percentil", "Vyhovel", "Čas (s)", "Dátum"];
  const lines = [header.map(csvField).join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvField(r.respondent_name),
        csvField(r.respondent_email),
        String(r.final_score),
        String(r.percentile),
        r.final_score >= passingThreshold ? "áno" : "nie",
        Math.round(r.total_time_ms / 1000).toString(),
        r.created_at,
      ].join(","),
    );
  }
  // \r\n line endings — Excel-friendly.
  return lines.join("\r\n");
}

function csvField(value: string): string {
  // Escape per RFC 4180: wrap in quotes if value contains , " \r \n; double internal quotes.
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
