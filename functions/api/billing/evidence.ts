import { createClient } from "@supabase/supabase-js";

import { authenticateUser } from "../../_lib/auth-user";
import {
  buildEvidenceReport,
  isFirstPartyRequest,
  json,
  normalizeOrgName,
  readBearer,
  type EvidenceSession,
} from "../../_lib/billing";
import { consumeDailyQuota, ipRateLimit, readClientIp } from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";
import {
  evaluateEvidenceAccess,
  getPlan,
  type OrgSubscription,
} from "../../../src/lib/billing/plans";

interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const MAX_SESSIONS = 2000;
const PER_IP_PER_HOUR = 60;
const PER_USER_PER_DAY = 100;

export async function onRequestPost({ request, env }: RequestContext): Promise<Response> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return json(500, { error: "not_configured" });
  }
  if (!isFirstPartyRequest(request)) return json(403, { error: "forbidden_origin" });
  if (!ipRateLimit.consume(`billing-evidence:${readClientIp(request)}`, PER_IP_PER_HOUR, 3600)) {
    return json(429, { error: "rate_limited" }, 3600);
  }

  const user = await authenticateUser(readBearer(request), env.SUPABASE_ANON_KEY);
  if (!user) return json(401, { error: "unauthorized" });
  if (!consumeDailyQuota(`billing-evidence:${user.id}`, PER_USER_PER_DAY)) {
    return json(429, { error: "rate_limited" });
  }

  let raw: { testId?: unknown; orgName?: unknown };
  try {
    raw = (await request.json()) as typeof raw;
  } catch {
    return json(400, { error: "invalid_payload" });
  }
  const testId = typeof raw.testId === "string" ? raw.testId.trim() : "";
  const orgName = normalizeOrgName(typeof raw.orgName === "string" ? raw.orgName : null);
  if (!testId || testId.length > 64) return json(400, { error: "invalid_test" });
  if (!orgName) return json(400, { error: "invalid_org_name" });

  const db = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: test, error: testErr } = await db
    .from("tests")
    .select("id, title, version, owner_id")
    .eq("id", testId)
    .maybeSingle();
  if (testErr) return json(500, { error: "lookup_failed" });
  if (!test) return json(404, { error: "test_not_found" });
  if ((test as { owner_id: string }).owner_id !== user.id) return json(403, { error: "not_owner" });

  const { data: subs, error: subErr } = await db
    .from("org_subscriptions")
    .select("plan, status, respondent_cap, current_period_start, current_period_end")
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1);
  if (subErr) return json(500, { error: "lookup_failed" });
  const sub = (subs?.[0] ?? null) as OrgSubscription | null;

  const { data: sessionRows, error: sessErr } = await db
    .from("sessions")
    .select("id, intake_data, score, finished_at")
    .eq("test_id", testId)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: true })
    .limit(MAX_SESSIONS);
  if (sessErr) return json(500, { error: "fetch_failed" });
  const sessions = (sessionRows ?? []) as EvidenceSession[];
  if (sessions.length === 0) return json(422, { error: "no_finished_sessions" });

  const counted = new Set<string>();
  if (sub) {
    const { data: reports, error: repErr } = await db
      .from("evidence_reports")
      .select("session_ids")
      .eq("owner_id", user.id)
      .gte("created_at", sub.current_period_start);
    if (repErr) return json(500, { error: "lookup_failed" });
    for (const r of (reports ?? []) as { session_ids: string[] }[]) {
      for (const id of r.session_ids) counted.add(id);
    }
  }
  const requested = sessions.filter((s) => !counted.has(s.id)).length;

  const access = evaluateEvidenceAccess(sub, counted.size, requested, new Date());
  if (!access.allowed) return json(402, { ...access, error: access.reason });

  const t = test as { id: string; title: string; version: number };
  const report = await buildEvidenceReport({
    id: crypto.randomUUID(),
    orgName,
    testTitle: t.title,
    testVersion: t.version,
    generatedAt: new Date().toISOString(),
    sessions,
  });

  const { error: insErr } = await db.from("evidence_reports").insert({
    id: report.id,
    owner_id: user.id,
    test_id: t.id,
    test_title: report.testTitle,
    test_version: report.testVersion,
    org_name: report.orgName,
    session_ids: sessions.map((s) => s.id),
    respondent_count: report.respondentCount,
    passed_count: report.passedCount,
    content_sha256: report.sha256,
    created_at: report.generatedAt,
  });
  if (insErr) {
    console.error("billing-evidence insert", { message: insErr.message });
    return json(500, { error: "persist_failed" });
  }

  const { error: auditErr } = await db.from("audit_log").insert({
    actor_id: user.id,
    actor_name: null,
    action: "test.evidence_report",
    target_type: "test",
    target_id: t.id,
    pii_access: true,
    details: { report_id: report.id, respondent_count: report.respondentCount },
  });
  if (auditErr) console.error("billing-evidence audit_log", { message: auditErr.message });

  return json(200, {
    report,
    plan: getPlan(sub?.plan ?? "")?.name ?? null,
    allowance: { cap: access.cap, used: access.cap - access.remaining },
  });
}
