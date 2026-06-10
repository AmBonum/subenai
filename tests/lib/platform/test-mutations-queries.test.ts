// Wizard-publish + duplicate + reorder mutation contracts:
// - useCreateTest persists step-3 question_ids via replace_test_questions
//   (the pre-fix flow published tests with ZERO questions) and mints a
//   respondent-compatible share_id (not a 36-char uuid).
// - useUpdateTestQuestionOrder + useDuplicateTest route through the
//   transactional RPCs instead of client-side delete/insert copies.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type ResolvedResponse = { data: unknown; error: unknown };

let insertedValues: Record<string, unknown> | null = null;
let insertResponse: ResolvedResponse = { data: null, error: null };
const rpcMock = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<ResolvedResponse>>();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_table: string) => ({
      insert: (values: Record<string, unknown>) => {
        insertedValues = values;
        return {
          select: () => ({
            single: () => Promise.resolve(insertResponse),
          }),
        };
      },
    }),
    rpc: (fn: string, args: Record<string, unknown>) => rpcMock(fn, args),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  },
}));

import {
  useCreateTest,
  useDuplicateTest,
  useUpdateTestQuestionOrder,
} from "@/lib/platform/queries";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  insertedValues = null;
  insertResponse = { data: { id: "new-test-1", share_id: "abc123XYZ0" }, error: null };
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: null, error: null });
});

describe("useCreateTest", () => {
  it("mints a base62 share_id compatible with the respondent regex", async () => {
    const { result } = renderHook(() => useCreateTest(), { wrapper });
    result.current.mutate({ owner_id: "usr_me", title: "T" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertedValues?.share_id).toMatch(/^[a-zA-Z0-9]{6,12}$/);
  });

  it("persists question_ids via replace_test_questions after the insert", async () => {
    const { result } = renderHook(() => useCreateTest(), { wrapper });
    result.current.mutate({
      owner_id: "usr_me",
      title: "T",
      question_ids: ["q-1", "q-2"],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("replace_test_questions", {
      p_test_id: "new-test-1",
      p_question_ids: ["q-1", "q-2"],
    });
  });

  it("skips the RPC when no question_ids are passed", async () => {
    const { result } = renderHook(() => useCreateTest(), { wrapper });
    result.current.mutate({ owner_id: "usr_me", title: "T" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("surfaces an RPC failure as a mutation error (no silent zero-question publish)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "rpc_failed" } });
    const { result } = renderHook(() => useCreateTest(), { wrapper });
    result.current.mutate({
      owner_id: "usr_me",
      title: "T",
      question_ids: ["q-1"],
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateTestQuestionOrder", () => {
  it("rewrites the order through the transactional RPC", async () => {
    const { result } = renderHook(() => useUpdateTestQuestionOrder("test-1"), { wrapper });
    result.current.mutate(["q-b", "q-a"]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("replace_test_questions", {
      p_test_id: "test-1",
      p_question_ids: ["q-b", "q-a"],
    });
  });
});

describe("useDuplicateTest", () => {
  it("copies via the duplicate_test RPC and returns the new id", async () => {
    rpcMock.mockResolvedValue({ data: "copied-id", error: null });
    const { result } = renderHook(() => useDuplicateTest(), { wrapper });
    result.current.mutate("test-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("duplicate_test", { p_test_id: "test-1" });
    expect(result.current.data).toBe("copied-id");
  });
});
