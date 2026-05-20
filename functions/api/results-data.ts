// E12.4 — Return aggregate stats + per-respondent rows for an edu test_set.
//
// Auth: HttpOnly cookie set by /api/verify-author-password. We never
// trust a client-supplied set_id — the cookie's JWT carries the set the
// session is bound to, and the request body's set_id must match exactly.
//
// Privacy: only this CF Function exposes respondent_name / respondent_email.
// Anon SELECT on those rows is blocked by RLS (E12.1 / E12.3 lockdown);
// service-role bypass is the only legitimate path.

import { createClient } from "@supabase/supabase-js";
import { verifyEduAuthorToken, EDU_AUTHOR_COOKIE_NAME } from "../_lib/jwt";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface ResultsRequestBody {
  set_id?: unknown;
}

export interface RespondentRow {
  id: string;
  share_id: string;
  respondent_name: string;
  respondent_email: string;
  final_score: number;
  percentile: number;
  total_time_ms: number;
  created_at: string;
  // E34 Phase 1 — raw JSONB from `attempts.answers`. Kept as `unknown` here
  // (server-side; never trust the DB shape) and validated client-side at
  // the drill-down render boundary via `parseAnswers()`. Historical rows
  // (pre-E3.1, ~Apr 2026) may be `null` — the modal renders a fallback.
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
  /** 4 buckets: 0-24, 25-49, 50-74, 75-100. */
  histogram: [number, number, number, number];
}

interface ResultsResponse {
  set_id?: string;
  creator_label?: string | null;
  passing_threshold?: number;
  question_count?: number;
  collects_responses?: boolean;
  rows?: RespondentRow[];
  stats?: AggregateStats;
  error?: string;
}

function jsonResponse(status: number, body: ResultsResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function bucket(score: number): 0 | 1 | 2 | 3 {
  if (score < 25) return 0;
  if (score < 50) return 1;
  if (score < 75) return 2;
  return 3;
}

export function computeAggregate(scores: number[], passingThreshold: number): AggregateStats {
  if (scores.length === 0) {
    return {
      count: 0,
      avg_score: 0,
      min_score: 0,
      max_score: 0,
      median_score: 0,
      passing_threshold: passingThreshold,
      pass_count: 0,
      pass_rate: 0,
      histogram: [0, 0, 0, 0],
    };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);
  const histogram: [number, number, number, number] = [0, 0, 0, 0];
  let pass = 0;
  for (const s of scores) {
    histogram[bucket(s)] += 1;
    if (s >= passingThreshold) pass += 1;
  }
  return {
    count: scores.length,
    avg_score: Math.round((sum / scores.length) * 10) / 10,
    min_score: sorted[0],
    max_score: sorted[sorted.length - 1],
    median_score: Math.round(median(sorted) * 10) / 10,
    passing_threshold: passingThreshold,
    pass_count: pass,
    pass_rate: Math.round((pass / scores.length) * 1000) / 10,
    histogram,
  };
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.JWT_SECRET) {
    return jsonResponse(500, { error: "jwt_not_configured" });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const cookie = readCookie(request, EDU_AUTHOR_COOKIE_NAME);
  if (!cookie) return jsonResponse(401, { error: "no_session" });

  const verification = await verifyEduAuthorToken(cookie, env.JWT_SECRET);
  if (!verification.ok) {
    return jsonResponse(401, { error: `token_${verification.reason}` });
  }

  let body: ResultsRequestBody;
  try {
    body = (await request.json()) as ResultsRequestBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  if (typeof body.set_id !== "string" || body.set_id !== verification.claims.set_id) {
    // Cookie is set-scoped, so a mismatch here means the URL was changed
    // mid-session — refuse rather than silently switching contexts.
    return jsonResponse(403, { error: "set_mismatch" });
  }

  const setId = verification.claims.set_id;
  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: setRow, error: setErr } = await supabase
    .from("test_sets")
    .select("id, creator_label, passing_threshold, question_ids, collects_responses")
    .eq("id", setId)
    .maybeSingle();
  if (setErr) {
    console.error("results-data set lookup", { set_id: setId, message: setErr.message });
    return jsonResponse(500, { error: "lookup_failed" });
  }
  if (!setRow) return jsonResponse(404, { error: "set_not_found" });

  // E34 Phase 1 — `answers` JSONB widened into the SELECT so the dashboard's
  // per-respondent drill-down (RespondentDetailModal) can render which
  // questions each respondent got wrong. The column has existed since
  // E3.1 (migration 20260426000000_attempt_answers.sql) and is already
  // persisted by /api/finish-edu-attempt — we just weren't exposing it.
  const { data: rows, error: rowsErr } = await supabase
    .from("attempts")
    .select(
      "id, share_id, respondent_name, respondent_email, final_score, percentile, total_time_ms, created_at, answers",
    )
    .eq("test_set_id", setId)
    .not("respondent_name", "is", null)
    .order("created_at", { ascending: false });
  if (rowsErr) {
    console.error("results-data rows lookup", { set_id: setId, message: rowsErr.message });
    return jsonResponse(500, { error: "lookup_failed" });
  }

  const respondentRows: RespondentRow[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    share_id: r.share_id as string,
    respondent_name: r.respondent_name as string,
    respondent_email: r.respondent_email as string,
    final_score: r.final_score as number,
    percentile: r.percentile as number,
    total_time_ms: r.total_time_ms as number,
    created_at: r.created_at as string,
    // Raw JSONB pass-through. Parsing + shape validation happens client-side
    // via `parseAnswers()` at the drill-down render boundary, so a malformed
    // historical row degrades to "Detail nedostupný" instead of failing
    // the entire dashboard load.
    answers: r.answers ?? null,
  }));

  const stats = computeAggregate(
    respondentRows.map((r) => r.final_score),
    setRow.passing_threshold,
  );

  return jsonResponse(200, {
    set_id: setId,
    creator_label: setRow.creator_label ?? null,
    passing_threshold: setRow.passing_threshold,
    question_count: setRow.question_ids.length,
    collects_responses: setRow.collects_responses,
    rows: respondentRows,
    stats,
  });
}

export const __test__ = {
  computeAggregate,
  bucket,
  median,
  readCookie,
};
