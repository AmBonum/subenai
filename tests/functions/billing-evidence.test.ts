import { beforeEach, describe, expect, it, vi } from "vitest";

import { onRequestPost } from "../../functions/api/billing/evidence";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = { SUPABASE_SERVICE_ROLE_KEY: "service_stub", SUPABASE_ANON_KEY: "anon_stub" };
const OWNER = "11111111-2222-4333-8444-555555555555";
const TEST_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const ACTIVE_SUB = {
  plan: "start",
  status: "active",
  respondent_cap: 25,
  current_period_start: "2026-01-01T00:00:00Z",
  current_period_end: "2099-01-01T00:00:00Z",
};

interface State {
  user?: string | null;
  test?: { id: string; title: string; version: number; owner_id: string } | null;
  subs?: unknown[];
  sessions?: Array<{ id: string; intake_data: unknown; score: number; finished_at: string }>;
  reports?: Array<{ session_ids: string[] }>;
}

function session(id: string, score = 80) {
  return { id, intake_data: { name: `R ${id}` }, score, finished_at: "2026-10-01T08:00:00Z" };
}

function stub(state: State) {
  const inserts: Record<string, unknown[]> = {};
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = init?.method ?? "GET";
    const ok = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    if (url.includes("/auth/v1/user")) {
      if (state.user === null) return new Response("{}", { status: 401 });
      return ok({ id: state.user ?? OWNER, email: "it@firma.sk" });
    }
    if (method === "POST") {
      const table = url.split("/rest/v1/")[1].split("?")[0];
      (inserts[table] ??= []).push(JSON.parse((init?.body as string) ?? "{}"));
      return new Response("[]", { status: 201 });
    }
    if (url.includes("/rest/v1/tests?")) {
      const t =
        state.test === undefined
          ? { id: TEST_ID, title: "Falošná faktúra", version: 2, owner_id: OWNER }
          : state.test;
      return ok(t ? [t] : []);
    }
    if (url.includes("/rest/v1/org_subscriptions?")) return ok(state.subs ?? [ACTIVE_SUB]);
    if (url.includes("/rest/v1/sessions?"))
      return ok(state.sessions ?? [session("s1"), session("s2", 50)]);
    if (url.includes("/rest/v1/evidence_reports?")) return ok(state.reports ?? []);
    return new Response("not stubbed: " + url, { status: 500 });
  });
  return inserts;
}

function request(
  body: unknown = { testId: TEST_ID, orgName: "Firma s.r.o." },
  origin = "https://subenai.sk",
) {
  return new Request("https://subenai.sk/api/billing/evidence", {
    method: "POST",
    headers: {
      origin,
      authorization: "Bearer jwt",
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.9",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("POST /api/billing/evidence", () => {
  it("403 for a third-party origin", async () => {
    stub({});
    const r = await onRequestPost({ request: request(undefined, "https://attacker.example"), env });
    expect(r.status).toBe(403);
  });

  it("401 without a valid session", async () => {
    stub({ user: null });
    expect((await onRequestPost({ request: request(), env })).status).toBe(401);
  });

  it("400 when the organisation name is missing", async () => {
    stub({});
    const r = await onRequestPost({ request: request({ testId: TEST_ID, orgName: " " }), env });
    expect(await r.json()).toEqual({ error: "invalid_org_name" });
  });

  it("403 when the test belongs to someone else", async () => {
    stub({
      test: {
        id: TEST_ID,
        title: "x",
        version: 1,
        owner_id: "99999999-2222-4333-8444-555555555555",
      },
    });
    const r = await onRequestPost({ request: request(), env });
    expect(r.status).toBe(403);
  });

  it("402 no_plan for a free account, without persisting anything", async () => {
    const inserts = stub({ subs: [] });
    const r = await onRequestPost({ request: request(), env });
    expect(r.status).toBe(402);
    expect(await r.json()).toMatchObject({ error: "no_plan" });
    expect(inserts.evidence_reports).toBeUndefined();
  });

  it("402 cap_exceeded with the numbers the UI needs", async () => {
    stub({
      sessions: [session("new1"), session("new2")],
      reports: [{ session_ids: Array.from({ length: 24 }, (_, i) => `old${i}`) }],
    });
    const r = await onRequestPost({ request: request(), env });
    expect(r.status).toBe(402);
    expect(await r.json()).toMatchObject({
      error: "cap_exceeded",
      cap: 25,
      used: 24,
      requested: 2,
    });
  });

  it("422 when nobody finished the test yet", async () => {
    stub({ sessions: [] });
    expect((await onRequestPost({ request: request(), env })).status).toBe(422);
  });

  it("200 persists the report and an audit row; already-counted respondents are free", async () => {
    const inserts = stub({ reports: [{ session_ids: ["s1"] }] });
    const r = await onRequestPost({ request: request(), env });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { report: Record<string, unknown>; allowance: unknown };
    expect(body.report).toMatchObject({
      orgName: "Firma s.r.o.",
      respondentCount: 2,
      passedCount: 1,
    });
    expect(body.allowance).toEqual({ cap: 25, used: 2 });
    expect(inserts.evidence_reports?.[0]).toMatchObject({
      owner_id: OWNER,
      test_id: TEST_ID,
      session_ids: ["s1", "s2"],
      content_sha256: body.report.sha256,
    });
    expect(inserts.audit_log?.[0]).toMatchObject({
      action: "test.evidence_report",
      pii_access: true,
    });
  });
});
