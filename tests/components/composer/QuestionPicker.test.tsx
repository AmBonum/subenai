import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionPicker } from "@/components/composer/build/QuestionPicker";
import type { Question } from "@/lib/quiz/bank/questions";

function fixtureQuestion(overrides: Partial<Question> & { id: string }): Question {
  return {
    id: overrides.id,
    category: overrides.category ?? "phishing",
    difficulty: overrides.difficulty ?? "easy",
    prompt: overrides.prompt ?? `Otázka ${overrides.id}`,
    options: [
      { id: "a", label: "A", correct: true, severity: null },
      { id: "b", label: "B", correct: false, severity: "minor" },
    ],
    explanation: "x",
  };
}

const fixtureQuestions: Question[] = [
  fixtureQuestion({
    id: "q1",
    category: "phishing",
    difficulty: "easy",
    prompt: "Banka pošta SMS",
  }),
  fixtureQuestion({ id: "q2", category: "url", difficulty: "medium", prompt: "Nepravá doména" }),
  fixtureQuestion({
    id: "q3",
    category: "scenario",
    difficulty: "hard",
    prompt: "Vnuk volá z neznámeho čísla",
  }),
  fixtureQuestion({
    id: "q4",
    category: "honeypot",
    difficulty: "medium",
    prompt: "Vyzerá podozrivo, ale je legit",
  }),
];

describe("QuestionPicker — render", () => {
  it("lists every passed question by default", () => {
    render(
      <QuestionPicker questions={fixtureQuestions} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    expect(screen.getByText("Banka pošta SMS")).toBeInTheDocument();
    expect(screen.getByText("Nepravá doména")).toBeInTheDocument();
    expect(screen.getByText("Vnuk volá z neznámeho čísla")).toBeInTheDocument();
    expect(screen.getByText("Vyzerá podozrivo, ale je legit")).toBeInTheDocument();
    expect(screen.getByText(/Vybraných:\s*0\s*\/\s*50/)).toBeInTheDocument();
  });

  it("counter reflects selectedIds", () => {
    render(
      <QuestionPicker
        questions={fixtureQuestions}
        selectedIds={new Set(["q1", "q3"])}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/Vybraných:\s*2\s*\/\s*50/)).toBeInTheDocument();
  });
});

describe("QuestionPicker — filtering", () => {
  it("category filter chip narrows the list", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPicker questions={fixtureQuestions} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const categoryGroup = screen.getByRole("group", { name: "Kategória" });
    await user.click(within(categoryGroup).getByRole("button", { name: "URL" }));
    expect(screen.queryByText("Banka pošta SMS")).not.toBeInTheDocument();
    expect(screen.getByText("Nepravá doména")).toBeInTheDocument();
    expect(screen.queryByText("Vnuk volá z neznámeho čísla")).not.toBeInTheDocument();
  });

  it("difficulty filter chip narrows the list", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPicker questions={fixtureQuestions} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const difficultyGroup = screen.getByRole("group", { name: "Obtiažnosť" });
    await user.click(within(difficultyGroup).getByRole("button", { name: "Ťažké" }));
    expect(screen.getByText("Vnuk volá z neznámeho čísla")).toBeInTheDocument();
    expect(screen.queryByText("Banka pošta SMS")).not.toBeInTheDocument();
  });

  it("search input filters case-insensitively in prompt", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPicker questions={fixtureQuestions} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    await user.type(screen.getByRole("searchbox"), "VNUK");
    expect(screen.getByText("Vnuk volá z neznámeho čísla")).toBeInTheDocument();
    expect(screen.queryByText("Banka pošta SMS")).not.toBeInTheDocument();
  });

  it("renders empty state when no question matches filters", async () => {
    const user = userEvent.setup();
    render(
      <QuestionPicker questions={fixtureQuestions} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    await user.type(screen.getByRole("searchbox"), "neexistuje-text");
    expect(screen.getByText(/Filtru nezodpovedá žiadna otázka/i)).toBeInTheDocument();
  });
});

describe("QuestionPicker — toggle behaviour", () => {
  it("calls onToggle with the question id on checkbox click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionPicker questions={fixtureQuestions} selectedIds={new Set()} onToggle={onToggle} />,
    );
    await user.click(screen.getByRole("checkbox", { name: /Banka pošta SMS/ }));
    expect(onToggle).toHaveBeenCalledWith("q1");
  });

  it("disables unchecked checkboxes once 50 are selected (max ceiling)", () => {
    const ceiling = 50;
    const big: Question[] = Array.from({ length: 60 }, (_, i) =>
      fixtureQuestion({ id: `bulk-${i}`, prompt: `Bulk question ${i}` }),
    );
    const selected = new Set(big.slice(0, ceiling).map((q) => q.id));
    render(<QuestionPicker questions={big} selectedIds={selected} onToggle={vi.fn()} />);

    // The cap is a global selection concern, but the list paginates at
    // 10/page — switch to "Všetky" so both the selected #0 and the
    // would-be-over #51 are in the DOM at once.
    fireEvent.change(screen.getByTestId("composer-picker-page-size"), { target: { value: "all" } });

    const stillSelectedCheckbox = screen.getByRole("checkbox", { name: /Bulk question 0\b/ });
    expect(stillSelectedCheckbox).not.toBeDisabled();

    const wouldBeOver = screen.getByRole("checkbox", { name: /Bulk question 51\b/ });
    expect(wouldBeOver).toBeDisabled();
  });
});
