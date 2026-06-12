import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

// Thank-you stage renders a router <Link> (quick-test CTA); the component
// is rendered without a RouterProvider here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { TakeTestFlow } from "@/components/respondent/TakeTestFlow";
import type { SafeTestProjection } from "@/lib/respondent/take-test.functions";
import type { Question } from "@/lib/platform/types";

// Mirrors the resolved-question shape returned by resolveRespondentTest
// (RPC get_respondent_test_by_share_id): options as string[], correct as
// the index array. q1 single (correct = "Možnosť A"), q2 multi (no correct).
const QUESTIONS: Question[] = [
  {
    id: "qp_0001",
    type: "single",
    prompt: "Q1",
    options: ["Možnosť A", "Možnosť B", "Možnosť C", "Možnosť D"],
    correct: [0],
    category: "",
    difficulty: "medium",
    author_id: "",
    status: "approved",
    created_at: "",
  },
  {
    id: "qp_0002",
    type: "multi",
    prompt: "Q2",
    options: ["Možnosť A", "Možnosť B", "Možnosť C", "Možnosť D"],
    category: "",
    difficulty: "medium",
    author_id: "",
    status: "approved",
    created_at: "",
  },
];

const test: SafeTestProjection = {
  id: "tst_1",
  title: "Sample test",
  description: "Desc",
  intake_fields: [{ id: "if_name", label: "Meno", type: "text", required: true, pii: true }],
  gdpr_purpose: "research",
  allow_behavioral_tracking: false,
  status: "published",
  question_order_mode: "fixed",
};

// E39 — shareId must match the regex [a-zA-Z0-9]{6,12} (zod boundary).
// The previous "share-id-12345" had hyphens that the gate now rejects.
const TEST_SHARE_ID = "shareid12345";
const TEST_SESSION_ID = "11111111-1111-1111-1111-111111111111";
const TEST_SESSION_TOKEN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function renderFlow(opts: { questions?: Question[] } = {}) {
  const onClose = vi.fn();
  render(
    <TakeTestFlow
      test={test}
      questions={opts.questions ?? []}
      shareId={TEST_SHARE_ID}
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

const STORAGE_KEY = `iiq_respondent_session_v1:${TEST_SHARE_ID}`;

describe("TakeTestFlow — Supabase RPC wiring", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    window.sessionStorage.clear();
  });

  it("calls start_respondent_session on intake submit and advances to questions", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: TEST_SESSION_ID, session_token: TEST_SESSION_TOKEN },
      error: null,
    });
    renderFlow({ questions: [] });
    await completeIntake();
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        "start_respondent_session",
        expect.objectContaining({
          p_share_id: TEST_SHARE_ID,
          p_intake: { if_name: "Anna" },
          p_consent_given: true,
        }),
      );
    });
  });

  it("shows the start-specific error copy when start_respondent_session fails", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "test_not_found" } });
    renderFlow();
    await completeIntake();
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-submit-error")).toHaveTextContent(
        "Test sa nepodarilo spustiť. Skús to znova.",
      );
    });
  });

  it("does NOT call finalize when there are no questions to answer", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: TEST_SESSION_ID, session_token: TEST_SESSION_TOKEN },
      error: null,
    });
    renderFlow({ questions: [] });
    await completeIntake();
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });
    // No submit_respondent_answer / finalize_respondent_session calls.
    const calls = rpcMock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["start_respondent_session"]);
  });

  it("back-navigation does not duplicate answers nor re-submit an unchanged answer", async () => {
    rpcMock.mockImplementation(async (fn: unknown) => {
      if (fn === "start_respondent_session") {
        return {
          data: { session_id: TEST_SESSION_ID, session_token: TEST_SESSION_TOKEN },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    // qp_0001 (single, correct = "Možnosť A") + qp_0002 (multi, no correct).
    renderFlow({ questions: QUESTIONS });
    await completeIntake();

    // Q1 — answer "Možnosť A" and advance.
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-question-0-prompt")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByTestId("respondent-flow-question-0-answer-0").querySelector("input")!,
    );
    fireEvent.click(screen.getByTestId("respondent-flow-next-button"));
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-question-1-prompt")).toBeInTheDocument();
    });

    // Back to Q1 — previously chosen answer is pre-selected via key remount.
    fireEvent.click(screen.getByTestId("respondent-flow-prev-button"));
    const q1Radio = screen
      .getByTestId("respondent-flow-question-0-answer-0")
      .querySelector("input")!;
    expect(q1Radio.checked).toBe(true);

    // Re-submit the SAME value — must not fire a second submit RPC.
    fireEvent.click(screen.getByTestId("respondent-flow-next-button"));
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-question-1-prompt")).toBeInTheDocument();
    });
    const submitsAfterReanswer = rpcMock.mock.calls.filter(
      (c) => c[0] === "submit_respondent_answer",
    );
    expect(submitsAfterReanswer).toHaveLength(1);

    // Q2 — answer and finish. Score must be computed over deduped answers
    // (1 correct of 2 questions = 50, not polluted by a duplicate Q1 row).
    fireEvent.click(
      screen.getByTestId("respondent-flow-question-1-answer-1").querySelector("input")!,
    );
    fireEvent.click(screen.getByTestId("respondent-flow-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-thank-you")).toBeInTheDocument();
    });
    const submits = rpcMock.mock.calls.filter((c) => c[0] === "submit_respondent_answer");
    expect(submits).toHaveLength(2);
    const finalize = rpcMock.mock.calls.find((c) => c[0] === "finalize_respondent_session");
    expect(finalize).toBeDefined();
    expect((finalize![1] as { p_score: number }).p_score).toBe(50);
  });
});

describe("TakeTestFlow — mid-take resume via sessionStorage", () => {
  const SAVED_SESSION = {
    sessionId: TEST_SESSION_ID,
    sessionToken: TEST_SESSION_TOKEN,
    intake: { if_name: "Anna" },
    answers: [{ question_id: "qp_0001", value: "Možnosť A", is_correct: true, time_ms: 1234 }],
    qIdx: 1,
    questionOrder: ["qp_0001", "qp_0002"],
  };

  beforeEach(() => {
    rpcMock.mockReset();
    window.sessionStorage.clear();
  });

  it("snapshots the session to sessionStorage after intake (resume seed)", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { session_id: TEST_SESSION_ID, session_token: TEST_SESSION_TOKEN },
      error: null,
    });
    renderFlow({ questions: QUESTIONS });
    await completeIntake();
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-question-0-prompt")).toBeInTheDocument();
    });
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!);
    expect(saved.sessionId).toBe(TEST_SESSION_ID);
    expect(saved.sessionToken).toBe(TEST_SESSION_TOKEN);
    expect(saved.qIdx).toBe(0);
    expect(saved.questionOrder).toEqual(["qp_0001", "qp_0002"]);
    expect(saved.intake).toEqual({ if_name: "Anna" });
  });

  it("resumes the saved session — no second start_respondent_session, same session finalized, entry cleared", async () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED_SESSION));
    rpcMock.mockResolvedValue({ data: null, error: null });
    renderFlow({ questions: QUESTIONS });

    // Intake is skipped — resumes straight on Q2 (display index 1).
    expect(screen.getByTestId("respondent-flow-question-1-prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("respondent-flow-intake-submit-button")).not.toBeInTheDocument();

    // Answer Q2 and finish.
    fireEvent.click(
      screen.getByTestId("respondent-flow-question-1-answer-1").querySelector("input")!,
    );
    fireEvent.click(screen.getByTestId("respondent-flow-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-thank-you")).toBeInTheDocument();
    });

    const calls = rpcMock.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain("start_respondent_session");
    const finalize = rpcMock.mock.calls.find((c) => c[0] === "finalize_respondent_session");
    expect(finalize).toBeDefined();
    expect((finalize![1] as { p_session_id: string }).p_session_id).toBe(TEST_SESSION_ID);
    // Restored Q1 answer (correct) + Q2 (unscored) → deduped 1/2 = 50.
    expect((finalize![1] as { p_score: number }).p_score).toBe(50);

    // Finalize clears the saved entry — a later visit starts fresh.
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("ignores a malformed saved entry and starts at intake", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{not-json");
    renderFlow({ questions: QUESTIONS });
    expect(screen.getByTestId("respondent-flow-intake-submit-button")).toBeInTheDocument();
  });
});

describe("TakeTestFlow — thank-you exit", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    window.sessionStorage.clear();
  });

  it("offers the quick-test CTA to /test plus a close button", async () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: TEST_SESSION_ID,
        sessionToken: TEST_SESSION_TOKEN,
        intake: { if_name: "Anna" },
        answers: [{ question_id: "qp_0001", value: "Možnosť A", is_correct: true, time_ms: 1 }],
        qIdx: 1,
        questionOrder: ["qp_0001", "qp_0002"],
      }),
    );
    rpcMock.mockResolvedValue({ data: null, error: null });
    renderFlow({ questions: QUESTIONS });
    fireEvent.click(
      screen.getByTestId("respondent-flow-question-1-answer-0").querySelector("input")!,
    );
    fireEvent.click(screen.getByTestId("respondent-flow-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("respondent-flow-thank-you")).toBeInTheDocument();
    });

    const cta = screen.getByTestId("respondent-flow-thank-you-quick-test-cta");
    expect(cta).toHaveAttribute("href", "/test");
    expect(cta).toHaveTextContent("Otestuj si svoje scam radary — rýchly test zadarmo");
    expect(screen.getByTestId("respondent-flow-thank-you-close-button")).toHaveTextContent(
      "Zatvoriť",
    );
  });
});
