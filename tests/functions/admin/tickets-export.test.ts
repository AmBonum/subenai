import { describe, it, expect, vi, beforeEach } from "vitest";

import { onRequestPost, csvEscapeCell } from "../../../functions/api/admin/tickets-export";
import { __test__ as security__test__ } from "../../../functions/_lib/security";

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_ANON_KEY: "anon_stub",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
};

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN_EMAIL = "admin@subenai.test";

function fakeJwt(sub: string, aal: "aal1" | "aal2" = "aal2"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "abc" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payload = btoa(JSON.stringify({ sub, aal, email: ADMIN_EMAIL }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${payload}.sig`;
}

const ADMIN_JWT = fakeJwt(ADMIN_ID, "aal2");
const ADMIN_JWT_AAL1 = fakeJwt(ADMIN_ID, "aal1");
const USER_JWT = fakeJwt("user-bbbb-2222", "aal1");

const SAMPLE_TICKET = {
  id: "00000000-0000-0000-0000-000000000001",
  created_at: "2026-05-22T08:00:00Z",
  updated_at: "2026-05-22T09:00:00Z",
  status: "new",
  category: "bug",
  subject: "Test ticket subject",
  body: "This is the ticket body content.",
  submitter_name: "Ján Novák",
  submitter_email: "jan@example.sk",
  assigned_admin_name: null,
  attachment_count: 0,
};

interface MockState {
  authUserId?: string | null;
  appMetadata?: Record<string, unknown>;
  hasAdminRole?: boolean;
  roleError?: boolean;
  queryRows?: unknown[];
  queryError?: boolean;
  auditInsertSpy?: ReturnType<typeof vi.fn<() => void>>;
}

function mockFetch(state: MockState) {
  const auditInsertSpy = state.auditInsertSpy ?? vi.fn<() => void>();

  return {
    fetchSpy: vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes("/auth/v1/user")) {
        if (state.authUserId === null) {
          return new Response(JSON.stringify({ msg: "invalid" }), { status: 401 });
        }
        return new Response(
          JSON.stringify({
            id: state.authUserId ?? ADMIN_ID,
            email: ADMIN_EMAIL,
            app_metadata: state.appMetadata ?? {},
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/rest/v1/rpc/has_role")) {
        if (state.roleError) return new Response("err", { status: 500 });
        return new Response(JSON.stringify(state.hasAdminRole ?? true), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/rest/v1/support_tickets")) {
        if (state.queryError) {
          return new Response(
            JSON.stringify({ code: "42P01", message: "relation does not exist" }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        const rows = state.queryRows ?? [SAMPLE_TICKET];
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-range": `0-${rows.length - 1}/*`,
          },
        });
      }

      if (url.includes("/rest/v1/audit_log")) {
        auditInsertSpy();
        return new Response("[]", { status: 201 });
      }

      return new Response("not stubbed: " + url, { status: 500 });
    }),
    auditInsertSpy,
  };
}

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://subenai.sk/api/admin/tickets-export", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID_BODY = { scope: "all" };

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

// ── Unit: csvEscapeCell ────────────────────────────────────────────────────

describe("csvEscapeCell", () => {
  it("returns empty string for null/undefined", () => {
    expect(csvEscapeCell(null)).toBe("");
    expect(csvEscapeCell(undefined)).toBe("");
  });

  it("passes through plain strings unchanged", () => {
    expect(csvEscapeCell("hello world")).toBe("hello world");
  });

  it("wraps in quotes when value contains a comma", () => {
    expect(csvEscapeCell("test,quote")).toBe('"test,quote"');
  });

  it("escapes internal double-quotes per RFC 4180", () => {
    expect(csvEscapeCell('test,quote"foo')).toBe('"test,quote""foo"');
  });

  it("wraps in quotes when value contains a newline", () => {
    expect(csvEscapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("prefixes = (formula injection) with single quote", () => {
    expect(csvEscapeCell("=SUM(1+2)")).toBe("'=SUM(1+2)");
  });

  it("prefixes + with single quote", () => {
    expect(csvEscapeCell("+1234")).toBe("'+1234");
  });

  it("prefixes - with single quote", () => {
    expect(csvEscapeCell("-1234")).toBe("'-1234");
  });

  it("prefixes @ with single quote", () => {
    expect(csvEscapeCell("@SUM")).toBe("'@SUM");
  });

  it("formula injection value with comma is quoted after prefix", () => {
    // =HYPERLINK(url,label) → should be prefixed then quoted because of comma
    expect(csvEscapeCell('=HYPERLINK("http://x.com","click")')).toBe(
      `"'=HYPERLINK(""http://x.com"",""click"")"`,
    );
  });
});

// ── Auth checks ────────────────────────────────────────────────────────────

describe("POST /api/admin/tickets-export — auth", () => {
  it("returns 401 when no Authorization header", async () => {
    const r = await onRequestPost({ request: buildRequest(VALID_BODY), env });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("not_authenticated");
  });

  it("returns 401 when JWT rejected by Supabase", async () => {
    mockFetch({ authUserId: null });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("not_authenticated");
  });

  it("returns 403 when caller is not admin (user role)", async () => {
    mockFetch({ hasAdminRole: false });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${USER_JWT}` }),
      env,
    });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("not_admin");
  });

  it("returns 403 when admin JWT has aal1 (not aal2)", async () => {
    mockFetch({ hasAdminRole: true });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT_AAL1}` }),
      env,
    });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("aal2_required");
  });

  it("accepts an aal1 admin JWT with a fresh app_metadata.aal2_via_backup_until stamp", async () => {
    mockFetch({
      hasAdminRole: true,
      appMetadata: {
        aal2_via_backup_until: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      },
      queryRows: [],
    });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT_AAL1}` }),
      env,
    });
    expect(r.status).toBe(200);
  });
});

// ── Validation ─────────────────────────────────────────────────────────────

describe("POST /api/admin/tickets-export — validation", () => {
  it("returns 400 when scope is missing", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest({ filters: {} }, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("scope_required");
  });

  it("returns 400 when scope=selected but selectedIds is absent", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest({ scope: "selected" }, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("selected_ids_required");
  });

  it("returns 400 when scope=selected but selectedIds is empty array", async () => {
    mockFetch({});
    const r = await onRequestPost({
      request: buildRequest(
        { scope: "selected", selectedIds: [] },
        { authorization: `Bearer ${ADMIN_JWT}` },
      ),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("selected_ids_required");
  });

  it("returns 400 bulk_size_exceeded when selectedIds.length > 100", async () => {
    mockFetch({});
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    const r = await onRequestPost({
      request: buildRequest(
        { scope: "selected", selectedIds: ids },
        { authorization: `Bearer ${ADMIN_JWT}` },
      ),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("bulk_size_exceeded");
  });

  it("returns 400 on invalid JSON body", async () => {
    const r = await onRequestPost({
      request: new Request("https://subenai.sk/api/admin/tickets-export", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ADMIN_JWT}` },
        body: "not json",
      }),
      env,
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("invalid_json");
  });
});

// ── Rate limiting ──────────────────────────────────────────────────────────

describe("POST /api/admin/tickets-export — rate limit", () => {
  it("returns 429 on the second request within 60 seconds", async () => {
    mockFetch({});
    const headers = { authorization: `Bearer ${ADMIN_JWT}` };

    const r1 = await onRequestPost({ request: buildRequest(VALID_BODY, headers), env });
    expect(r1.status).toBe(200);

    mockFetch({});
    const r2 = await onRequestPost({ request: buildRequest(VALID_BODY, headers), env });
    expect(r2.status).toBe(429);
    expect((await r2.json()).error).toBe("rate_limited");
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────

describe("POST /api/admin/tickets-export — happy path", () => {
  it("returns 200 with correct CSV headers on success", async () => {
    mockFetch({ queryRows: [SAMPLE_TICKET] });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("content-disposition")).toMatch(/attachment; filename="ziadosti-podpory-/);
    // UTF-8 BOM check via raw bytes: TextDecoder strips the BOM on decode
    // (correct per WHATWG spec), so we verify the 3 BOM bytes are present at
    // the start of the ArrayBuffer rather than in the decoded string.
    const buf = await r.clone().arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0xef); // UTF-8 BOM byte 1
    expect(bytes[1]).toBe(0xbb); // UTF-8 BOM byte 2
    expect(bytes[2]).toBe(0xbf); // UTF-8 BOM byte 3
    const text = await r.text();
    expect(text).toContain("id,vytvorené,aktualizované,stav,kategória");
  });

  it("includes the correct row count", async () => {
    const tickets = [
      SAMPLE_TICKET,
      { ...SAMPLE_TICKET, id: "00000000-0000-0000-0000-000000000002" },
    ];
    mockFetch({ queryRows: tickets });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(200);
    const lines = (await r.text()).trim().split("\r\n");
    // BOM + header + 2 data rows
    expect(lines).toHaveLength(3);
  });

  it("returns only header row for empty result set", async () => {
    mockFetch({ queryRows: [] });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(200);
    const text = await r.text();
    const lines = text.trim().split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("id,vytvorené");
  });

  it("renders status and category as Slovak labels", async () => {
    mockFetch({ queryRows: [{ ...SAMPLE_TICKET, status: "resolved", category: "gdpr" }] });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    const text = await r.text();
    expect(text).toContain("Vyriešená");
    expect(text).toContain("GDPR a ochrana údajov");
  });

  it("properly escapes CSV special characters in subject", async () => {
    mockFetch({
      queryRows: [{ ...SAMPLE_TICKET, subject: 'test,quote"foo' }],
    });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    const text = await r.text();
    expect(text).toContain('"test,quote""foo"');
  });

  it("prefixes formula injection payload with single quote", async () => {
    mockFetch({
      queryRows: [{ ...SAMPLE_TICKET, subject: "=SUM(1+2)" }],
    });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    const text = await r.text();
    expect(text).toContain("'=SUM(1+2)");
  });

  it("truncates body to 500 chars and appends ellipsis", async () => {
    const longBody = "A".repeat(600);
    mockFetch({ queryRows: [{ ...SAMPLE_TICKET, body: longBody }] });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    const text = await r.text();
    expect(text).toContain("A".repeat(500) + "…");
    expect(text).not.toContain("A".repeat(501) + "…");
  });

  it("replaces CRLF in body with literal \\n to keep one row per ticket", async () => {
    mockFetch({ queryRows: [{ ...SAMPLE_TICKET, body: "line1\r\nline2\nline3" }] });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    const text = await r.text();
    expect(text).toContain("line1\\nline2\\nline3");
  });

  it("inserts an audit_log row on success", async () => {
    const auditInsertSpy = vi.fn();
    mockFetch({ auditInsertSpy });
    const r = await onRequestPost({
      request: buildRequest(VALID_BODY, { authorization: `Bearer ${ADMIN_JWT}` }),
      env,
    });
    expect(r.status).toBe(200);
    // Flush microtask queue for fire-and-forget
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auditInsertSpy).toHaveBeenCalled();
  });
});
