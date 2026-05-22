// E49 Phase 1 — unit tests for useTestSessions + useTestSessionAnswers.
//
// Inline chainable supabase stub modelled on queries.templates.test.ts —
// each `.from(table)` call returns a fresh chain that records every
// method invocation (`select`, `eq`, `or`, `order`, `range`, `in`,
// `maybeSingle`/`single`/`then`). Tests assert the exact shape so any
// drift (e.g. losing the `test_id` eq, dropping `count: "exact"`) trips
// loudly. Per-table responses are queued via `nextResponseByTable`;
// `nextSessionsResponseQueue` lets a single test stub two distinct
// `sessions` reads in sequence (used by useTestSessions vs. its second
// invocation in the same hook test, though here each hook hits one
// table so we mostly stick to `nextResponseByTable`).

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type ChainCall = { method: string; args: unknown[] };
type ResolvedResponse = { data: unknown; error: unknown; count?: number };

type Chain = {
  __table: string;
  __calls: ChainCall[];
  __response: ResolvedResponse;
  select: (...args: unknown[]) => Chain;
  insert: (...args: unknown[]) => Chain;
  update: (...args: unknown[]) => Chain;
  delete: (...args: unknown[]) => Chain;
  eq: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  or: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  range: (...args: unknown[]) => Chain;
  maybeSingle: () => Promise<ResolvedResponse>;
  single: () => Promise<ResolvedResponse>;
  then: (onFulfilled: (v: ResolvedResponse) => unknown) => Promise<unknown>;
};

let lastChains: Chain[] = [];
let nextResponseByTable: Record<string, ResolvedResponse> = {};

function makeChain(table: string): Chain {
  const calls: ChainCall[] = [];
  const response: ResolvedResponse = nextResponseByTable[table] ?? {
    data: [],
    error: null,
    count: 0,
  };
  const chain = {
    __table: table,
    __calls: calls,
    __response: response,
  } as Partial<Chain>;
  const proxy: Chain = chain as Chain;
  const chainable =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return proxy;
    };
  proxy.select = chainable("select");
  proxy.insert = chainable("insert");
  proxy.update = chainable("update");
  proxy.delete = chainable("delete");
  proxy.eq = chainable("eq");
  proxy.in = chainable("in");
  proxy.or = chainable("or");
  proxy.order = chainable("order");
  proxy.range = chainable("range");
  proxy.maybeSingle = () => {
    calls.push({ method: "maybeSingle", args: [] });
    return Promise.resolve(response);
  };
  proxy.single = () => {
    calls.push({ method: "single", args: [] });
    return Promise.resolve(response);
  };
  proxy.then = (onFulfilled) => Promise.resolve(response).then(onFulfilled);
  lastChains.push(proxy);
  return proxy;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeChain(table),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  },
}));

import { useTestSessions, useTestSessionAnswers } from "@/lib/platform/queries";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    test_id: "test-1",
    version: 1,
    respondent_id: null,
    intake_data: { name: "Anna", email: "anna@example.com" },
    consent_given: true,
    started_at: "2026-05-01T10:00:00Z",
    finished_at: "2026-05-01T10:10:00Z",
    score: 80,
    status: "completed",
    segment: null,
    ip_hash: "abc123def456",
    ...overrides,
  };
}

beforeEach(() => {
  lastChains = [];
  nextResponseByTable = {};
});

describe("useTestSessions", () => {
  it("filters by test_id with .eq, applies range pagination, and orders by started_at desc by default", async () => {
    nextResponseByTable.sessions = {
      data: [makeSessionRow()],
      error: null,
      count: 1,
    };
    const { result } = renderHook(() => useTestSessions("test-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastChains).toHaveLength(1);
    const chain = lastChains[0];
    expect(chain.__table).toBe("sessions");

    const select = chain.__calls.find((c) => c.method === "select");
    expect(select?.args[1]).toEqual({ count: "exact" });

    const eqs = chain.__calls.filter((c) => c.method === "eq");
    expect(eqs[0].args).toEqual(["test_id", "test-1"]);

    const orders = chain.__calls.filter((c) => c.method === "order");
    expect(orders).toHaveLength(1);
    expect(orders[0].args[0]).toBe("started_at");
    expect(orders[0].args[1]).toEqual({ ascending: false });

    const range = chain.__calls.find((c) => c.method === "range");
    expect(range?.args).toEqual([0, 19]);

    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.pageCount).toBe(1);
    expect(result.current.data?.rows[0].id).toBe("sess-1");
  });

  it("applies status filter when not 'all' and supports score sort", async () => {
    nextResponseByTable.sessions = { data: [], error: null, count: 0 };
    const { result } = renderHook(
      () =>
        useTestSessions("test-1", {
          status: "completed",
          sort: "score_desc",
          page: 1,
          pageSize: 10,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const chain = lastChains[0];
    const eqs = chain.__calls.filter((c) => c.method === "eq");
    expect(eqs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["test_id", "test-1"] }),
        expect.objectContaining({ args: ["status", "completed"] }),
      ]),
    );
    const orders = chain.__calls.filter((c) => c.method === "order");
    expect(orders[0].args[0]).toBe("score");
    expect(orders[0].args[1]).toEqual({ ascending: false, nullsFirst: false });
    const range = chain.__calls.find((c) => c.method === "range");
    expect(range?.args).toEqual([10, 19]);
  });

  it("uses .or() with ilike on intake_data name/email when search is non-empty", async () => {
    nextResponseByTable.sessions = { data: [], error: null, count: 0 };
    const { result } = renderHook(() => useTestSessions("test-1", { search: "anna" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const chain = lastChains[0];
    const or = chain.__calls.find((c) => c.method === "or");
    expect(or).toBeDefined();
    const orArg = or!.args[0] as string;
    expect(orArg).toContain("intake_data->>name.ilike.%anna%");
    expect(orArg).toContain("intake_data->>email.ilike.%anna%");
  });

  it("does NOT issue a chain when testId is undefined (enabled=false)", async () => {
    const { result } = renderHook(() => useTestSessions(undefined), { wrapper });
    // The query is disabled; data stays undefined and no chain is built.
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(lastChains).toHaveLength(0);
  });

  it("computes pageCount from total + pageSize", async () => {
    nextResponseByTable.sessions = { data: [], error: null, count: 47 };
    const { result } = renderHook(() => useTestSessions("test-1", { pageSize: 10 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(47);
    expect(result.current.data?.pageCount).toBe(5);
  });

  it("surfaces supabase errors via isError", async () => {
    nextResponseByTable.sessions = { data: null, error: { message: "rls_denied" } };
    const { result } = renderHook(() => useTestSessions("test-1"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useTestSessionAnswers", () => {
  it("fetches answers then joins questions by id, merging in memory", async () => {
    // Override `from` to dispatch by table so we can return distinct payloads.
    nextResponseByTable.session_answers = {
      data: [
        { question_id: "q-1", value: "a", is_correct: true, time_ms: 1500 },
        { question_id: "q-2", value: "b", is_correct: false, time_ms: 2200 },
      ],
      error: null,
    };
    nextResponseByTable.questions = {
      data: [
        {
          id: "q-1",
          prompt: "What is X?",
          type: "single",
          options: ["a", "b"],
          correct: [0],
        },
        // q-2 intentionally missing → must still be returned with question=null
      ],
      error: null,
    };
    const { result } = renderHook(() => useTestSessionAnswers("sess-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastChains).toHaveLength(2);
    expect(lastChains[0].__table).toBe("session_answers");
    const answersEq = lastChains[0].__calls.find((c) => c.method === "eq");
    expect(answersEq?.args).toEqual(["session_id", "sess-1"]);

    expect(lastChains[1].__table).toBe("questions");
    const inCall = lastChains[1].__calls.find((c) => c.method === "in");
    expect(inCall?.args[0]).toBe("id");
    expect(inCall?.args[1]).toEqual(expect.arrayContaining(["q-1", "q-2"]));

    const merged = result.current.data ?? [];
    expect(merged).toHaveLength(2);
    const q1 = merged.find((r) => r.question_id === "q-1");
    const q2 = merged.find((r) => r.question_id === "q-2");
    expect(q1?.question?.prompt).toBe("What is X?");
    expect(q1?.is_correct).toBe(true);
    expect(q2?.question).toBeNull();
    expect(q2?.is_correct).toBe(false);
  });

  it("skips the questions fetch when there are no answers", async () => {
    nextResponseByTable.session_answers = { data: [], error: null };
    const { result } = renderHook(() => useTestSessionAnswers("sess-empty"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Only the session_answers chain is created; we never reach `questions`.
    expect(lastChains).toHaveLength(1);
    expect(lastChains[0].__table).toBe("session_answers");
    expect(result.current.data).toEqual([]);
  });

  it("does NOT issue a chain when sessionId is undefined (enabled=false)", async () => {
    const { result } = renderHook(() => useTestSessionAnswers(undefined), { wrapper });
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(lastChains).toHaveLength(0);
  });

  it("surfaces supabase errors via isError when the answers fetch fails", async () => {
    nextResponseByTable.session_answers = { data: null, error: { message: "boom" } };
    const { result } = renderHook(() => useTestSessionAnswers("sess-1"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
