import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestAnalyticsPanel } from "@/components/quiz/results/TestAnalyticsPanel";
import type { AnswerRecord } from "@/lib/quiz/score/scoring";

function rec(p: Partial<AnswerRecord> & { responseMs: number }): AnswerRecord {
  return {
    questionId: p.questionId ?? "q",
    optionId: p.optionId === undefined ? "a" : p.optionId,
    correct: p.correct ?? true,
    severity: p.severity ?? null,
    responseMs: p.responseMs,
    category: p.category ?? "phishing",
    difficulty: p.difficulty ?? "easy",
  };
}

describe("TestAnalyticsPanel (E59)", () => {
  it("renders nothing when there are no answers", () => {
    const { container } = render(<TestAnalyticsPanel answers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the headline tiles with derived values", () => {
    render(
      <TestAnalyticsPanel
        answers={[
          rec({ questionId: "q1", responseMs: 1000, difficulty: "easy", correct: true }),
          rec({ questionId: "q2", responseMs: 3000, difficulty: "hard", correct: true }),
          rec({
            questionId: "q3",
            responseMs: 5000,
            difficulty: "hard",
            correct: false,
            severity: "critical",
          }),
        ]}
      />,
    );
    expect(screen.getByTestId("results-analytics-panel")).toBeInTheDocument();
    // total = 9000ms → "9.0s"
    expect(screen.getByTestId("results-analytics-total-time")).toHaveTextContent("9.0s");
    // median of [1000,3000,5000] = 3000ms → "3.0s"
    expect(screen.getByTestId("results-analytics-median-time")).toHaveTextContent("3.0s");
    expect(screen.getByTestId("results-analytics-fastest")).toHaveTextContent("1.0s");
    expect(screen.getByTestId("results-analytics-slowest")).toHaveTextContent("5.0s");
    expect(screen.getByTestId("results-analytics-answered")).toHaveTextContent("3/3");
  });

  it("renders per-difficulty rows only for difficulties that appear", () => {
    render(
      <TestAnalyticsPanel
        answers={[
          rec({ difficulty: "easy", correct: true, responseMs: 1000 }),
          rec({ difficulty: "hard", correct: false, severity: "minor", responseMs: 2000 }),
        ]}
      />,
    );
    expect(screen.getByTestId("results-analytics-difficulty-easy")).toBeInTheDocument();
    expect(screen.getByTestId("results-analytics-difficulty-hard")).toBeInTheDocument();
    expect(screen.queryByTestId("results-analytics-difficulty-medium")).not.toBeInTheDocument();
  });

  it("renders per-category rows only for categories that appear", () => {
    render(
      <TestAnalyticsPanel
        answers={[rec({ category: "phishing", correct: true, responseMs: 1000 })]}
      />,
    );
    expect(screen.getByTestId("results-analytics-category-phishing")).toBeInTheDocument();
    expect(screen.queryByTestId("results-analytics-category-url")).not.toBeInTheDocument();
  });
});
