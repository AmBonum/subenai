import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";
import { AcademyQuiz } from "@/components/academy/AcademyQuiz";

// "p-sms-posta-1": option "b" (Ignorujem …) is correct; "a"/"c" are wrong.
const QID = "p-sms-posta-1";

describe("AcademyQuiz", () => {
  it("renders options and no feedback until answered", () => {
    render(<AcademyQuiz questionId={QID} />);
    expect(screen.getByTestId("academy-quiz")).toBeInTheDocument();
    expect(screen.getAllByTestId("academy-quiz-option").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByTestId("academy-quiz-feedback")).toBeNull();
  });

  it("shows immediate feedback + the explanation after answering", () => {
    render(<AcademyQuiz questionId={QID} />);
    fireEvent.click(screen.getByText(/Ignorujem/));
    expect(screen.getByTestId("academy-quiz-feedback")).toBeInTheDocument();
    expect(screen.getByText(/neposiela platobné linky/)).toBeInTheDocument();
  });

  it("resets back to the unanswered state", () => {
    render(<AcademyQuiz questionId={QID} />);
    fireEvent.click(screen.getByText(/Kliknem a zaplatím/));
    expect(screen.getByTestId("academy-quiz-feedback")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("academy-quiz-reset"));
    expect(screen.queryByTestId("academy-quiz-feedback")).toBeNull();
  });

  it("renders a safe notice for an unknown question id", () => {
    render(<AcademyQuiz questionId="does-not-exist" />);
    expect(screen.getByTestId("academy-quiz-missing")).toBeInTheDocument();
    expect(screen.queryByTestId("academy-quiz")).toBeNull();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<AcademyQuiz questionId={QID} />);
    await expectNoA11yViolations(container);
  });
});
