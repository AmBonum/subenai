// E44.4 — Query layer unit tests for the templates v2 ownership hooks.
//
// The shared admin Supabase stub from tests/setup.ts is replaced per-file
// with an inline chainable spy so we can assert the exact `.from().select()
// .eq()/.or().order()` chain each hook produces. The point is to lock the
// query shape (filters, ordering, defense-in-depth eq clauses on mutations)
// against accidental drift — RLS is the real gate but the explicit owner_id
// filters in the mutation hooks are a load-bearing belt + suspenders.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Chainable supabase stub. Tracks every method call so tests can introspect
// the chain. Resolves a `then` at the end of any chain into the configured
// response (`responses[table]`) and exposes `chains` for shape assertions.
// ---------------------------------------------------------------------------

type ChainCall = { method: string; args: unknown[] };
type ResolvedResponse = { data: unknown; error: unknown };

type Chain = {
  __table: string;
  __calls: ChainCall[];
  __response: ResolvedResponse;
  select: (...args: unknown[]) => Chain;
  insert: (...args: unknown[]) => Chain;
  update: (...args: unknown[]) => Chain;
  delete: (...args: unknown[]) => Chain;
  eq: (...args: unknown[]) => Chain;
  or: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  maybeSingle: () => Promise<ResolvedResponse>;
  single: () => Promise<ResolvedResponse>;
  then: (onFulfilled: (v: ResolvedResponse) => unknown) => Promise<unknown>;
};

let lastChains: Chain[] = [];
let nextResponseByTable: Record<string, ResolvedResponse> = {};
let nextAuthUser: { id: string } | null = null;

function makeChain(table: string): Chain {
  const calls: ChainCall[] = [];
  const response: ResolvedResponse = nextResponseByTable[table] ?? { data: [], error: null };
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
  proxy.or = chainable("or");
  proxy.order = chainable("order");
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
      getUser: async () => ({ data: { user: nextAuthUser }, error: null }),
    },
  },
}));

import {
  usePublicTemplates,
  useMyTemplates,
  useDuplicateTemplate,
  useUpdateOwnTemplate,
  useDeleteOwnTemplate,
} from "@/lib/platform/queries";
import type { Template } from "@/lib/platform/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

function makeTemplateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tpl-1",
    title: "Onboarding kolegov",
    description: "Základná bezpečnostná hygiena.",
    question_ids: ["q1", "q2"],
    gdpr_purpose: "internal_training",
    owner_id: null,
    visibility: "public",
    fork_of: null,
    status: "published",
    license: "cc-by-4.0",
    author_display_name: null,
    age_rating: "all",
    slug: "onboarding-kolegov",
    published_at: "2026-05-20T10:00:00Z",
    updated_at: "2026-05-20T10:00:00Z",
    created_at: "2026-05-20T10:00:00Z",
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: "tpl-src",
    title: "Source",
    description: "src description",
    question_ids: ["q1"],
    gdpr_purpose: "internal_training",
    owner_id: null,
    visibility: "public",
    fork_of: null,
    status: "published",
    license: "cc-by-4.0",
    author_display_name: null,
    age_rating: "all",
    slug: "source",
    published_at: "2026-05-20T10:00:00Z",
    updated_at: "2026-05-20T10:00:00Z",
    created_at: "2026-05-20T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  lastChains = [];
  nextResponseByTable = {};
  nextAuthUser = null;
});

// ---------------------------------------------------------------------------
// usePublicTemplates
// ---------------------------------------------------------------------------

describe("usePublicTemplates", () => {
  it("emits a single chain on the templates table with the union .or() filter", async () => {
    nextResponseByTable.templates = { data: [makeTemplateRow()], error: null };

    const { result } = renderHook(() => usePublicTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastChains).toHaveLength(1);
    const chain = lastChains[0];
    expect(chain.__table).toBe("templates");

    const select = chain.__calls.find((c) => c.method === "select");
    expect(select?.args[0]).toContain("owner_id");
    expect(select?.args[0]).toContain("visibility");
    expect(select?.args[0]).toContain("fork_of");

    const or = chain.__calls.find((c) => c.method === "or");
    expect(or?.args[0]).toBe("owner_id.is.null,and(visibility.eq.public,status.eq.published)");

    const orders = chain.__calls.filter((c) => c.method === "order");
    expect(orders).toHaveLength(2);
    expect(orders[0].args[0]).toBe("published_at");
    expect(orders[1].args[0]).toBe("title");
  });

  it("maps DB row → Template shape correctly", async () => {
    nextResponseByTable.templates = {
      data: [
        makeTemplateRow({
          id: "tpl-mapped",
          owner_id: null,
          fork_of: null,
          author_display_name: null,
          description: null,
        }),
      ],
      error: null,
    };
    const { result } = renderHook(() => usePublicTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const t = result.current.data?.[0];
    expect(t?.id).toBe("tpl-mapped");
    expect(t?.description).toBe(""); // null → "" in mapper
    expect(t?.owner_id).toBeNull();
    expect(t?.fork_of).toBeNull();
    expect(t?.author_display_name).toBeNull();
    expect(t?.visibility).toBe("public");
    expect(t?.status).toBe("published");
    expect(t?.license).toBe("cc-by-4.0");
  });

  it("surfaces supabase errors via isError", async () => {
    nextResponseByTable.templates = { data: null, error: { message: "rls_denied" } };
    const { result } = renderHook(() => usePublicTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useMyTemplates
// ---------------------------------------------------------------------------

describe("useMyTemplates", () => {
  it("filters by .eq('owner_id', currentUserId) ordered by updated_at desc", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = {
      data: [makeTemplateRow({ owner_id: "user-1", visibility: "private" })],
      error: null,
    };

    const { result } = renderHook(() => useMyTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastChains).toHaveLength(1);
    const chain = lastChains[0];
    expect(chain.__table).toBe("templates");

    const eq = chain.__calls.find((c) => c.method === "eq");
    expect(eq?.args).toEqual(["owner_id", "user-1"]);

    const orders = chain.__calls.filter((c) => c.method === "order");
    expect(orders).toHaveLength(1);
    expect(orders[0].args[0]).toBe("updated_at");
    expect(orders[0].args[1]).toEqual({ ascending: false });
  });

  it("returns an empty array (and skips the query chain) when there is no auth user", async () => {
    nextAuthUser = null;
    const { result } = renderHook(() => useMyTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(lastChains).toHaveLength(0);
  });

  it("surfaces supabase errors via isError", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: { message: "boom" } };
    const { result } = renderHook(() => useMyTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useDuplicateTemplate
// ---------------------------------------------------------------------------

describe("useDuplicateTemplate", () => {
  it("inserts a new row with owner_id=me, visibility=private, fork_of=source.id, status=draft", async () => {
    nextAuthUser = { id: "user-1" };
    const inserted = makeTemplateRow({
      id: "tpl-new",
      owner_id: "user-1",
      visibility: "private",
      fork_of: "tpl-src",
      status: "draft",
      title: "Source (kópia)",
    });
    nextResponseByTable.templates = { data: inserted, error: null };

    const source = makeTemplate({ id: "tpl-src", title: "Source" });
    const { result } = renderHook(() => useDuplicateTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ source });
    });

    const chain = lastChains.at(-1)!;
    expect(chain.__table).toBe("templates");
    const insert = chain.__calls.find((c) => c.method === "insert");
    expect(insert).toBeDefined();
    const payload = insert!.args[0] as Record<string, unknown>;
    expect(payload.owner_id).toBe("user-1");
    expect(payload.visibility).toBe("private");
    expect(payload.fork_of).toBe("tpl-src");
    expect(payload.status).toBe("draft");
    expect(payload.title).toBe("Source (kópia)");
    expect(payload.question_ids).toEqual(["q1"]);
    expect(payload.gdpr_purpose).toBe("internal_training");
    expect(payload.age_rating).toBe("all");
  });

  it("uses a caller-supplied custom title when passed", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = {
      data: makeTemplateRow({ id: "tpl-new", title: "My fork" }),
      error: null,
    };
    const source = makeTemplate({ id: "tpl-src", title: "Source" });
    const { result } = renderHook(() => useDuplicateTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ source, title: "My fork" });
    });
    const chain = lastChains.at(-1)!;
    const insert = chain.__calls.find((c) => c.method === "insert");
    const payload = insert!.args[0] as Record<string, unknown>;
    expect(payload.title).toBe("My fork");
  });

  it("throws not_authenticated when there is no auth user", async () => {
    nextAuthUser = null;
    const source = makeTemplate({ id: "tpl-src" });
    const { result } = renderHook(() => useDuplicateTemplate(), { wrapper });
    await expect(
      act(async () => {
        await result.current.mutateAsync({ source });
      }),
    ).rejects.toThrow(/not_authenticated/);
    // Mutation must not even attempt the insert chain.
    expect(lastChains).toHaveLength(0);
  });

  it("throws when the insert returns a supabase error", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: { message: "fk_violation" } };
    const source = makeTemplate({ id: "tpl-src" });
    const { result } = renderHook(() => useDuplicateTemplate(), { wrapper });
    await expect(
      act(async () => {
        await result.current.mutateAsync({ source });
      }),
    ).rejects.toMatchObject({ message: "fk_violation" });
  });
});

// ---------------------------------------------------------------------------
// useUpdateOwnTemplate
// ---------------------------------------------------------------------------

describe("useUpdateOwnTemplate", () => {
  it("filters update by BOTH id and owner_id for defense in depth", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: null };

    const { result } = renderHook(() => useUpdateOwnTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "tpl-1",
        patch: { title: "Updated", description: "New desc" },
      });
    });

    const chain = lastChains.at(-1)!;
    expect(chain.__table).toBe("templates");

    const updateCall = chain.__calls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload.title).toBe("Updated");
    expect(payload.description).toBe("New desc");

    const eqCalls = chain.__calls.filter((c) => c.method === "eq");
    expect(eqCalls).toHaveLength(2);
    expect(eqCalls[0].args).toEqual(["id", "tpl-1"]);
    expect(eqCalls[1].args).toEqual(["owner_id", "user-1"]);
  });

  it("only includes patched fields in the update payload", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: null };

    const { result } = renderHook(() => useUpdateOwnTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "tpl-1",
        patch: { age_rating: "thirteen_plus" },
      });
    });
    const chain = lastChains.at(-1)!;
    const payload = chain.__calls.find((c) => c.method === "update")!.args[0] as Record<
      string,
      unknown
    >;
    expect(payload).toEqual({ age_rating: "thirteen_plus" });
    expect(payload).not.toHaveProperty("title");
  });

  it("throws not_authenticated when there is no auth user", async () => {
    nextAuthUser = null;
    const { result } = renderHook(() => useUpdateOwnTemplate(), { wrapper });
    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: "tpl-1", patch: { title: "x" } });
      }),
    ).rejects.toThrow(/not_authenticated/);
    expect(lastChains).toHaveLength(0);
  });

  it("throws when supabase returns an error", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: { message: "rls_denied" } };
    const { result } = renderHook(() => useUpdateOwnTemplate(), { wrapper });
    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: "tpl-1", patch: { title: "x" } });
      }),
    ).rejects.toMatchObject({ message: "rls_denied" });
  });
});

// ---------------------------------------------------------------------------
// useDeleteOwnTemplate
// ---------------------------------------------------------------------------

describe("useDeleteOwnTemplate", () => {
  it("filters delete by BOTH id and owner_id for defense in depth", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: null };

    const { result } = renderHook(() => useDeleteOwnTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("tpl-1");
    });

    const chain = lastChains.at(-1)!;
    expect(chain.__table).toBe("templates");
    expect(chain.__calls.some((c) => c.method === "delete")).toBe(true);

    const eqCalls = chain.__calls.filter((c) => c.method === "eq");
    expect(eqCalls).toHaveLength(2);
    expect(eqCalls[0].args).toEqual(["id", "tpl-1"]);
    expect(eqCalls[1].args).toEqual(["owner_id", "user-1"]);
  });

  it("throws not_authenticated when there is no auth user", async () => {
    nextAuthUser = null;
    const { result } = renderHook(() => useDeleteOwnTemplate(), { wrapper });
    await expect(
      act(async () => {
        await result.current.mutateAsync("tpl-1");
      }),
    ).rejects.toThrow(/not_authenticated/);
    expect(lastChains).toHaveLength(0);
  });

  it("throws when supabase returns an error", async () => {
    nextAuthUser = { id: "user-1" };
    nextResponseByTable.templates = { data: null, error: { message: "rls_denied" } };
    const { result } = renderHook(() => useDeleteOwnTemplate(), { wrapper });
    await expect(
      act(async () => {
        await result.current.mutateAsync("tpl-1");
      }),
    ).rejects.toMatchObject({ message: "rls_denied" });
  });
});
