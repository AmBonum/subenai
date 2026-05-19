// Phase 9b — client-side RLS shape contracts. Phase 10 (pgTAP) will verify
// actual policy enforcement against the database; these tests are defense in
// depth that fails fast in CI when a developer accidentally drops an owner /
// user filter or widens a column whitelist to `*`.
//
// Each test mounts a query hook against a recording stub of
// `@/integrations/supabase/client` that captures the PostgREST chain
// (`from(...).select(...).eq(...).order(...).maybeSingle()` etc.) into a
// flat call log. Assertions inspect that log to verify:
//   1. Correct table is targeted.
//   2. No `.select("*")` against tenant-scoped tables.
//   3. Explicit user-id filter where the code is responsible for it (e.g.
//      `useMarkAllRead`, `useCurrentProfile`).
//   4. Limited column projection on admin reads against PII-bearing tables.
//
// What this DOES NOT prove: that RLS actually enforces the policy in
// production. A passing test only confirms the client SENDS the right
// request. Real enforcement is Phase 10.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

interface CallRecord {
  op: string;
  args: unknown[];
}

interface QueryLog {
  table: string | null;
  calls: CallRecord[];
}

const log: { current: QueryLog } = { current: { table: null, calls: [] } };

function resetLog(): void {
  log.current = { table: null, calls: [] };
}

function record(op: string, args: unknown[]): void {
  log.current.calls.push({ op, args });
}

// Default settled response. Hooks under test return `data ?? []`, so an empty
// array keeps queryFn callers on the happy path without per-test overrides.
const defaultResolved = { data: [], error: null, count: 0 };

function makeBuilder(perCallResolved: () => unknown): unknown {
  const builder: Record<string, unknown> = {};
  const chain =
    (op: string) =>
    (...args: unknown[]) => {
      record(op, args);
      return builder;
    };
  builder.eq = chain("eq");
  builder.in = chain("in");
  builder.is = chain("is");
  builder.not = chain("not");
  builder.order = chain("order");
  builder.limit = chain("limit");
  builder.single = () => {
    record("single", []);
    return Promise.resolve(perCallResolved());
  };
  builder.maybeSingle = () => {
    record("maybeSingle", []);
    return Promise.resolve(perCallResolved());
  };
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(perCallResolved()).then(onFulfilled, onRejected);
  return builder;
}

const authUser = { id: "user-under-test" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from(table: string) {
      log.current.table = table;
      record("from", [table]);
      return {
        select(cols: string, opts?: unknown) {
          record("select", [cols, opts]);
          return makeBuilder(() => ({ ...defaultResolved }));
        },
        update(patch: unknown) {
          record("update", [patch]);
          return makeBuilder(() => ({ data: null, error: null }));
        },
        insert(values: unknown) {
          record("insert", [values]);
          return makeBuilder(() => ({ data: null, error: null }));
        },
        delete() {
          record("delete", []);
          return makeBuilder(() => ({ data: null, error: null }));
        },
      };
    },
    auth: {
      getUser: async () => ({ data: { user: authUser }, error: null }),
      getSession: async () => ({
        data: { session: { user: authUser } },
        error: null,
      }),
    },
    rpc: async () => ({ data: null, error: null }),
  },
}));

import {
  useTests,
  useUserSessions,
  useUserRespondents,
  useNotifications,
  useMarkAllRead,
  useCurrentProfile,
} from "@/lib/platform/queries";
import {
  useAdminQuestions,
  useAdminUsers,
  useAdminDSRQueue,
  useAdminAuditLog,
  useAdminReports,
} from "@/lib/admin/queries";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

function selectArgs(): string {
  const entry = log.current.calls.find((c) => c.op === "select");
  return entry ? String(entry.args[0] ?? "") : "";
}

function hasCall(op: string): boolean {
  return log.current.calls.some((c) => c.op === op);
}

function eqCalls(): Array<[string, unknown]> {
  return log.current.calls
    .filter((c) => c.op === "eq")
    .map((c) => [String(c.args[0] ?? ""), c.args[1]] as [string, unknown]);
}

beforeEach(() => {
  resetLog();
});

describe("RLS shape contracts — platform queries", () => {
  it("useTests targets `tests` with an explicit column whitelist (no select *)", async () => {
    const { result } = renderHook(() => useTests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("tests");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("owner_id");
    expect(cols).toContain("team_id");
  });

  it("useUserSessions targets `sessions` with no `.select(*)` (RLS scopes rows)", async () => {
    const { result } = renderHook(() => useUserSessions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("sessions");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("respondent_id");
  });

  it("useUserRespondents targets `respondents` with explicit columns", async () => {
    const { result } = renderHook(() => useUserRespondents(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("respondents");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("anonymized_at");
  });

  it("useNotifications targets `notifications` with bounded column list", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("notifications");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("user_id");
    expect(cols).toContain("read_at");
  });

  it("useMarkAllRead UPDATE on notifications filters by user_id (defense-in-depth)", async () => {
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });
    await result.current.mutateAsync("user-under-test");
    expect(log.current.table).toBe("notifications");
    expect(hasCall("update")).toBe(true);
    const userIdFilter = eqCalls().find(([col]) => col === "user_id");
    expect(userIdFilter).toBeDefined();
    expect(userIdFilter?.[1]).toBe("user-under-test");
    // `read_at IS NULL` clause must be present so we don't restamp already-read rows.
    expect(hasCall("is")).toBe(true);
  });

  it("useCurrentProfile filters profiles by the authenticated user id", async () => {
    const { result } = renderHook(() => useCurrentProfile(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("profiles");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    const idFilter = eqCalls().find(([col]) => col === "id");
    expect(idFilter).toBeDefined();
    expect(idFilter?.[1]).toBe(authUser.id);
    expect(hasCall("maybeSingle")).toBe(true);
  });
});

describe("RLS shape contracts — admin queries", () => {
  it("useAdminQuestions targets `questions` with a bounded column set (no PII fields)", async () => {
    const { result } = renderHook(() => useAdminQuestions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("questions");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    // `prompt` body + i18n variants are expected; no email / ip_hash leakage.
    expect(cols).toContain("prompt");
    expect(cols).not.toMatch(/\bemail\b/);
    expect(cols).not.toMatch(/\bip_hash\b/);
  });

  it("useAdminUsers projects only safe profile columns (id, email, display_name, created_at)", async () => {
    const { result } = renderHook(() => useAdminUsers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Last from() target is user_roles (parallel call). Both tables hit.
    const fromCalls = log.current.calls
      .filter((c) => c.op === "from")
      .map((c) => String(c.args[0] ?? ""));
    expect(fromCalls).toContain("profiles");
    expect(fromCalls).toContain("user_roles");
    const selects = log.current.calls
      .filter((c) => c.op === "select")
      .map((c) => String(c.args[0] ?? ""));
    expect(selects.every((c) => c !== "*")).toBe(true);
    const profilesSelect = selects.find((c) => c.includes("display_name"));
    expect(profilesSelect).toBeDefined();
    // Must not leak auth-only columns like password_hash, last_sign_in_at.
    expect(profilesSelect).not.toMatch(/password/);
    expect(profilesSelect).not.toMatch(/last_sign_in_at/);
  });

  it("useAdminDSRQueue uses a bounded column whitelist on dsr_requests", async () => {
    const { result } = renderHook(() => useAdminDSRQueue(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("dsr_requests");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("requester_email");
    expect(cols).toContain("sla_due_at");
  });

  it("useAdminAuditLog targets audit_log with explicit columns and a row limit", async () => {
    const { result } = renderHook(() => useAdminAuditLog(50), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("audit_log");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("actor_id");
    expect(cols).toContain("pii_access");
    // Limit must be applied — unbounded audit log reads are a known footgun.
    const limit = log.current.calls.find((c) => c.op === "limit");
    expect(limit).toBeDefined();
    expect(limit?.args[0]).toBe(50);
  });

  it("useAdminReports uses a bounded column whitelist on reports", async () => {
    const { result } = renderHook(() => useAdminReports(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(log.current.table).toBe("reports");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("target_type");
    expect(cols).toContain("reason");
  });
});
