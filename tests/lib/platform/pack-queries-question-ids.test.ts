// E37 Phase G3b — unit coverage for the pack → question IDs fetcher.
// The fetcher consumes the RPC landed in G3a; the composer at
// /test/builder uses the resulting Map for O(1) pack-toggle lookups.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { fetchPlatformPackQuestionIds } from "@/lib/platform/pack-queries";

describe("fetchPlatformPackQuestionIds — pack slug → question IDs mapping", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls public.get_platform_pack_question_ids() with no args", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await fetchPlatformPackQuestionIds();
    expect(rpcMock).toHaveBeenCalledWith("get_platform_pack_question_ids");
  });

  it("returns a Map<string, string[]> keyed by slug", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { slug: "heslo-2fa", question_ids: ["q-1", "q-2", "q-3"] },
        { slug: "ai-deepfake", question_ids: ["q-4", "q-5"] },
      ],
      error: null,
    });
    const result = await fetchPlatformPackQuestionIds();
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get("heslo-2fa")).toEqual(["q-1", "q-2", "q-3"]);
    expect(result.get("ai-deepfake")).toEqual(["q-4", "q-5"]);
  });

  it("returns an empty Map when the RPC payload is null", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const result = await fetchPlatformPackQuestionIds();
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("throws on RPC error so the loader / hook surfaces the failure", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "rls denied" } });
    await expect(fetchPlatformPackQuestionIds()).rejects.toBeTruthy();
  });
});
