import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost } from "../../functions/api/delete-edu-respondent";
import { signEduAuthorToken, signEduAttemptToken } from "../../functions/_lib/jwt";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  JWT_SECRET: "test-secret",
};

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

function buildRequest(body: unknown, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = `subenai_edu_author=${cookie}`;
  return new Request("https://subenai.sk/api/delete-edu-respondent", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

interface DeleteState {
  rowExists: boolean;
  auditFails?: boolean;
}

interface CapturedRequest {
  url: string;
  method: string;
  body: unknown;
}

const captured: { current: CapturedRequest[] } = { current: [] };

function mockSupabase(state: DeleteState) {
  captured.current = [];
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method =
      (init?.method ?? (typeof input !== "string" ? (input as Request).method : "GET")) || "GET";
    let body: unknown = null;
    try {
      const raw =
        init?.body ?? (typeof input !== "string" ? await (input as Request).clone().text() : null);
      body = typeof raw === "string" && raw.length > 0 ? JSON.parse(raw) : raw;
    } catch {
      body = null;
    }
    captured.current.push({ url, method, body });
    if (url.includes("/rest/v1/audit_log")) {
      if (state.auditFails) {
        return new Response(JSON.stringify({ message: "audit insert failed" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), { status: 201 });
    }
    if (url.includes("/rest/v1/attempts")) {
      if (!state.rowExists) {
        return new Response(JSON.stringify(null), { status: 200 });
      }
      return new Response(JSON.stringify({ id: VALID_UUID }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not stubbed", { status: 500 });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/delete-edu-respondent", () => {
  it("happy path returns 200 ok", async () => {
    mockSupabase({ rowExists: true });
    const cookieToken = await signEduAuthorToken("set-1", env.JWT_SECRET);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: VALID_UUID }, cookieToken),
      env,
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
  });

  it("401 no_session without cookie", async () => {
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: VALID_UUID }),
      env,
    });
    expect(r.status).toBe(401);
  });

  it("401 token_wrong_role when cookie carries a respondent (attempt) token", async () => {
    // An attempt-issued JWT (E12.3) must NOT be usable for deleting rows.
    const wrongToken = await signEduAttemptToken(
      { set_id: "set-1", name: "x", email: "x@x.sk" },
      env.JWT_SECRET,
    );
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: VALID_UUID }, wrongToken),
      env,
    });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("token_wrong_role");
  });

  it("403 set_mismatch when body set_id != cookie set_id", async () => {
    const cookieToken = await signEduAuthorToken("set-cookie", env.JWT_SECRET);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-other", attempt_id: VALID_UUID }, cookieToken),
      env,
    });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("set_mismatch");
  });

  it("400 invalid_attempt_id on non-UUID input", async () => {
    const cookieToken = await signEduAuthorToken("set-1", env.JWT_SECRET);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: "not-a-uuid" }, cookieToken),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_attempt_id");
  });

  it("404 attempt_not_found when DELETE matched no rows", async () => {
    mockSupabase({ rowExists: false });
    const cookieToken = await signEduAuthorToken("set-1", env.JWT_SECRET);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: VALID_UUID }, cookieToken),
      env,
    });
    expect(r.status).toBe(404);
  });

  // Regression sentinel: /schools "Krok 4" promises "potvrdenie + audit log"
  // on respondent delete. The audit-log call MUST follow every successful
  // DELETE. Until 2026-05-19 the audit insert was missing; this test pins
  // the GDPR Art. 30 obligation against silent regression.
  it("writes audit_log row with PII flag on successful delete (regression: /schools Krok 4 promise)", async () => {
    mockSupabase({ rowExists: true });
    const cookieToken = await signEduAuthorToken("set-1", env.JWT_SECRET);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: VALID_UUID }, cookieToken),
      env,
    });
    expect(r.status).toBe(200);
    const auditCalls = captured.current.filter(
      (c) => c.url.includes("/rest/v1/audit_log") && c.method === "POST",
    );
    expect(auditCalls).toHaveLength(1);
    const row = auditCalls[0].body as Record<string, unknown>;
    expect(row.action).toBe("delete_edu_respondent");
    expect(row.target_type).toBe("attempt");
    expect(row.target_id).toBe(VALID_UUID);
    expect(row.pii_access).toBe(true);
    expect(row.actor_id).toBeNull();
    expect(String(row.actor_name)).toBe("edu_author:set-1");
    expect(row.details).toEqual({ set_id: "set-1" });
  });

  it("500 audit_failed when audit insert errors after successful delete", async () => {
    // Failure mode kept distinct from delete_failed so the operator can
    // tell whether the row is gone (it IS) vs not (it wasn't). Retries
    // hit the 404 path; no double-delete risk.
    mockSupabase({ rowExists: true, auditFails: true });
    const cookieToken = await signEduAuthorToken("set-1", env.JWT_SECRET);
    const r = await onRequestPost({
      request: buildRequest({ set_id: "set-1", attempt_id: VALID_UUID }, cookieToken),
      env,
    });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toBe("audit_failed");
  });
});
