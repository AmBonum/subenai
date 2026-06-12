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

  // The RPC returns question UUIDs (UUIDv5 of the bank slug under the
  // URL namespace); the composer resolves text ids against the local
  // bank. The fetcher must translate at the boundary — both the computed
  // legacy mapping and the explicit E37 override map.
  it("translates legacy question UUIDs to bank text ids", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          slug: "vseobecny",
          // uuidv5(URL_NS, "p-sms-posta-1") — matches the DB seed.
          question_ids: ["d0c42316-c2d2-532e-9cde-2814adaa1398"],
        },
      ],
      error: null,
    });
    const result = await fetchPlatformPackQuestionIds();
    expect(result.get("vseobecny")).toEqual(["p-sms-posta-1"]);
  });

  it("translates E37 DB-only UUIDs via the explicit override map", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          slug: "heslo-2fa",
          question_ids: [
            "36b9fe06-edfb-5523-907c-824dceff1506",
            "8fe80139-f8a8-58b6-b16e-37db2e2dcb19",
          ],
        },
      ],
      error: null,
    });
    const result = await fetchPlatformPackQuestionIds();
    expect(result.get("heslo-2fa")).toEqual([
      "e37-2fa-recovery-email-1",
      "e37-2fa-passkey-vs-sms-1",
    ]);
  });

  it("passes unknown ids through unchanged so the composer counts them as drift", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ slug: "ghost", question_ids: ["00000000-0000-5000-8000-000000000000"] }],
      error: null,
    });
    const result = await fetchPlatformPackQuestionIds();
    expect(result.get("ghost")).toEqual(["00000000-0000-5000-8000-000000000000"]);
  });

  it("maps every E37 override target onto an existing bank question", async () => {
    const { E37_DB_UUID_TO_BANK_ID } = await import("@/lib/quiz/bank/db-ids");
    const { getQuestionById } = await import("@/lib/quiz/bank/questions");
    expect(E37_DB_UUID_TO_BANK_ID.size).toBe(30);
    for (const bankId of E37_DB_UUID_TO_BANK_ID.values()) {
      expect(getQuestionById(bankId), `bank id missing: ${bankId}`).not.toBeNull();
    }
  });
});
