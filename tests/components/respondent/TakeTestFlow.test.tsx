import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { TakeTestFlow } from "@/components/respondent/TakeTestFlow";
import type { SafeTestProjection } from "@/lib/respondent/take-test.functions";

const test: SafeTestProjection = {
  id: "tst_1",
  title: "Sample test",
  description: "Desc",
  intake_fields: [{ id: "if_name", label: "Meno", type: "text", required: true, pii: true }],
  gdpr_purpose: "research",
  allow_behavioral_tracking: false,
  status: "published",
};

function renderFlow(opts: { questionIds?: string[] } = {}) {
  const onClose = vi.fn();
  render(
    <TakeTestFlow
      test={test}
      questionIds={opts.questionIds ?? []}
      shareId="share-id-12345"
      onClose={onClose}
    />,
  );
  return { onClose };
}

async function completeIntake() {
  fireEvent.change(screen.getByTestId("respondent-flow-intake-name"), {
    target: { value: "Anna" },
  });
  fireEvent.click(screen.getByTestId("respondent-flow-intake-consent-checkbox"));
  fireEvent.click(screen.getByTestId("respondent-flow-intake-submit-button"));
}

describe("TakeTestFlow — Supabase RPC wiring", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls start_respondent_session on intake submit and advances to questions", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: "ses_uuid_1", session_token: "tok_1" },
      error: null,
    });
    renderFlow({ questionIds: [] });
    await completeIntake();
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        "start_respondent_session",
        expect.objectContaining({
          p_share_id: "share-id-12345",
          p_intake: { if_name: "Anna" },
          p_consent_given: true,
        }),
      );
    });
  });

  it("shows a submit error when start_respondent_session fails", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "test_not_found" } });
    renderFlow();
    await completeIntake();
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-submit-error")).toBeInTheDocument();
    });
  });

  it("does NOT call finalize when there are no questions to answer", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: "ses_uuid_1", session_token: "tok_1" },
      error: null,
    });
    renderFlow({ questionIds: [] });
    await completeIntake();
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });
    // No submit_respondent_answer / finalize_respondent_session calls.
    const calls = rpcMock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["start_respondent_session"]);
  });
});
