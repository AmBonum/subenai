import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestGet, __test__ } from "../../functions/api/tests/export-sessions";
import { __test__ as security__test__ } from "../../functions/_lib/security";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  SUPABASE_ANON_KEY: "anon_stub",
};

const OWNER_ID = "11111111-2222-3333-4444-555555555555";
const TEST_ID = "ttt-uuid-1111";

function buildRequest(opts?: {
  testId?: string | null;
  authToken?: string | null;
  ip?: string;
  origin?: string | null;
}) {
  const headers: Record<string, string> = {
    "cf-connecting-ip": opts?.ip ?? "203.0.113.42",
  };
  if (opts?.authToken !== null) {
    headers.authorization = `Bearer ${opts?.authToken ?? "user-jwt-stub"}`;
  }
  if (opts?.origin !== null) {
    headers.origin = opts?.origin ?? "https://subenai.sk";
  }
  const tid = opts?.testId === null ? "" : (opts?.testId ?? TEST_ID);
  const qs = tid.length > 0 ? `?testId=${encodeURIComponent(tid)}` : "";
  return new Request(`https://subenai.sk/api/tests/export-sessions${qs}`, {
    method: "GET",
    headers,
  });
}

interface StubSession {
  id: string;
  intake_data: Record<string, string> | null;
  status: string;
  score: number | null;
  started_at: string;
  finished_at: string | null;
  segment: string | null;
  ip_hash: string | null;
}

interface StubState {
  user?: { id: string; email: string } | null;
  userErr?: boolean;
  testRow?: {
    id: string;
    slug: string | null;
    owner_id: string;
  } | null;
  testLookupError?: string;
  sessions?: StubSession[];
  sessionsError?: string;
  /** Force a runtime error on the audit insert. */
  auditError?: string;
}

function stubAll(state: StubState) {
  const auditInserts: Array<Record<string, unknown>> = [];
  const sessionsCalls: Array<{ url: string }> = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    if (url.includes("/auth/v1/user")) {
      if (state.userErr) return new Response("{}", { status: 401 });
      const user = state.user ?? { id: OWNER_ID, email: "author@example.com" };
      return new Response(JSON.stringify({ id: user.id, email: user.email }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/tests?") && method === "GET") {
      if (state.testLookupError) {
        return new Response(JSON.stringify({ message: state.testLookupError }), { status: 400 });
      }
      const row =
        state.testRow === undefined
          ? { id: TEST_ID, slug: "fun-test", owner_id: OWNER_ID }
          : state.testRow;
      return new Response(JSON.stringify(row === null ? [] : [row]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/sessions?") && method === "GET") {
      sessionsCalls.push({ url });
      if (state.sessionsError) {
        return new Response(JSON.stringify({ message: state.sessionsError }), { status: 400 });
      }
      return new Response(JSON.stringify(state.sessions ?? []), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/audit_log") && method === "POST") {
      if (state.auditError) {
        return new Response(JSON.stringify({ message: state.auditError }), { status: 400 });
      }
      const parsed = JSON.parse((init?.body as string) ?? "{}");
      auditInserts.push(parsed);
      return new Response("[]", { status: 201 });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });
  return { auditInserts, sessionsCalls };
}

function makeSession(over: Partial<StubSession> = {}): StubSession {
  const defaults: StubSession = {
    id: "sess-1",
    intake_data: { name: "Jano Vzor", email: "jano@example.com" },
    status: "completed",
    score: 87,
    started_at: "2026-05-22T10:00:00.000Z",
    finished_at: "2026-05-22T10:05:30.000Z",
    segment: null,
    ip_hash: "abc123def456",
  };
  return { ...defaults, ...over };
}

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("GET /api/tests/export-sessions", () => {
  it("401 unauthorized when no Authorization header", async () => {
    const r = await onRequestGet({ request: buildRequest({ authToken: null }), env });
    expect(r.status).toBe(401);
  });

  it("403 forbidden_origin when Origin and Referer are absent", async () => {
    const r = await onRequestGet({ request: buildRequest({ origin: null }), env });
    expect(r.status).toBe(403);
    const body = await r.json();
    expect(body.error).toBe("forbidden_origin");
  });

  it("403 forbidden_origin when Origin is a third-party host", async () => {
    const r = await onRequestGet({
      request: buildRequest({ origin: "https://attacker.example" }),
      env,
    });
    expect(r.status).toBe(403);
  });

  it("400 invalid_shape when testId is missing", async () => {
    const r = await onRequestGet({ request: buildRequest({ testId: null }), env });
    expect(r.status).toBe(400);
  });

  it("403 not_owner when the test belongs to someone else", async () => {
    stubAll({ testRow: { id: TEST_ID, slug: "x", owner_id: "different-owner" } });
    const r = await onRequestGet({ request: buildRequest(), env });
    expect(r.status).toBe(403);
    const body = await r.json();
    expect(body.error).toBe("not_owner");
  });

  it("404 test_not_found when the test doesn't exist", async () => {
    stubAll({ testRow: null });
    const r = await onRequestGet({ request: buildRequest(), env });
    expect(r.status).toBe(404);
  });

  it("200 OK happy path: BOM + header row + N data rows + headers", async () => {
    const { auditInserts } = stubAll({
      sessions: [
        makeSession({ id: "sess-a" }),
        makeSession({
          id: "sess-b",
          intake_data: null,
          status: "in_progress",
          score: null,
          finished_at: null,
        }),
      ],
    });
    const r = await onRequestGet({ request: buildRequest(), env });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("content-disposition")).toMatch(
      /^attachment; filename="sessions-fun-test-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(r.headers.get("x-total-capped")).toBeNull();
    // Leading BOM — Response.text() strips it per WHATWG decode, so we
    // inspect the raw bytes via arrayBuffer() to verify the BOM ships.
    const bytes = new Uint8Array(await r.clone().arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    const body = await r.text();
    const lines = body.split("\r\n");
    // header + 2 data rows + trailing empty (\r\n at end)
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(
      "session_id,respondent_name,respondent_email,status,score,started_at,finished_at,duration_seconds,segment,ip_hash_last6",
    );
    expect(lines[1].startsWith("sess-a,Jano Vzor,jano@example.com,completed,87,")).toBe(true);
    expect(lines[1].endsWith(",def456")).toBe(true);
    // sess-b has null intake_data + null score + null finished_at → blank
    // name, email, score, finished_at, duration cells. started_at + ip_hash
    // remain.
    expect(lines[2]).toBe("sess-b,,,in_progress,,2026-05-22T10:00:00.000Z,,,,def456");

    // Audit row
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0].action).toBe("test.export_csv");
    expect(auditInserts[0].pii_access).toBe(true);
    expect(auditInserts[0].target_id).toBe(TEST_ID);
    expect((auditInserts[0].details as { row_count: number }).row_count).toBe(2);
    expect((auditInserts[0].details as { capped: boolean }).capped).toBe(false);
  });

  it("caps at MAX_ROWS and sets X-Total-Capped: true", async () => {
    const tooMany: StubSession[] = Array.from({ length: __test__.MAX_ROWS + 5 }, (_, i) =>
      makeSession({ id: `sess-${i}` }),
    );
    const { auditInserts } = stubAll({ sessions: tooMany });
    const r = await onRequestGet({ request: buildRequest(), env });
    expect(r.status).toBe(200);
    expect(r.headers.get("x-total-capped")).toBe("true");
    const body = await r.text();
    const lines = body.split("\r\n");
    // header + MAX_ROWS data + trailing ""
    expect(lines).toHaveLength(__test__.MAX_ROWS + 2);
    expect((auditInserts[0].details as { capped: boolean }).capped).toBe(true);
  });

  it("429 author_daily_cap on the (perAuthorLimit+1)-th export", async () => {
    stubAll({ sessions: [] });
    // First-cap is the per-IP-per-hour layer; bump it past the per-author
    // cap to ensure we hit the author limiter not the IP one.
    const big = { ...env, E49_EXPORTS_PER_IP_PER_HOUR: "10000" };
    for (let i = 0; i < __test__.DEFAULT_PER_AUTHOR_PER_DAY; i++) {
      const r = await onRequestGet({ request: buildRequest(), env: big });
      expect(r.status).toBe(200);
    }
    const blocked = await onRequestGet({ request: buildRequest(), env: big });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("author_daily_cap");
  });

  it("429 rate_limited_ip on the (perIpLimit+1)-th export from the same IP", async () => {
    stubAll({ sessions: [] });
    // Bump author limit past the IP limit so the IP cap fires first.
    const big = { ...env, E49_EXPORTS_PER_AUTHOR_PER_DAY: "10000" };
    for (let i = 0; i < __test__.DEFAULT_PER_IP_PER_HOUR; i++) {
      const r = await onRequestGet({ request: buildRequest({ ip: "198.51.100.5" }), env: big });
      expect(r.status).toBe(200);
    }
    const blocked = await onRequestGet({
      request: buildRequest({ ip: "198.51.100.5" }),
      env: big,
    });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("rate_limited_ip");
  });

  it("escapes CSV-injection in respondent_name (leading-quote sentinel)", async () => {
    stubAll({
      sessions: [
        makeSession({
          id: "sess-x",
          intake_data: { name: '=HYPERLINK("http://evil","x")', email: "v@example.com" },
        }),
      ],
    });
    const r = await onRequestGet({ request: buildRequest(), env });
    const body = await r.text();
    const dataLine = body.split("\r\n")[1];
    // Cell contains a comma -> wrapped in quotes; first char of the
    // payload was `=` so the helper prefixes `'` before quoting.
    expect(dataLine).toContain(',"\'=HYPERLINK(""http://evil"",""x"")",');
  });

  it("safeSlug helper falls back when slug is empty/null", () => {
    expect(__test__.safeSlug(null, "test")).toBe("test");
    expect(__test__.safeSlug("Ahoj Svet 😀", "test")).toBe("ahoj-svet");
    expect(__test__.safeSlug("a/b\\c", "test")).toBe("a-b-c");
  });

  it("durationSeconds returns blank when finished_at is null", () => {
    expect(__test__.durationSeconds("2026-05-22T10:00:00Z", null)).toBe("");
    expect(__test__.durationSeconds("2026-05-22T10:00:00Z", "2026-05-22T10:00:30Z")).toBe("30");
    // Reverse order — defensive zero/blank.
    expect(__test__.durationSeconds("2026-05-22T10:01:00Z", "2026-05-22T10:00:00Z")).toBe("");
  });

  it("ipHashLast6 returns the last 6 chars and blank when null", () => {
    expect(__test__.ipHashLast6(null)).toBe("");
    expect(__test__.ipHashLast6("abc123def456")).toBe("def456");
  });
});
