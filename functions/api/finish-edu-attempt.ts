// E12.3 — INSERT an edu attempt row using a service-role token.
//
// Anon Supabase INSERT is blocked for rows with respondent_* set
// (migration 20260501010000), so this Function is the only path that
// can persist an edu attempt. We require a valid HS256 JWT issued by
// /api/begin-edu-attempt within the last 60 minutes; the token's claims
// are the source of truth for respondent_name + respondent_email + set_id.
// The browser never gets to choose any of those.

import { createClient } from "@supabase/supabase-js";
import { ipRateLimit, readClientIp, parsePositiveInt } from "../_lib/security";
import { verifyEduAttemptToken } from "../_lib/jwt";
import type { Database, Json } from "../../src/integrations/supabase/types";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  EDU_FINISH_PER_IP_PER_5MIN?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface FinishBody {
  token?: unknown;
  share_id?: unknown;
  final_score?: unknown;
  base_score?: unknown;
  total_penalty?: unknown;
  percentile?: unknown;
  personality?: unknown;
  breakdown?: unknown;
  insights?: unknown;
  stats?: unknown;
  flags?: unknown;
  answers?: unknown;
  total_time_ms?: unknown;
}

interface FinishResponse {
  share_id?: string;
  attempt_id?: string;
  error?: string;
}

const DEFAULT_PER_IP_PER_5MIN = 6;
const SHARE_ID_REGEX = /^[A-Z0-9]{6,12}$/;

function jsonResponse(status: number, body: FinishResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function isJson(value: unknown): value is Json {
  return value === null || ["string", "number", "boolean", "object"].includes(typeof value);
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.JWT_SECRET) {
    return jsonResponse(500, { error: "jwt_not_configured" });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const ip = readClientIp(request);
  const perIp = parsePositiveInt(env.EDU_FINISH_PER_IP_PER_5MIN, DEFAULT_PER_IP_PER_5MIN);
  if (!ipRateLimit.consume(`finish-edu:${ip}`, perIp, 5 * 60)) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  let body: FinishBody;
  try {
    body = (await request.json()) as FinishBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (typeof body.token !== "string") {
    return jsonResponse(400, { error: "missing_token" });
  }

  const verification = await verifyEduAttemptToken(body.token, env.JWT_SECRET);
  if (!verification.ok) {
    return jsonResponse(401, { error: `token_${verification.reason}` });
  }
  const { set_id: setId, name, email } = verification.claims;

  if (
    typeof body.share_id !== "string" ||
    !SHARE_ID_REGEX.test(body.share_id) ||
    typeof body.final_score !== "number" ||
    typeof body.base_score !== "number" ||
    typeof body.total_penalty !== "number" ||
    typeof body.percentile !== "number" ||
    typeof body.personality !== "string" ||
    typeof body.total_time_ms !== "number" ||
    !isJson(body.breakdown) ||
    !isJson(body.insights) ||
    !isJson(body.stats) ||
    !isJson(body.flags) ||
    !isJson(body.answers)
  ) {
    return jsonResponse(400, { error: "invalid_shape" });
  }

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  type AttemptInsert = Database["public"]["Tables"]["attempts"]["Insert"];
  const insertRow: AttemptInsert = {
    share_id: body.share_id,
    nickname: null,
    final_score: body.final_score,
    base_score: body.base_score,
    total_penalty: body.total_penalty,
    percentile: body.percentile,
    personality: body.personality,
    breakdown: body.breakdown as Json,
    insights: body.insights as Json,
    stats: body.stats as Json,
    flags: body.flags as Json,
    answers: body.answers as Json,
    total_time_ms: body.total_time_ms,
    test_set_id: setId,
    respondent_name: name,
    respondent_email: email,
  };

  const { data, error } = await supabase
    .from("attempts")
    .insert(insertRow)
    .select("id, share_id")
    .single();

  if (error || !data) {
    // Most common: respondent already finished (unique-on-replay attempt
    // would re-insert but we don't have a unique constraint per email; the
    // begin endpoint blocks dupes upfront. Constraint violation here would
    // be the email regex / name length, both already client-validated.)
    console.error("finish-edu-attempt insert", { ip, set_id: setId, message: error?.message });
    return jsonResponse(500, { error: "insert_failed" });
  }

  return jsonResponse(200, { share_id: data.share_id, attempt_id: data.id });
}

export const __test__ = {
  DEFAULT_PER_IP_PER_5MIN,
  SHARE_ID_REGEX,
};
