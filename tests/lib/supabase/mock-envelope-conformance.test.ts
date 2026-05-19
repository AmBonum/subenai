import { describe, expect, it } from "vitest";

import {
  applyParsedQuery,
  buildPostgrestArrayResponse,
  buildPostgrestSingleResponse,
  buildSupabaseErrorResponse,
  parsePostgrestFilters,
} from "../../../e2e/mocks/supabase/envelope";

/**
 * Canary suite for the Playwright Supabase mock's response envelope.
 *
 * The Playwright suite never actually talks to Supabase; it talks to
 * `mockSupabase` (e2e/mocks/supabase/index.ts) which forges responses
 * that look like PostgREST. If Supabase ever changes its response
 * envelope (Content-Range header format, single-row 406 status, error
 * payload keys), this canary fails and tells us to update the mock
 * BEFORE the real E2E suite goes red against the new client.
 *
 * Each block tests one envelope contract that supabase-js depends on
 * and is documented in the PostgREST + GoTrue API references.
 */

describe("buildPostgrestArrayResponse", () => {
  it("returns 200 + application/json by default", () => {
    const res = buildPostgrestArrayResponse([{ id: "a" }]);
    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(res.body)).toEqual([{ id: "a" }]);
  });

  it("emits Content-Range when withCount is set", () => {
    const res = buildPostgrestArrayResponse([{ id: "a" }, { id: "b" }, { id: "c" }], {
      withCount: true,
    });
    expect(res.headers["Content-Range"]).toBe("0-2/3");
  });

  it("emits Content-Range: 0-0/0 for empty paginated result", () => {
    const res = buildPostgrestArrayResponse([], { withCount: true });
    expect(res.headers["Content-Range"]).toBe("0-0/0");
  });

  it("respects an explicit total when paging", () => {
    const res = buildPostgrestArrayResponse([{ id: "x" }], {
      withCount: true,
      total: 50,
      offset: 10,
    });
    expect(res.headers["Content-Range"]).toBe("10-10/50");
  });
});

describe("buildPostgrestSingleResponse", () => {
  it("returns 200 + pgrst.object mime when a row is present", () => {
    const res = buildPostgrestSingleResponse({ id: "a", title: "Hello" });
    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toBe("application/vnd.pgrst.object+json");
    expect(JSON.parse(res.body)).toEqual({ id: "a", title: "Hello" });
  });

  it("returns 406 with PGRST116 payload when no row matches", () => {
    const res = buildPostgrestSingleResponse(null);
    expect(res.status).toBe(406);
    const payload = JSON.parse(res.body);
    expect(payload.code).toBe("PGRST116");
    expect(payload.message).toMatch(/multiple|no/i);
  });
});

describe("buildSupabaseErrorResponse", () => {
  it("returns the documented {code, message, details, hint} envelope", () => {
    const res = buildSupabaseErrorResponse({
      status: 401,
      code: "42501",
      message: "forbidden",
    });
    expect(res.status).toBe(401);
    expect(res.headers["Content-Type"]).toBe("application/json");
    const payload = JSON.parse(res.body);
    expect(payload).toEqual({
      code: "42501",
      message: "forbidden",
      details: null,
      hint: null,
    });
  });

  it("preserves optional details and hint", () => {
    const res = buildSupabaseErrorResponse({
      status: 400,
      code: "PGRST100",
      message: "bad request",
      details: "column missing",
      hint: "check your select",
    });
    const payload = JSON.parse(res.body);
    expect(payload.details).toBe("column missing");
    expect(payload.hint).toBe("check your select");
  });
});

describe("parsePostgrestFilters", () => {
  it("returns empty parse for an empty query string", () => {
    const parsed = parsePostgrestFilters("");
    expect(parsed.predicates).toHaveLength(0);
    expect(parsed.select).toBeNull();
  });

  it("parses eq.<value> as an equality predicate", () => {
    const parsed = parsePostgrestFilters("?id=eq.abc");
    const out = applyParsedQuery([{ id: "abc" }, { id: "xyz" }], parsed);
    expect(out).toEqual([{ id: "abc" }]);
  });

  it("parses in.(<a>,<b>) as a set predicate", () => {
    const parsed = parsePostgrestFilters("?status=in.(draft,published)");
    const out = applyParsedQuery(
      [{ status: "draft" }, { status: "archived" }, { status: "published" }],
      parsed,
    );
    expect(out).toEqual([{ status: "draft" }, { status: "published" }]);
  });

  it("captures select, limit, offset, and order metadata", () => {
    const parsed = parsePostgrestFilters(
      "?select=id,title&limit=10&offset=20&order=created_at.desc",
    );
    expect(parsed.select).toBe("id,title");
    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(20);
    expect(parsed.order).toEqual({ column: "created_at", ascending: false });
  });

  it("combines multiple predicates with AND semantics", () => {
    const parsed = parsePostgrestFilters("?owner_id=eq.u1&status=eq.published");
    const out = applyParsedQuery(
      [
        { owner_id: "u1", status: "draft" },
        { owner_id: "u1", status: "published" },
        { owner_id: "u2", status: "published" },
      ],
      parsed,
    );
    expect(out).toEqual([{ owner_id: "u1", status: "published" }]);
  });

  it("handles is.null", () => {
    const parsed = parsePostgrestFilters("?deleted_at=is.null");
    const out = applyParsedQuery([{ deleted_at: null }, { deleted_at: "2026-01-01" }], parsed);
    expect(out).toEqual([{ deleted_at: null }]);
  });
});
