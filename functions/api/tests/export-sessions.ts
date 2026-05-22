// E49.4 — CSV export of the sessions list for a given test.
//
// Owner-only egress path for respondent data. Centralizing the export in a
// CF function instead of building the CSV in the browser gives us a single
// audited, rate-limited, injection-safe channel for PII leaving the system
// (D9 in tasks/PLAN-2026-05-22-E49). Any client-side `Blob`-builder would
// bypass the audit row + injection defense + same-origin enforcement.
//
// Pipeline:
//   1. Same-origin check via Origin/Referer (defense-in-depth alongside the
//      Supabase JWT; raw bearer cookies are not in play here).
//   2. Auth: Supabase JWT via the Authorization: Bearer header (matches
//      send-invites.ts).
//   3. Per-IP/hour + per-author/day rate limits.
//   4. Owner check on the requested test_id.
//   5. Fetch up to MAX_ROWS sessions ordered by started_at desc.
//   6. Serialize rows via the shared injection-safe CSV helper.
//   7. Write ONE audit_log row (action='test.export_csv', pii_access=true)
//      regardless of how many rows the export contained.
//   8. Stream the body with a BOM + Content-Disposition attachment header.

import { createClient } from "@supabase/supabase-js";

import { serializeCsv } from "../../_lib/csv";
import {
  ipRateLimit,
  readClientIp,
  consumeDailyQuota,
  parsePositiveInt,
} from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  /** Optional overrides. Defaults below match the E49 spec. */
  E49_EXPORTS_PER_AUTHOR_PER_DAY?: string;
  E49_EXPORTS_PER_IP_PER_HOUR?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const DEFAULT_PER_AUTHOR_PER_DAY = 50;
const DEFAULT_PER_IP_PER_HOUR = 100;
const PER_IP_WINDOW_S = 60 * 60;

// Cap to bound memory + audit-row size. Owners with >5000 sessions get the
// most recent 5000 and the X-Total-Capped header so the client can prompt
// for narrower filters / a paginated future export.
const MAX_ROWS = 5000;

// Allowed origins for the same-origin check. Anything else is rejected
// outright so a third-party page can't kick off a CSV export by inducing
// the browser to GET this endpoint with cookies.
const ALLOWED_ORIGIN_HOSTS = new Set(["subenai.sk", "www.subenai.sk", "localhost"]);

const CSV_HEADERS = [
  "session_id",
  "respondent_name",
  "respondent_email",
  "status",
  "score",
  "started_at",
  "finished_at",
  "duration_seconds",
  "segment",
  "ip_hash_last6",
] as const;

interface SessionRow {
  id: string;
  intake_data: Record<string, unknown> | null;
  status: string | null;
  score: number | null;
  started_at: string;
  finished_at: string | null;
  segment: string | null;
  ip_hash: string | null;
}

function readAuthHeader(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/);
  return m ? m[1] : null;
}

function jsonError(status: number, error: string, retryAfter?: number): Response {
  const headers: HeadersInit = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  if (retryAfter !== undefined) headers["retry-after"] = String(retryAfter);
  return new Response(JSON.stringify({ error }), { status, headers });
}

function checkSameOrigin(request: Request): boolean {
  // GETs aren't bound by CSRF tokens but we still keep this endpoint
  // first-party. An Origin/Referer absent or mismatched -> deny. Bearer
  // tokens in the Authorization header are not auto-sent cross-site, but
  // future code paths could move to cookies; cheap to enforce now.
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin ?? referer;
  if (!candidate) return false;
  try {
    const u = new URL(candidate);
    return ALLOWED_ORIGIN_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function safeSlug(input: string | null | undefined, fallback: string): string {
  const s = (input ?? "").trim().toLowerCase();
  const cleaned = s.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 60) : fallback;
}

function durationSeconds(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "";
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "";
  return String(Math.round((end - start) / 1000));
}

function ipHashLast6(ipHash: string | null): string {
  if (!ipHash) return "";
  return ipHash.slice(-6);
}

export async function onRequestGet(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return jsonError(500, "supabase_not_configured");
  }

  if (!checkSameOrigin(request)) {
    return jsonError(403, "forbidden_origin");
  }

  const url = new URL(request.url);
  const testId = (url.searchParams.get("testId") ?? "").trim();
  if (!testId || testId.length > 64) {
    return jsonError(400, "invalid_shape");
  }

  const userJwt = readAuthHeader(request);
  if (!userJwt) return jsonError(401, "unauthorized");

  const userClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonError(401, "unauthorized");
  const ownerId = userData.user.id;

  const ip = readClientIp(request);
  const perIpLimit = parsePositiveInt(env.E49_EXPORTS_PER_IP_PER_HOUR, DEFAULT_PER_IP_PER_HOUR);
  const perAuthorLimit = parsePositiveInt(
    env.E49_EXPORTS_PER_AUTHOR_PER_DAY,
    DEFAULT_PER_AUTHOR_PER_DAY,
  );
  if (!ipRateLimit.consume(`export-sessions:ip:${ip}`, perIpLimit, PER_IP_WINDOW_S)) {
    return jsonError(429, "rate_limited_ip", PER_IP_WINDOW_S);
  }
  if (!consumeDailyQuota(`export-sessions:author:${ownerId}`, perAuthorLimit)) {
    return jsonError(429, "author_daily_cap");
  }

  const serviceClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Owner check up-front. RLS would also filter the sessions query below,
  // but failing fast with a 403 is friendlier than returning an empty CSV
  // for someone else's test.
  const { data: testRow, error: testErr } = await serviceClient
    .from("tests")
    .select("id, slug, owner_id")
    .eq("id", testId)
    .maybeSingle();
  if (testErr) {
    console.error("export-sessions tests lookup", { test_id: testId, message: testErr.message });
    return jsonError(500, "lookup_failed");
  }
  if (!testRow) return jsonError(404, "test_not_found");
  const test = testRow as { id: string; slug: string | null; owner_id: string };
  if (test.owner_id !== ownerId) return jsonError(403, "not_owner");

  // Fetch up to MAX_ROWS + 1 so we can detect capping. Order by started_at
  // desc — newest sessions first so the export is "the last N if capped".
  const { data: sessionsData, error: sessErr } = await serviceClient
    .from("sessions")
    .select("id, intake_data, status, score, started_at, finished_at, segment, ip_hash")
    .eq("test_id", testId)
    .order("started_at", { ascending: false })
    .limit(MAX_ROWS + 1);
  if (sessErr) {
    console.error("export-sessions sessions fetch", {
      test_id: testId,
      message: sessErr.message,
    });
    return jsonError(500, "fetch_failed");
  }

  const allRows = (sessionsData ?? []) as SessionRow[];
  const capped = allRows.length > MAX_ROWS;
  const rows = capped ? allRows.slice(0, MAX_ROWS) : allRows;

  const dataRows: unknown[][] = rows.map((s) => {
    const intake = (s.intake_data ?? {}) as Record<string, unknown>;
    const name = typeof intake.name === "string" ? intake.name : "";
    const email = typeof intake.email === "string" ? intake.email : "";
    return [
      s.id,
      name,
      email,
      s.status ?? "",
      s.score == null ? "" : s.score,
      s.started_at,
      s.finished_at ?? "",
      durationSeconds(s.started_at, s.finished_at),
      s.segment ?? "",
      ipHashLast6(s.ip_hash),
    ];
  });

  const csv = serializeCsv([CSV_HEADERS, ...dataRows], { bom: true });

  // Audit row — one per export request regardless of row count. pii_access
  // is true because the body carries respondent name + email.
  const { error: auditErr } = await serviceClient.from("audit_log").insert({
    actor_id: ownerId,
    actor_name: null,
    action: "test.export_csv",
    target_type: "test",
    target_id: test.id,
    pii_access: true,
    details: { row_count: rows.length, capped },
  });
  if (auditErr) {
    console.error("export-sessions audit_log insert", {
      test_id: testId,
      message: auditErr.message,
    });
    // Non-fatal: the export already produced; failing here would
    // leak a server-side hiccup to the user without protecting anything.
  }

  const today = new Date().toISOString().slice(0, 10);
  const filename = `sessions-${safeSlug(test.slug, "test")}-${today}.csv`;
  const headers: HeadersInit = {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "no-store",
  };
  if (capped) headers["X-Total-Capped"] = "true";

  return new Response(csv, { status: 200, headers });
}

export const __test__ = {
  DEFAULT_PER_AUTHOR_PER_DAY,
  DEFAULT_PER_IP_PER_HOUR,
  PER_IP_WINDOW_S,
  MAX_ROWS,
  CSV_HEADERS,
  ALLOWED_ORIGIN_HOSTS,
  safeSlug,
  durationSeconds,
  ipHashLast6,
  checkSameOrigin,
};
