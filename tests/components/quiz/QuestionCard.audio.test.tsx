import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionCard } from "@/components/quiz/flow/QuestionCard";
import type { Question } from "@/lib/quiz/bank/questions";

const audioQuestion: Question = {
  id: "audio-q",
  category: "scenario",
  difficulty: "medium",
  prompt: "Volá ti banka?",
  visual: { kind: "call", caller: "365.bank", number: "+421 2 000" },
  options: [
    { id: "a", label: "Potvrdím", correct: false, severity: "critical" },
    { id: "b", label: "Zložím", correct: true, severity: null },
  ],
  explanation: "x",
  audio: {
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=SbZz2Q2t-aU",
    title: "Podvod na telefóne",
    sourceName: "Tatra banka",
  },
};

const plainQuestion: Question = { ...audioQuestion, id: "plain-q", audio: undefined };

describe("QuestionCard — sound-gated scam-call audio (E62)", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows no audio UI on a question without audio", () => {
    render(<QuestionCard question={plainQuestion} index={0} total={1} onAnswer={vi.fn()} />);
    expect(screen.queryByTestId("quiz-flow-audio")).not.toBeInTheDocument();
  });

  it("gates the player behind an opt-in when sounds are off (default)", () => {
    render(<QuestionCard question={audioQuestion} index={0} total={1} onAnswer={vi.fn()} />);
    expect(screen.getByTestId("quiz-flow-audio")).toBeInTheDocument();
    expect(screen.getByTestId("quiz-flow-audio-enable")).toBeInTheDocument();
    expect(screen.queryByTestId("scam-audio-embed")).not.toBeInTheDocument();
  });

  it("reveals the audio embed after the reader enables sound", () => {
    render(<QuestionCard question={audioQuestion} index={0} total={1} onAnswer={vi.fn()} />);
    fireEvent.click(screen.getByTestId("quiz-flow-audio-enable"));
    expect(screen.getByTestId("scam-audio-embed")).toBeInTheDocument();
    expect(screen.queryByTestId("quiz-flow-audio-enable")).not.toBeInTheDocument();
  });
});
