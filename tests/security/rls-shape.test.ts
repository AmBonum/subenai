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
  // `insert(...).select().single()` and `update(...).select()` chains call
  // `.select()` on the builder. Record it so mutation tests can introspect.
  builder.select = (...args: unknown[]) => {
    record("select", args);
    return builder;
  };
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
  useHistory,
  useUserTeamMembers,
} from "@/lib/platform/queries";
import {
  useAdminQuestions,
  useAdminUsers,
  useAdminDSRQueue,
  useAdminAuditLog,
  useAdminReports,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateAnswerSet,
  useUpdateAnswerSet,
  useDeleteAnswerSet,
  useCreateAnswer,
  useUpdateAnswer,
  useDeleteAnswer,
  useCreateTest,
  useUpdateTest,
  useDeleteTest,
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

function insertPayload(): Record<string, unknown> | null {
  const entry = log.current.calls.find((c) => c.op === "insert");
  if (!entry) return null;
  const payload = entry.args[0];
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

function updatePayload(): Record<string, unknown> | null {
  const entry = log.current.calls.find((c) => c.op === "update");
  if (!entry) return null;
  const payload = entry.args[0];
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

function fromCalls(): string[] {
  return log.current.calls.filter((c) => c.op === "from").map((c) => String(c.args[0] ?? ""));
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
    // AH-12 enrichment fires follow-up lookups (profiles, answers, reports);
    // the primary read is still the first from()/select() pair.
    expect(fromCalls()).toContain("questions");
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
    // AH-12 enrichment resolves target labels via follow-up lookups; the
    // primary read is still the first from()/select() pair.
    expect(fromCalls()).toContain("reports");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("target_type");
    expect(cols).toContain("reason");
  });
});

// ---------------------------------------------------------------------------
// Admin mutation shapes — same defense-in-depth as the reads. The DB enforces
// RLS; these tests guarantee the client cannot bypass it accidentally by
// targeting the wrong table, dropping the `.eq("id", id)` filter on
// update/delete (would mutate every row visible under RLS), or smuggling
// extra columns into insert payloads (the table grants on PG schemas reject
// unknown columns, but a typed `as never` cast can hide regressions).
// ---------------------------------------------------------------------------

describe("RLS shape contracts — admin mutations", () => {
  it("useCreateQuestion inserts into `questions` with a bounded payload (no created_by override)", async () => {
    const { result } = renderHook(() => useCreateQuestion(), { wrapper });
    await result.current.mutateAsync({ body: "What is phishing?" });
    expect(log.current.table).toBe("questions");
    const payload = insertPayload();
    expect(payload).not.toBeNull();
    expect(payload!.prompt).toBe("What is phishing?");
    // RLS sets `created_by` via auth.uid(); client must not override.
    expect(payload).not.toHaveProperty("created_by");
    expect(payload).not.toHaveProperty("owner_id");
  });

  it("useUpdateQuestion targets `questions` with mandatory .eq('id', id)", async () => {
    const { result } = renderHook(() => useUpdateQuestion(), { wrapper });
    await result.current.mutateAsync({ id: "q-1", patch: { body: "updated" } });
    expect(log.current.table).toBe("questions");
    expect(hasCall("update")).toBe(true);
    const idFilter = eqCalls().find(([col]) => col === "id");
    expect(idFilter).toBeDefined();
    expect(idFilter?.[1]).toBe("q-1");
    const payload = updatePayload();
    expect(payload?.prompt).toBe("updated");
  });

  it("useDeleteQuestion DELETE on `questions` carries mandatory .eq('id', id)", async () => {
    const { result } = renderHook(() => useDeleteQuestion(), { wrapper });
    await result.current.mutateAsync("q-9");
    expect(log.current.table).toBe("questions");
    expect(hasCall("delete")).toBe(true);
    const idFilter = eqCalls().find(([col]) => col === "id");
    expect(idFilter).toBeDefined();
    expect(idFilter?.[1]).toBe("q-9");
  });

  it("useCreateAnswerSet inserts into `answer_sets` with bounded payload", async () => {
    const { result } = renderHook(() => useCreateAnswerSet(), { wrapper });
    await result.current.mutateAsync({ name: "Hostile e-mails" });
    expect(log.current.table).toBe("answer_sets");
    const payload = insertPayload();
    expect(payload!.name).toBe("Hostile e-mails");
    expect(payload).not.toHaveProperty("owner_id");
  });

  it("useUpdateAnswerSet targets `answer_sets` with .eq('id', id)", async () => {
    const { result } = renderHook(() => useUpdateAnswerSet(), { wrapper });
    await result.current.mutateAsync({ id: "as-3", patch: { name: "renamed" } });
    expect(log.current.table).toBe("answer_sets");
    expect(hasCall("update")).toBe(true);
    expect(eqCalls().find(([c]) => c === "id")?.[1]).toBe("as-3");
    expect(updatePayload()?.name).toBe("renamed");
  });

  it("useDeleteAnswerSet DELETE carries mandatory .eq('id', id)", async () => {
    const { result } = renderHook(() => useDeleteAnswerSet(), { wrapper });
    await result.current.mutateAsync("as-9");
    expect(log.current.table).toBe("answer_sets");
    expect(hasCall("delete")).toBe(true);
    expect(eqCalls().find(([c]) => c === "id")?.[1]).toBe("as-9");
  });

  it("useCreateAnswer inserts into `answers` with set_id from input (FK enforced by RLS)", async () => {
    const { result } = renderHook(() => useCreateAnswer(), { wrapper });
    await result.current.mutateAsync({ set_id: "as-1", text: "Option A" });
    expect(log.current.table).toBe("answers");
    const payload = insertPayload();
    expect(payload!.set_id).toBe("as-1");
    expect(payload!.text).toBe("Option A");
    expect(payload!.is_correct).toBe(false);
  });

  it("useUpdateAnswer targets `answers` with .eq('id', id)", async () => {
    const { result } = renderHook(() => useUpdateAnswer(), { wrapper });
    await result.current.mutateAsync({ id: "a-2", patch: { text: "edited" } });
    expect(log.current.table).toBe("answers");
    expect(hasCall("update")).toBe(true);
    expect(eqCalls().find(([c]) => c === "id")?.[1]).toBe("a-2");
    expect(updatePayload()?.text).toBe("edited");
  });

  it("useDeleteAnswer DELETE carries mandatory .eq('id', id)", async () => {
    const { result } = renderHook(() => useDeleteAnswer(), { wrapper });
    await result.current.mutateAsync("a-7");
    expect(log.current.table).toBe("answers");
    expect(hasCall("delete")).toBe(true);
    expect(eqCalls().find(([c]) => c === "id")?.[1]).toBe("a-7");
  });

  it("useCreateTest inserts into `tests` with caller-passed owner_id (admin contract)", async () => {
    // SECURITY NOTE: owner_id IS user-controlled at this layer, but the
    // mutation is admin-only and the DB grants gate the INSERT. The test
    // pins the current contract — a future tightening that forces
    // auth.uid() server-side would update this assertion.
    const { result } = renderHook(() => useCreateTest(), { wrapper });
    await result.current.mutateAsync({ owner_id: "admin-x", title: "New Test" });
    expect(log.current.table).toBe("tests");
    const payload = insertPayload();
    expect(payload!.owner_id).toBe("admin-x");
    expect(payload!.title).toBe("New Test");
    // share_id must be a UUID (crypto.randomUUID) — never user-controlled.
    expect(String(payload!.share_id)).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("useUpdateTest targets `tests` with .eq('id', id), patch never includes owner_id", async () => {
    const { result } = renderHook(() => useUpdateTest(), { wrapper });
    await result.current.mutateAsync({
      id: "t-1",
      // @ts-expect-error — verifying client drops unknown fields from patch.
      patch: { title: "Renamed", owner_id: "attacker" },
    });
    expect(log.current.table).toBe("tests");
    expect(hasCall("update")).toBe(true);
    expect(eqCalls().find(([c]) => c === "id")?.[1]).toBe("t-1");
    const payload = updatePayload();
    expect(payload?.title).toBe("Renamed");
    // Ownership transfer via update is a privilege-escalation vector — the
    // client filters to a known column whitelist, so owner_id must NOT
    // appear in the UPDATE payload even if attacker smuggles it in.
    expect(payload).not.toHaveProperty("owner_id");
  });

  it("useDeleteTest DELETE carries mandatory .eq('id', id)", async () => {
    const { result } = renderHook(() => useDeleteTest(), { wrapper });
    await result.current.mutateAsync("t-9");
    expect(log.current.table).toBe("tests");
    expect(hasCall("delete")).toBe(true);
    expect(eqCalls().find(([c]) => c === "id")?.[1]).toBe("t-9");
  });
});

// ---------------------------------------------------------------------------
// Cross-table joins — when the client manually composes a join (parallel
// query + map-merge instead of a PostgREST embed), each leg's column
// projection MUST stay bounded. A `select("*")` on the joined-to table
// would leak PII columns from a table the original RLS path never gates.
// ---------------------------------------------------------------------------

describe("RLS shape contracts — cross-table join column whitelists", () => {
  it("useHistory first leg (sessions) has a bounded projection with no PII columns", async () => {
    const { result } = renderHook(() => useHistory(50), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The mocked sessions response is empty, so the tests-table follow-up
    // is gated off by `if (ids.length)`. Locking the first leg's shape
    // is what guards client-side PII exposure regardless.
    expect(fromCalls()[0]).toBe("sessions");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("test_id");
    expect(cols).toContain("score");
    expect(cols).not.toMatch(/respondent_email/);
    expect(cols).not.toMatch(/respondent_name/);
  });

  it("useUserTeamMembers first leg (team_members) bounded; no `*` projection", async () => {
    const { result } = renderHook(() => useUserTeamMembers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromCalls()).toContain("team_members");
    const cols = selectArgs();
    expect(cols).not.toBe("*");
    expect(cols).toContain("team_id");
    expect(cols).toContain("user_id");
    expect(cols).toContain("role");
  });

  it("useUserSessions: no `respondent_email`/`respondent_name` columns in the projection", async () => {
    const { result } = renderHook(() => useUserSessions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cols = selectArgs();
    // The view used here is attempts_anon-style — even if a future refactor
    // joins respondents, the projection must stay PII-stripped at the
    // CLIENT layer. RLS is defense in depth, not the sole gate.
    expect(cols).not.toMatch(/respondent_email/);
    expect(cols).not.toMatch(/respondent_name/);
  });
});
