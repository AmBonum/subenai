import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { resolveRespondentTest } from "@/lib/respondent/queries";

const VALID_SHARE_ID = "shareid12345";

describe("resolveRespondentTest", () => {
  beforeEach(() => rpcMock.mockReset());

  it("returns null for a malformed share id without calling the RPC", async () => {
    const result = await resolveRespondentTest("bad-id!!");
    expect(result).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("calls get_respondent_test_by_share_id with the validated share id", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await resolveRespondentTest(VALID_SHARE_ID);
    expect(rpcMock).toHaveBeenCalledWith("get_respondent_test_by_share_id", {
      p_share_id: VALID_SHARE_ID,
    });
  });

  it("returns null when the RPC resolves to null (unpublished / unknown)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await resolveRespondentTest(VALID_SHARE_ID)).toBeNull();
  });

  it("throws when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(resolveRespondentTest(VALID_SHARE_ID)).rejects.toBeTruthy();
  });

  it("maps the projection + normalizes object options to string labels", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        test: {
          id: "tst_1",
          title: "T",
          description: "D",
          intake_fields: [{ id: "if_name", label: "Meno", type: "text", required: true }],
          gdpr_purpose: "research",
          allow_behavioral_tracking: false,
          status: "published",
          question_order_mode: "fixed",
        },
        questions: [
          {
            id: "q1",
            type: "single",
            prompt: "P1",
            options: [
              { id: "a", label: "Možnosť A", correct: false },
              { id: "b", label: "Možnosť B", correct: true },
            ],
            correct: [1],
            position: 0,
          },
        ],
      },
      error: null,
    });

    const result = await resolveRespondentTest(VALID_SHARE_ID);
    expect(result).not.toBeNull();
    expect(result!.test.title).toBe("T");
    expect(result!.questions).toHaveLength(1);
    expect(result!.questions[0].options).toEqual(["Možnosť A", "Možnosť B"]);
    expect(result!.questions[0].correct).toEqual([1]);
    // Sensitive projection columns must never appear on the resolved test.
    expect(Object.keys(result!.test)).not.toContain("owner_id");
    expect(Object.keys(result!.test)).not.toContain("password_hash");
  });
});
