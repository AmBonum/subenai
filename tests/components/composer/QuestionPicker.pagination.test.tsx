import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/i18n/quiz", () => ({
  tFor: () => (key: string, vars?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      category_label: "Kategória",
      difficulty_label: "Obtiažnosť",
      search_aria: "Hľadaj v texte otázky",
      search_placeholder: "Hľadaj v texte otázky…",
      selected_count: `Vybraných: ${vars?.count} / ${vars?.max}`,
      filter_count: `${vars?.shown} z ${vars?.total} otázok zodpovedá filtru`,
      empty: "empty",
      per_page_label: "Na stranu:",
      per_page_all: "Všetky",
      pager_prev: "Predchádzajúca",
      pager_next: "Ďalšia",
      pager_status: `Strana ${vars?.page} z ${vars?.total}`,
      pager_aria: "Stránkovanie otázok",
      "categories.phishing": "Phishing",
      "categories.url": "URL",
      "categories.fake_vs_real": "Fake vs. real",
      "categories.scenario": "Scenár",
      "categories.honeypot": "Vyzerá podozrivo, ale OK",
      "difficulties.easy": "Easy",
      "difficulties.medium": "Medium",
      "difficulties.hard": "Hard",
    };
    return map[key] ?? key;
  },
}));

import { QuestionPicker } from "@/components/composer/build/QuestionPicker";
import type { Question } from "@/lib/quiz/bank/questions";

// 23 questions → 3 pages at the default size of 10.
const QUESTIONS: Question[] = Array.from({ length: 23 }, (_, i) => ({
  id: `q-${i + 1}`,
  prompt: `Question ${i + 1}`,
  category: "phishing",
  difficulty: "easy",
  options: [],
  explanation: "",
}));

function rows() {
  return within(screen.getByTestId("composer-picker-list")).getAllByRole("listitem");
}

describe("QuestionPicker — pagination", () => {
  it("defaults to 10 per page and reports the page count", () => {
    render(<QuestionPicker questions={QUESTIONS} selectedIds={new Set()} onToggle={() => {}} />);
    expect(screen.getByTestId("composer-picker-page-size")).toHaveValue("10");
    expect(rows()).toHaveLength(10);
    expect(screen.getByTestId("composer-picker-page-status")).toHaveTextContent("Strana 1 z 3");
    expect(screen.getByTestId("composer-picker-prev")).toBeDisabled();
    expect(screen.getByTestId("composer-picker-next")).toBeEnabled();
  });

  it("renders the remainder on the last page and disables next there", () => {
    render(<QuestionPicker questions={QUESTIONS} selectedIds={new Set()} onToggle={() => {}} />);
    fireEvent.click(screen.getByTestId("composer-picker-next"));
    fireEvent.click(screen.getByTestId("composer-picker-next"));
    expect(screen.getByTestId("composer-picker-page-status")).toHaveTextContent("Strana 3 z 3");
    expect(rows()).toHaveLength(3); // 23 - 20
    expect(screen.getByTestId("composer-picker-next")).toBeDisabled();
    expect(
      within(screen.getByTestId("composer-picker-list")).getByText("Question 21"),
    ).toBeInTheDocument();
  });

  it("changing the page size re-paginates and resets to page 1", () => {
    render(<QuestionPicker questions={QUESTIONS} selectedIds={new Set()} onToggle={() => {}} />);
    fireEvent.click(screen.getByTestId("composer-picker-next"));
    expect(screen.getByTestId("composer-picker-page-status")).toHaveTextContent("Strana 2 z 3");
    fireEvent.change(screen.getByTestId("composer-picker-page-size"), { target: { value: "25" } });
    expect(rows()).toHaveLength(23);
    // 23 ≤ 25 → single page → pager removed.
    expect(screen.queryByTestId("composer-picker-pager")).not.toBeInTheDocument();
  });

  it("'Všetky' shows every row and removes the pager", () => {
    render(<QuestionPicker questions={QUESTIONS} selectedIds={new Set()} onToggle={() => {}} />);
    fireEvent.change(screen.getByTestId("composer-picker-page-size"), { target: { value: "all" } });
    expect(rows()).toHaveLength(23);
    expect(screen.queryByTestId("composer-picker-pager")).not.toBeInTheDocument();
  });

  it("search resets to page 1 and re-counts", () => {
    render(<QuestionPicker questions={QUESTIONS} selectedIds={new Set()} onToggle={() => {}} />);
    fireEvent.click(screen.getByTestId("composer-picker-next"));
    expect(screen.getByTestId("composer-picker-page-status")).toHaveTextContent("Strana 2 z 3");
    // "Question 1" substring matches 1, 10-19 → 11 rows → 2 pages.
    fireEvent.change(screen.getByTestId("composer-picker-search"), {
      target: { value: "Question 1" },
    });
    expect(screen.getByTestId("composer-picker-page-status")).toHaveTextContent("Strana 1 z 2");
    expect(screen.getByTestId("composer-picker-prev")).toBeDisabled();
  });
});
