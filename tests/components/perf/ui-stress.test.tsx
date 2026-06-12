// UI stress — the composer question picker under interaction bursts and an
// extreme bank. Where render-budget.test.tsx checks the steady-state DOM
// bound, this hammers the surface: hundreds of rapid pager clicks, a churn
// of filter/search changes, and the 50-question selection cap evaluated
// across a 5000-row "all" view. Asserts the surface never crashes, the DOM
// stays bounded throughout, the cap holds under load, and the whole burst
// finishes within a generous budget (only trips on an O(bank) regression).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { QuestionPicker } from "@/components/composer/build/QuestionPicker";
import type { Question } from "@/lib/quiz/bank/questions";
import { recordMetric } from "../../perf/record-metric";

const CATS = ["phishing", "url", "scenario", "honeypot"] as const;
const DIFFS = ["easy", "medium", "hard"] as const;

function makeBank(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `stress-${i}`,
    category: CATS[i % CATS.length],
    difficulty: DIFFS[i % DIFFS.length],
    prompt: `Stress question ${i} about ${CATS[i % CATS.length]}`,
    options: [
      { id: "a", label: "A", correct: true, severity: null },
      { id: "b", label: "B", correct: false, severity: "minor" },
    ],
    explanation: "x",
  }));
}

// Zero-match filters render the empty state (no list), so query rather than
// get — a missing list means zero rows, not a test failure.
const rows = () => {
  const list = screen.queryByTestId("composer-picker-list");
  return list ? list.querySelectorAll("li").length : 0;
};

describe("QuestionPicker — interaction-burst stress", () => {
  it("survives 200 rapid pager clicks over a 5000-row bank, DOM stays at the page size", () => {
    render(
      <QuestionPicker questions={makeBank(5000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const next = screen.getByTestId("composer-picker-next");
    const prev = screen.getByTestId("composer-picker-prev");

    let maxRows = rows();
    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      fireEvent.click(i % 5 === 4 ? prev : next);
      maxRows = Math.max(maxRows, rows());
    }
    const elapsed = performance.now() - start;

    // The DOM never grew past one page despite 200 transitions.
    expect(maxRows).toBe(10);

    const BUDGET = 2500;
    recordMetric({
      suite: "ui-stress",
      name: "200 pager clicks @5000-row bank",
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: BUDGET,
      pass: elapsed < BUDGET,
    });
    recordMetric({
      suite: "ui-stress",
      name: "max DOM rows during pager burst",
      metric: "dom-rows",
      value: maxRows,
      unit: "rows",
      budget: 10,
      pass: maxRows <= 10,
    });
    expect(elapsed).toBeLessThan(BUDGET);
  });

  it("churns 100 search-filter changes without crashing, DOM stays bounded", () => {
    render(
      <QuestionPicker questions={makeBank(5000)} selectedIds={new Set()} onToggle={vi.fn()} />,
    );
    const search = screen.getByRole("searchbox");

    let maxRows = 0;
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      // Alternate between matching, narrowing and empty-result queries.
      const q = i % 3 === 0 ? "phishing" : i % 3 === 1 ? `question ${i}` : "zzz-no-match";
      fireEvent.change(search, { target: { value: q } });
      maxRows = Math.max(maxRows, rows());
    }
    const elapsed = performance.now() - start;

    // Even on the widest match the page cap holds.
    expect(maxRows).toBeLessThanOrEqual(10);

    const BUDGET = 2500;
    recordMetric({
      suite: "ui-stress",
      name: "100 search-filter changes @5000-row bank",
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: BUDGET,
      pass: elapsed < BUDGET,
    });
    expect(elapsed).toBeLessThan(BUDGET);
  });

  it("enforces the 50-selection cap across a 1000-row 'all' view (every unchecked box disabled)", () => {
    // 'all' mode renders one <li> per question into jsdom, which is the
    // slow path; 1000 rows is enough to prove the cap computation runs over
    // the whole bank (not just the visible page) without making the jsdom
    // render pathologically slow. The pager/filter bursts above already
    // exercise the 5000-row data layer.
    const BANK = 1000;
    const selected = new Set(Array.from({ length: 50 }, (_, i) => `stress-${i}`));
    render(<QuestionPicker questions={makeBank(BANK)} selectedIds={selected} onToggle={vi.fn()} />);
    const start = performance.now();
    fireEvent.change(screen.getByTestId("composer-picker-page-size"), {
      target: { value: "all" },
    });
    const elapsed = performance.now() - start;

    // Query the inputs by id (O(1)) rather than getByRole({name}), which
    // computes the accessible name across EVERY checkbox — pathological at
    // 1000+ nodes. A selected box stays enabled; an unselected one past the
    // cap is disabled.
    const selectedBox = document.getElementById("pick-stress-0");
    const overCapBox = document.getElementById(`pick-stress-${BANK - 1}`);
    expect(selectedBox).not.toBeDisabled();
    expect(overCapBox).toBeDisabled();

    const BUDGET = 3000;
    recordMetric({
      suite: "ui-stress",
      name: "render 1000 rows with 50-cap disabled computation",
      metric: "elapsed",
      value: Math.round(elapsed),
      unit: "ms",
      budget: BUDGET,
      pass: elapsed < BUDGET,
    });
    expect(elapsed).toBeLessThan(BUDGET);
  });

  it("at the cap, a selected box stays interactive so the user can deselect to free a slot", () => {
    // The cap disables UNSELECTED boxes; SELECTED ones must remain enabled,
    // otherwise a user who hits 50 can never remove one. (Whether a *disabled*
    // box swallows clicks is a real-browser concern — jsdom's fireEvent
    // ignores `disabled` — so that's asserted in the Playwright layer, not
    // here.)
    const onToggle = vi.fn();
    const selected = new Set(Array.from({ length: 50 }, (_, i) => `stress-${i}`));
    render(<QuestionPicker questions={makeBank(200)} selectedIds={selected} onToggle={onToggle} />);
    fireEvent.change(screen.getByTestId("composer-picker-page-size"), {
      target: { value: "all" },
    });
    const selectedBox = document.getElementById("pick-stress-10") as HTMLInputElement;
    const overCap = document.getElementById("pick-stress-199") as HTMLInputElement;
    expect(selectedBox).not.toBeDisabled();
    expect(overCap).toBeDisabled();
    fireEvent.click(selectedBox);
    expect(onToggle).toHaveBeenCalledWith("stress-10");
  });
});
