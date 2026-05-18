import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { useQuickTestQuestions } from "@/lib/platform/queries";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("useQuickTestQuestions", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls get_quick_test_questions with the requested limit", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useQuickTestQuestions(10), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("get_quick_test_questions", { p_limit: 10 });
  });

  it("returns rows from the RPC payload", async () => {
    const rows = [
      {
        id: "r1",
        type: "single",
        prompt: "P?",
        options: [{ id: "a", label: "Áno", correct: true, severity: null }],
        correct: [0],
        branch_slug: "phishing",
        difficulty: "easy",
        visual: null,
        order_index: 0,
      },
    ];
    rpcMock.mockResolvedValueOnce({ data: rows, error: null });
    const { result } = renderHook(() => useQuickTestQuestions(10), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
  });

  it("surfaces RPC errors via isError", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useQuickTestQuestions(10), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("treats null data as empty array (anon RLS edge case)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(() => useQuickTestQuestions(10), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
