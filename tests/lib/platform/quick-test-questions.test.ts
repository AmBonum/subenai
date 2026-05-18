import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { useQuickTestQuestions } from "@/lib/platform/queries";
import { __resetLocaleForTests } from "@/i18n/locale-context";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("useQuickTestQuestions", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    __resetLocaleForTests("sk");
  });

  it("calls get_quick_test_questions with the requested limit and current locale", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useQuickTestQuestions(10), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("get_quick_test_questions", {
      p_limit: 10,
      p_locale: "sk",
    });
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

  it("forwards the active locale to the RPC (en)", async () => {
    __resetLocaleForTests("en");
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useQuickTestQuestions(5), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("get_quick_test_questions", {
      p_limit: 5,
      p_locale: "en",
    });
  });

  it("forwards the active locale to the RPC (cs)", async () => {
    __resetLocaleForTests("cs");
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useQuickTestQuestions(7), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("get_quick_test_questions", {
      p_limit: 7,
      p_locale: "cs",
    });
  });
});
