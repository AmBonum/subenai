// E8.2 — POST /api/test-sets
// Create a Composer test set: validate question IDs against the live
// QUESTIONS bundle, rate-limit per IP, INSERT into Supabase.
//
// Why a CF Pages Function instead of letting the browser INSERT
// directly via the anon key:
//   1. AC-6 requires server-side check that every question_id exists
//      in the current bundle. The browser's word about that is
//      worthless if a malicious client tampers with the request.
//   2. AC-7 requires per-IP rate limiting. We use the same in-memory
//      bucket as `portal-magic-link` (functions/_lib/security.ts).
//
// The CHECK constraints in the migration are the second line of
// defence and would catch e.g. a label longer than 80 chars even if
// this Function were bypassed.

import { createClient } from "@supabase/supabase-js";
import {
  validateComposerConfig,
  COMPOSER_LIMITS,
  type ComposerConfig,
} from "../../src/lib/quiz/composer";
import { ipRateLimit, readClientIp, parsePositiveInt } from "../_lib/security";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TEST_SETS_PER_IP_PER_MIN?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface CreateBody {
  question_ids?: unknown;
  passing_threshold?: unknown;
  max_questions?: unknown;
  creator_label?: unknown;
  source_pack_slugs?: unknown;
  // E12.2 — education mode (opt-in author-collected responses).
  collects_responses?: unknown;
  author_password?: unknown;
}

interface CreateResponse {
  id?: string;
  url?: string;
  results_url?: string;
  error?: string;
  detail?: string;
}

const AUTHOR_PASSWORD_MIN_LEN = 8;
const AUTHOR_PASSWORD_MAX_LEN = 128;

const DEFAULT_RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60;

function jsonResponse(status: number, body: CreateResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  const ip = readClientIp(request);
  const limit = parsePositiveInt(env.TEST_SETS_PER_IP_PER_MIN, DEFAULT_RATE_LIMIT);
  if (!ipRateLimit.consume(`test-sets:${ip}`, limit, RATE_WINDOW_SECONDS)) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (
    !isStringArray(body.question_ids) ||
    typeof body.passing_threshold !== "number" ||
    typeof body.max_questions !== "number" ||
    (body.creator_label !== undefined &&
      body.creator_label !== null &&
      typeof body.creator_label !== "string") ||
    (body.source_pack_slugs !== undefined &&
      body.source_pack_slugs !== null &&
      !isStringArray(body.source_pack_slugs)) ||
    (body.collects_responses !== undefined &&
      body.collects_responses !== null &&
      typeof body.collects_responses !== "boolean") ||
    (body.author_password !== undefined &&
      body.author_password !== null &&
      typeof body.author_password !== "string")
  ) {
    return jsonResponse(400, { error: "invalid_shape" });
  }

  const config: ComposerConfig = {
    questionIds: body.question_ids,
    passingThreshold: body.passing_threshold,
    maxQuestions: body.max_questions,
    creatorLabel: typeof body.creator_label === "string" ? body.creator_label : undefined,
    sourcePackSlugs: isStringArray(body.source_pack_slugs) ? body.source_pack_slugs : undefined,
  };

  const validation = validateComposerConfig(config);
  if (!validation.ok) {
    return jsonResponse(400, { error: validation.reason, detail: validation.detail });
  }

  // Education mode — when collects_responses=true, author_password is mandatory
  // (mirrors the test_sets_pwd_required_when_collecting CHECK constraint).
  // Plain password is sent over HTTPS and immediately bcrypt-hashed via the
  // Supabase RPC (`hash_test_set_password`, SECURITY DEFINER). The hash is
  // what we INSERT — plain never lands in any table or log.
  const collectsResponses = body.collects_responses === true;
  const authorPassword = typeof body.author_password === "string" ? body.author_password : null;

  if (collectsResponses) {
    if (!authorPassword) {
      return jsonResponse(400, { error: "password_required" });
    }
    if (
      authorPassword.length < AUTHOR_PASSWORD_MIN_LEN ||
      authorPassword.length > AUTHOR_PASSWORD_MAX_LEN
    ) {
      return jsonResponse(400, { error: "password_length" });
    }
  } else if (authorPassword) {
    // Defensive: don't accept a password without the toggle (would store an
    // unused hash and surprise the author when /results doesn't open).
    return jsonResponse(400, { error: "password_without_collects" });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let authorPasswordHash: string | null = null;
  if (collectsResponses && authorPassword) {
    const { data: hashData, error: hashError } = await supabase.rpc("hash_test_set_password", {
      password: authorPassword,
    });
    if (hashError || typeof hashData !== "string") {
      console.error("test-sets hash_test_set_password", { ip, message: hashError?.message });
      return jsonResponse(500, { error: "hash_failed" });
    }
    authorPasswordHash = hashData;
  }

  const { data, error } = await supabase
    .from("test_sets")
    .insert({
      question_ids: config.questionIds,
      passing_threshold: config.passingThreshold,
      max_questions: config.maxQuestions,
      creator_label: config.creatorLabel ?? null,
      source_pack_slugs: config.sourcePackSlugs ?? null,
      collects_responses: collectsResponses,
      author_password_hash: authorPasswordHash,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("test-sets insert", { ip, message: error?.message });
    return jsonResponse(500, { error: "insert_failed" });
  }

  const url = `/test/builder/${data.id}`;
  const response: CreateResponse = { id: data.id as string, url };
  if (collectsResponses) {
    response.results_url = `${url}/results`;
  }
  return jsonResponse(200, response);
}

export const __test__ = {
  COMPOSER_LIMITS,
  DEFAULT_RATE_LIMIT,
  RATE_WINDOW_SECONDS,
  AUTHOR_PASSWORD_MIN_LEN,
  AUTHOR_PASSWORD_MAX_LEN,
};
