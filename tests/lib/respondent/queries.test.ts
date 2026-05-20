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

// E39 — fixtures updated to match the zod boundary contract:
// session_id / session_token are real uuids; share_id matches
// the regex enforced by both the migration and the schema.
const SESSION_ID_1 = "11111111-1111-1111-1111-111111111111";
const SESSION_ID_2 = "22222222-2222-2222-2222-222222222222";
const SESSION_TOKEN_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SESSION_TOKEN_2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const LEGACY_SESSION_ID = "33333333-3333-3333-3333-333333333333";

describe("respondent queries — Supabase RPC bindings", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("startRespondentSession passes intake + share id + consent + segment to RPC", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: SESSION_ID_1, session_token: SESSION_TOKEN_1 },
      error: null,
    });
    const result = await startRespondentSession({
      shareId: "shareid123",
      intake: { if_name: "Anna", if_email: "a@b.sk" },
      consent: true,
      segment: "seg-a",
    });
    expect(result).toEqual({ sessionId: SESSION_ID_1, sessionToken: SESSION_TOKEN_1 });
    expect(rpcMock).toHaveBeenCalledWith("start_respondent_session", {
      p_share_id: "shareid123",
      p_intake: { if_name: "Anna", if_email: "a@b.sk" },
      p_consent_given: true,
      p_segment: "seg-a",
    });
  });

  it("startRespondentSession defaults segment to null when omitted", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: SESSION_ID_2, session_token: SESSION_TOKEN_2 },
      error: null,
    });
    await startRespondentSession({
      shareId: "shareid123",
      intake: {},
      consent: false,
    });
    const call = rpcMock.mock.calls[0]?.[1] as { p_segment: unknown };
    expect(call.p_segment).toBeNull();
  });

  it("startRespondentSession accepts legacy bare-string return during rollout", async () => {
    rpcMock.mockResolvedValueOnce({ data: LEGACY_SESSION_ID, error: null });
    const result = await startRespondentSession({
      shareId: "shareid123",
      intake: {},
      consent: false,
    });
    expect(result).toEqual({ sessionId: LEGACY_SESSION_ID, sessionToken: null });
  });

  it("startRespondentSession throws when RPC returns an error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "test_not_found" } });
    await expect(
      // share_id matches the regex — the RPC, not the zod gate, returns this error.
      startRespondentSession({ shareId: "missingid", intake: {}, consent: true }),
    ).rejects.toMatchObject({ message: "test_not_found" });
  });

  it("submitRespondentAnswer passes mapped args (including session token) to RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await submitRespondentAnswer({
      sessionId: SESSION_ID_1,
      sessionToken: SESSION_TOKEN_1,
      questionId: "q_1",
      value: "Yes",
      isCorrect: true,
      timeMs: 1234,
    });
    expect(rpcMock).toHaveBeenCalledWith("submit_respondent_answer", {
      p_session_id: SESSION_ID_1,
      p_question_id: "q_1",
      p_value: "Yes",
      p_is_correct: true,
      p_time_ms: 1234,
      p_session_token: SESSION_TOKEN_1,
    });
  });

  it("submitRespondentAnswer sends null token when caller has none", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await submitRespondentAnswer({
      sessionId: SESSION_ID_1,
      questionId: "q_1",
      value: "Yes",
      isCorrect: null,
      timeMs: 0,
    });
    const call = rpcMock.mock.calls[0]?.[1] as { p_session_token: unknown };
    expect(call.p_session_token).toBeNull();
  });

  it("submitRespondentAnswer throws when RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "session_closed" } });
    await expect(
      submitRespondentAnswer({
        sessionId: SESSION_ID_1,
        questionId: "q_1",
        value: "Yes",
        isCorrect: null,
        timeMs: 0,
      }),
    ).rejects.toMatchObject({ message: "session_closed" });
  });

  it("finalizeRespondentSession passes session id, token, and score to RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await finalizeRespondentSession({
      sessionId: SESSION_ID_1,
      sessionToken: SESSION_TOKEN_1,
      score: 85,
    });
    expect(rpcMock).toHaveBeenCalledWith("finalize_respondent_session", {
      p_session_id: SESSION_ID_1,
      p_score: 85,
      p_session_token: SESSION_TOKEN_1,
    });
  });

  it("finalizeRespondentSession throws when RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "session_not_found" } });
    await expect(
      finalizeRespondentSession({ sessionId: SESSION_ID_2, score: null }),
    ).rejects.toMatchObject({ message: "session_not_found" });
  });
});
