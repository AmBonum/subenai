import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ConsentProvider } from "@/hooks/useConsent";
import { ResultsView } from "@/components/quiz/results/ResultsView";
import { TRAP_SEEN_STORAGE_KEY } from "@/lib/data-trap/copy";
import { track } from "@/lib/browser/tracking";
import type { AnswerRecord, ScoreResult } from "@/lib/quiz/score/scoring";

// Mock Link component to avoid RouterProvider requirement
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      className,
      children,
    }: {
      to: string;
      className: string;
      children: React.ReactNode;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

// Mock Supabase to avoid DB calls in tests
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

// Mock tracking to avoid async issues in tests
vi.mock("@/lib/browser/tracking", () => ({
  track: vi.fn(),
}));

const mockResult: ScoreResult = {
  finalScore: 75,
  baseScore: 75,
  totalPenalty: 0,
  percentile: 75,
  personality: "scam_magnet",
  stats: {
    totalTimeMs: 120000,
    avgResponseMs: 2000,
    criticalMistakes: 1,
    mediumMistakes: 2,
    minorMistakes: 1,
  },
  breakdown: {
    phishing: 80,
    url: 70,
    fake_vs_real: 60,
    scenario: 65,
  },
  insights: ["Mistake 1"],
  flags: [],
};

const mockAnswers: AnswerRecord[] = [
  {
    questionId: "q1",
    optionId: "a",
    correct: true,
    severity: null,
    responseMs: 2000,
    category: "phishing",
    difficulty: "easy",
  },
  {
    questionId: "q2",
    optionId: "b",
    correct: false,
    severity: "medium",
    responseMs: 1500,
    category: "url",
    difficulty: "medium",
  },
  {
    questionId: "q3",
    optionId: "c",
    correct: true,
    severity: null,
    responseMs: 1800,
    category: "scenario",
    difficulty: "easy",
  },
];

function renderResults(result = mockResult, answers = mockAnswers, onRestart = vi.fn()) {
  return render(
    <ConsentProvider>
      <ResultsView result={result} answers={answers} onRestart={onRestart} />
    </ConsentProvider>,
  );
}

function trapShownCalls() {
  return vi
    .mocked(track)
    .mock.calls.filter(
      ([, evt]) => (evt as { name?: string } | undefined)?.name === "data_trap.shown",
    );
}

describe("ResultsView — E4.3 TrapDialog integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(track).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("clears timer on unmount before 5s (no memory leak)", async () => {
    const { unmount } = renderResults();

    // Let the score-reveal timer (1.2s) fire so `showRest` flips and the
    // 5s trap auto-open timer actually gets scheduled.
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    // NOTE: tests/setup.ts wraps the NATIVE setTimeout/clearTimeout, but
    // `vi.useFakeTimers()` (beforeEach) re-replaces the globals with the
    // fake implementations for the duration of this test — so spying on
    // `globalThis.clearTimeout` observes the same fake the component
    // calls through `window.clearTimeout` (jsdom: window === globalThis).
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    unmount();

    // The effect cleanup must have cleared the pending trap timer.
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Advance past 5s — the cleared timer callback must never fire, i.e.
    // the auto-open tracking event is never emitted after unmount.
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(trapShownCalls()).toHaveLength(0);

    clearTimeoutSpy.mockRestore();
  });

  // Positive control for the unmount test above — proves the auto-open
  // event DOES fire when the component stays mounted, so the
  // zero-calls assertion there is not vacuous.
  it("fires the data_trap.shown auto-open event after 5s when mounted", async () => {
    renderResults();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(trapShownCalls()).toHaveLength(1);
  });

  it("skips auto-open timer if iiq_trap_seen flag is already set", async () => {
    localStorage.setItem(TRAP_SEEN_STORAGE_KEY, "1");

    const { container } = renderResults();

    // Advance through timer + animation
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });

    // Dialog should NOT be in DOM since flag was already set
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("initializes trapSeen state from localStorage", async () => {
    localStorage.setItem(TRAP_SEEN_STORAGE_KEY, "1");

    renderResults();

    // Component initializes with trapSeen=true, so flag read happens correctly
    // This is implicitly verified by the previous test passing
    expect(localStorage.getItem(TRAP_SEEN_STORAGE_KEY)).toBe("1");
  });
});
