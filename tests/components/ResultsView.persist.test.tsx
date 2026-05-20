import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AnswerRecord, ScoreResult } from "@/lib/quiz/score/scoring";
import { ConsentProvider } from "@/hooks/useConsent";

const insertSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertSpy })),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/quiz/og-image/index", () => ({
  drawIgStoryToCanvas: vi.fn(),
}));

vi.mock("@/components/quiz/survey/SurveyCard", () => ({
  SurveyCard: () => null,
}));

import { ResultsView } from "@/components/quiz/results/ResultsView";

function makeAnswer(i: number): AnswerRecord {
  return {
    questionId: `q-${i.toString().padStart(3, "0")}`,
    optionId: "a",
    correct: true,
    severity: null,
    responseMs: 4000 + i,
    category: "phishing",
    difficulty: "medium",
  };
}

const baseResult: ScoreResult = {
  baseScore: 80,
  finalScore: 75,
  totalPenalty: 5,
  percentile: 70,
  personality: "internet_ninja",
  breakdown: { phishing: 80, url: 70, fake_vs_real: 60, scenario: 90 },
  insights: ["Insight A", "Insight B"],
  stats: {
    criticalMistakes: 0,
    mediumMistakes: 1,
    minorMistakes: 0,
    avgResponseMs: 4000,
    totalTimeMs: 60_000,
  },
  flags: [],
};

beforeEach(() => {
  insertSpy.mockReset();
  insertSpy.mockResolvedValue({ error: null });
});

function renderResults(result: ScoreResult, answers: AnswerRecord[]) {
  return render(
    <ConsentProvider>
      <ResultsView result={result} answers={answers} onRestart={() => {}} />
    </ConsentProvider>,
  );
}

describe("ResultsView.persistResult — answers payload (E3.1)", () => {
  it("includes the full answers array in the supabase insert", async () => {
    const answers = Array.from({ length: 15 }, (_, i) => makeAnswer(i));

    renderResults(baseResult, answers);

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));

    const payload = insertSpy.mock.calls[0][0] as {
      answers: AnswerRecord[];
      final_score: number;
      share_id: string;
    };
    expect(payload.answers).toHaveLength(15);
    expect(payload.answers[0]).toEqual(answers[0]);
    expect(payload.final_score).toBe(baseResult.finalScore);
    expect(payload.share_id).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("persists an empty answers array when no answers were collected (defensive)", async () => {
    renderResults(baseResult, []);

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    const payload = insertSpy.mock.calls[0][0] as { answers: AnswerRecord[] };
    expect(payload.answers).toEqual([]);
  });

  it("renders the score reveal even before the insert resolves", async () => {
    renderResults(baseResult, [makeAnswer(0)]);
    expect(screen.getByText(/Tvoje skóre/i)).toBeInTheDocument();
  });
});

describe("ResultsView.persistResult — edu share URL (BUG-share-link)", () => {
  // Edu/builder respondents have respondent_name set on their attempts
  // row. The anon SELECT policy filters those rows out, so /r/<share_id>
  // returned "Výsledok neexistuje" to recipients. Fix: edu shares emit a
  // TEST-INVITATION URL pointing at the test_set itself instead.
  const TEST_SET_ID = "3f25484b-b9ae-4bdd-ba70-6af890a9f5bf";

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ share_id: "AAAA1111" }),
      }),
    );
  });

  function renderEduResults() {
    return render(
      <ConsentProvider>
        <ResultsView
          result={baseResult}
          answers={[makeAnswer(0)]}
          onRestart={() => {}}
          edu={{
            token: "edu-token",
            respondentName: "Anna Test",
            respondentEmail: "anna@example.sk",
            testSetId: TEST_SET_ID,
          }}
        />
      </ConsentProvider>,
    );
  }

  it("POSTs to /api/finish-edu-attempt instead of inserting directly", async () => {
    renderEduResults();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0];
    expect(url).toBe("/api/finish-edu-attempt");
    expect(init.method).toBe("POST");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("emits a TEST-INVITATION share URL (/test/builder/<testSetId>), never the broken /r/<share_id>", async () => {
    renderEduResults();
    // The score-reveal animation gates the share section behind a ~1.2s
    // setTimeout — bump the default 1s timeout so the input mounts.
    const shareInput = (await screen.findByTestId(
      "quiz-results-share-url",
      {},
      { timeout: 3000 },
    )) as HTMLInputElement;
    expect(shareInput.value).toContain(`/test/builder/${TEST_SET_ID}`);
    expect(shareInput.value).not.toMatch(/\/r\/[A-Z0-9]{8}/);
  });
});
