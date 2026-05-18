import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import {
  startRespondentSession,
  submitRespondentAnswer,
  finalizeRespondentSession,
} from "@/lib/respondent/queries";

describe("respondent queries — Supabase RPC bindings", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("startRespondentSession passes intake + share id + consent + segment to RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: "ses_uuid_1", error: null });
    const id = await startRespondentSession({
      shareId: "shareid123",
      intake: { if_name: "Anna", if_email: "a@b.sk" },
      consent: true,
      segment: "seg-a",
    });
    expect(id).toBe("ses_uuid_1");
    expect(rpcMock).toHaveBeenCalledWith("start_respondent_session", {
      p_share_id: "shareid123",
      p_intake: { if_name: "Anna", if_email: "a@b.sk" },
      p_consent_given: true,
      p_segment: "seg-a",
    });
  });

  it("startRespondentSession defaults segment to null when omitted", async () => {
    rpcMock.mockResolvedValueOnce({ data: "ses_uuid_2", error: null });
    await startRespondentSession({
      shareId: "shareid123",
      intake: {},
      consent: false,
    });
    const call = rpcMock.mock.calls[0]?.[1] as { p_segment: unknown };
    expect(call.p_segment).toBeNull();
  });

  it("startRespondentSession throws when RPC returns an error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "test_not_found" } });
    await expect(
      startRespondentSession({ shareId: "missing-id", intake: {}, consent: true }),
    ).rejects.toMatchObject({ message: "test_not_found" });
  });

  it("submitRespondentAnswer passes mapped args to RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await submitRespondentAnswer({
      sessionId: "ses_1",
      questionId: "q_1",
      value: "Yes",
      isCorrect: true,
      timeMs: 1234,
    });
    expect(rpcMock).toHaveBeenCalledWith("submit_respondent_answer", {
      p_session_id: "ses_1",
      p_question_id: "q_1",
      p_value: "Yes",
      p_is_correct: true,
      p_time_ms: 1234,
    });
  });

  it("submitRespondentAnswer throws when RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "session_closed" } });
    await expect(
      submitRespondentAnswer({
        sessionId: "ses_1",
        questionId: "q_1",
        value: "Yes",
        isCorrect: null,
        timeMs: 0,
      }),
    ).rejects.toMatchObject({ message: "session_closed" });
  });

  it("finalizeRespondentSession passes session id and score to RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await finalizeRespondentSession({ sessionId: "ses_1", score: 85 });
    expect(rpcMock).toHaveBeenCalledWith("finalize_respondent_session", {
      p_session_id: "ses_1",
      p_score: 85,
    });
  });

  it("finalizeRespondentSession throws when RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "session_not_found" } });
    await expect(
      finalizeRespondentSession({ sessionId: "ses_x", score: null }),
    ).rejects.toMatchObject({ message: "session_not_found" });
  });
});
