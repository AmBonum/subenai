// Performance-correctness budgets — guard against O(n) DOM blow-ups as the
// data grows. These don't assert wall-clock (flaky in CI); they assert the
// structural invariant that makes the surface fast: the rendered DOM stays
// bounded to a page/cap regardless of how many rows the data layer holds.
// A regression that drops pagination (renders the whole bank) is what these
// catch — the classic "works at 30 rows, janks at 3000" bug.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { QuestionPicker } from "@/components/composer/build/QuestionPicker";
import type { Question } from "@/lib/quiz/bank/questions";
import { recordMetric } from "../../perf/record-metric";

function makeBank(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `perf-${i}`,
    category: "phishing",
    difficulty: "easy",
    prompt: `Perf question ${i}`,
    options: [
      { id: "a", label: "A", correct: true, severity: null },
      { id: "b", label: "B", correct: false, severity: "minor" },
    ],
    explanation: "x",
  }));
}

const checkboxes = () => screen.getAllByRole("checkbox");

describe("QuestionPicker — DOM stays bounded as the bank scales", () => {
  it("renders only the default page (10) of a 1000-question bank", () => {
    render(
      <QuestionPicker questions={makeBank(1000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    // One checkbox per visible item — pagination must cap this at 10.
    expect(checkboxes()).toHaveLength(10);
  });

  it("DOM node count is identical for a 100-row and a 5000-row bank (no O(n) growth)", () => {
    const { unmount } = render(
      <QuestionPicker questions={makeBank(100)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const small = document.querySelectorAll("#" + CSS.escape("pick-perf-0")).length;
    const smallRows = screen.getByTestId("composer-picker-list").querySelectorAll("li").length;
    unmount();

    render(
      <QuestionPicker questions={makeBank(5000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const bigRows = screen.getByTestId("composer-picker-list").querySelectorAll("li").length;

    recordMetric({
      suite: "ui-render-budget",
      name: "DOM rows @100-row bank",
      metric: "dom-rows",
      value: smallRows,
      unit: "rows",
    });
    recordMetric({
      suite: "ui-render-budget",
      name: "DOM rows @5000-row bank",
      metric: "dom-rows",
      value: bigRows,
      unit: "rows",
    });
    expect(small).toBe(1);
    expect(smallRows).toBe(10);
    expect(bigRows).toBe(10);
  });

  it("switching page size to 50 renders exactly 50, not the whole bank", () => {
    render(
      <QuestionPicker questions={makeBank(1000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    fireEvent.change(screen.getByTestId("composer-picker-page-size"), { target: { value: "50" } });
    expect(checkboxes()).toHaveLength(50);
  });

  it("the pager advances through pages without ever exceeding the page size in DOM", () => {
    render(
      <QuestionPicker questions={makeBank(1000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    expect(screen.getByTestId("composer-picker-list").querySelectorAll("li")).toHaveLength(10);
    fireEvent.click(screen.getByTestId("composer-picker-next"));
    expect(screen.getByTestId("composer-picker-list").querySelectorAll("li")).toHaveLength(10);
    // Page 2 shows the next slice, not an accumulation of page 1 + page 2.
    expect(screen.queryByRole("checkbox", { name: /Perf question 0\b/ })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Perf question 10\b/ })).toBeInTheDocument();
  });

  it("a heavy initial render completes within a generous budget (smoke, not a microbenchmark)", () => {
    const start = performance.now();
    render(
      <QuestionPicker questions={makeBank(2000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const elapsed = performance.now() - start;
    recordMetric({
      suite: "ui-render-budget",
      name: "initial render @2000-row bank",
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: 1500,
      pass: elapsed < 1500,
    });
    // Pagination means this should be ~constant work. 1500ms is a loose
    // ceiling that only trips if rendering went O(bank) — not a timing assay.
    expect(elapsed).toBeLessThan(1500);
  });
});
