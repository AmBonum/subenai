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

/**
 * Structured filter state for the RespondentsTable. Lives on the URL
 * search-params of the parent /results route so a deep link reproduces
 * the exact view (no consent gating needed — URL params aren't storage).
 * `undefined` means "no constraint on this axis" — Clear filters resets
 * everything to undefined. The name/email free-text filter stays in
 * component state because high-frequency keystrokes aren't worth the
 * URL churn (same call as the blog index).
 */
export interface RespondentFilters {
  /** "yes" → only passing rows, "no" → only failing rows, undefined → both. */
  pass?: "yes" | "no";
  /** Inclusive lower bound on final_score, 0–100. */
  scoreMin?: number;
  /** Inclusive upper bound on final_score, 0–100. */
  scoreMax?: number;
  /** ISO date YYYY-MM-DD — inclusive lower bound on created_at. */
  dateFrom?: string;
  /** ISO date YYYY-MM-DD — inclusive upper bound on created_at (end-of-day). */
  dateTo?: string;
}

export const EMPTY_RESPONDENT_FILTERS: RespondentFilters = {};

export function countActiveFilters(f: RespondentFilters): number {
  let n = 0;
  if (f.pass !== undefined) n += 1;
  if (f.scoreMin !== undefined) n += 1;
  if (f.scoreMax !== undefined) n += 1;
  if (f.dateFrom !== undefined) n += 1;
  if (f.dateTo !== undefined) n += 1;
  return n;
}

/**
 * Apply the structured filters to a row list. Free-text name/email
 * query stays orthogonal — RespondentsTable composes both. Pulled out
 * here so server-side CSV/JSON exports could honour the same filters
 * if we ever choose to (today they export the full set).
 */
export function applyRespondentFilters(
  rows: RespondentRow[],
  filters: RespondentFilters,
  passingThreshold: number,
): RespondentRow[] {
  return rows.filter((r) => {
    if (filters.pass === "yes" && r.final_score < passingThreshold) return false;
    if (filters.pass === "no" && r.final_score >= passingThreshold) return false;
    if (filters.scoreMin !== undefined && r.final_score < filters.scoreMin) return false;
    if (filters.scoreMax !== undefined && r.final_score > filters.scoreMax) return false;
    if (filters.dateFrom && r.created_at < filters.dateFrom) return false;
    // dateTo is end-of-day inclusive: any timestamp on that calendar day
    // counts. `${dateTo}T23:59:59.999Z` is the simplest UTC-safe form.
    if (filters.dateTo && r.created_at > `${filters.dateTo}T23:59:59.999Z`) return false;
    return true;
  });
}

/** Build a CSV string from respondent rows — kept here so server + client
 *  agree on the shape and unit tests cover it without DOM.
 *
 *  E34 Phase 3 (D6) — output is prefixed with two `#`-commented header
 *  lines that flag the file as containing personal data + reference the
 *  privacy policy. RFC 4180 doesn't specify comment syntax, but every
 *  spreadsheet (Excel, LibreOffice, Numbers, Google Sheets) treats
 *  `# `-prefixed leading rows as a single-cell row that the author
 *  will visually skip — i.e. zero parser breakage, full readability
 *  on double-click. The author downloaded the file; they'll open it →
 *  they read the caveat → they know what they're handling.
 *
 *  The optional `generatedAt` arg lets callers pin a deterministic
 *  timestamp (unit tests + CI golden files). Production callers omit
 *  it and we fall back to `new Date()`.
 */
export function rowsToCsv(
  rows: RespondentRow[],
  passingThreshold: number,
  generatedAt: Date = new Date(),
): string {
  const ts = generatedAt.toISOString();
  const header = ["Meno", "Email", "Skóre", "Percentil", "Vyhovel", "Čas (s)", "Dátum"];
  const lines = [
    `# subenai.sk — výsledky edu testu · vygenerované ${ts}`,
    "# OBSAHUJE OSOBNÉ ÚDAJE (meno, email respondentov). Spracuj v súlade s GDPR — viď subenai.sk/privacy",
    header.map(csvField).join(","),
  ];
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
