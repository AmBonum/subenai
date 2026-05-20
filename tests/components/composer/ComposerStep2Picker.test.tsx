import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/i18n/quiz", () => ({
  tFor: () => (key: string, vars?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      step_2_zero_state_cta: "Začni výberom z balíkov vyššie alebo si pridaj otázky →",
      step_2_open_picker: "Vybrať z banky (243 otázok)",
      step_2_close_picker: "Hotovo, zavri výber",
      step_2_summary_singular: `${vars?.count} vybraná otázka`,
      step_2_summary_few: `${vars?.count} vybrané otázky`,
      step_2_summary_many: `${vars?.count} vybraných otázok`,
      category_label: "Kategória",
      difficulty_label: "Obtiažnosť",
      search_aria: "Hľadaj v texte otázky",
      search_placeholder: "Hľadaj v texte otázky…",
      selected_count: `Vybraných: ${vars?.count} / ${vars?.max}`,
      filter_count: `${vars?.shown} z ${vars?.total} otázok zodpovedá filtru`,
      empty: "empty",
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

import { ComposerStep2Picker } from "@/components/composer/build/ComposerStep2Picker";
import type { Question } from "@/lib/quiz/bank/questions";

const fakeQuestions: Question[] = [
  {
    id: "q1",
    prompt: "Question 1",
    category: "phishing",
    difficulty: "easy",
  } as Question,
  {
    id: "q2",
    prompt: "Question 2",
    category: "url",
    difficulty: "medium",
  } as Question,
];

describe("ComposerStep2Picker — E33 Phase 1 collapsed-by-default wrapper", () => {
  it("renders the summary card by default with zero-state copy when nothing is selected", () => {
    render(
      <ComposerStep2Picker questions={fakeQuestions} selectedIds={new Set()} onToggle={() => {}} />,
    );
    expect(screen.getByTestId("composer-step-2-summary")).toBeInTheDocument();
    expect(screen.getByTestId("composer-step-2-summary-text")).toHaveTextContent(
      "Začni výberom z balíkov",
    );
  });

  it("does NOT render the full picker by default (the whole UX gap this fixes)", () => {
    render(
      <ComposerStep2Picker questions={fakeQuestions} selectedIds={new Set()} onToggle={() => {}} />,
    );
    expect(screen.queryByTestId("composer-step-2-picker")).not.toBeInTheDocument();
  });

  it("clicking the toggle expands the picker", () => {
    render(
      <ComposerStep2Picker questions={fakeQuestions} selectedIds={new Set()} onToggle={() => {}} />,
    );
    fireEvent.click(screen.getByTestId("composer-step-2-toggle"));
    expect(screen.getByTestId("composer-step-2-picker")).toBeInTheDocument();
    expect(screen.getByTestId("composer-step-2-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking the toggle again collapses the picker", () => {
    render(
      <ComposerStep2Picker questions={fakeQuestions} selectedIds={new Set()} onToggle={() => {}} />,
    );
    const toggle = screen.getByTestId("composer-step-2-toggle");
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.queryByTestId("composer-step-2-picker")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("summary text uses singular form when count=1", () => {
    render(
      <ComposerStep2Picker
        questions={fakeQuestions}
        selectedIds={new Set(["q1"])}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByTestId("composer-step-2-summary-text")).toHaveTextContent(
      "1 vybraná otázka",
    );
  });

  it("summary text uses few form for count 2-4", () => {
    render(
      <ComposerStep2Picker
        questions={fakeQuestions}
        selectedIds={new Set(["q1", "q2"])}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByTestId("composer-step-2-summary-text")).toHaveTextContent(
      "2 vybrané otázky",
    );
  });

  it("summary text uses many form for count >= 5", () => {
    render(
      <ComposerStep2Picker
        questions={fakeQuestions}
        selectedIds={new Set(["q1", "q2", "q3", "q4", "q5"])}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByTestId("composer-step-2-summary-text")).toHaveTextContent(
      "5 vybraných otázok",
    );
  });
});
