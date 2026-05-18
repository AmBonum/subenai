import { describe, it, expect } from "vitest";
import { mapDbRowToQuestion, mapDbRowsToQuestions } from "@/lib/quiz/from-db";
import type { QuickTestQuestionRow } from "@/lib/platform/queries";

const baseRow: QuickTestQuestionRow = {
  id: "row-1",
  type: "single",
  prompt: "Klikneš?",
  options: [
    { id: "a", label: "Áno", correct: false, severity: "critical" },
    { id: "b", label: "Nie", correct: true, severity: null },
  ],
  correct: [1],
  branch_slug: "phishing",
  difficulty: "easy",
  visual: { kind: "sms", sender: "InfoSMS", body: "..." },
  order_index: 0,
};

describe("mapDbRowToQuestion", () => {
  it("maps prompt, category, difficulty, options, visual", () => {
    const q = mapDbRowToQuestion(baseRow);
    expect(q.id).toBe("row-1");
    expect(q.category).toBe("phishing");
    expect(q.difficulty).toBe("easy");
    expect(q.prompt).toBe("Klikneš?");
    expect(q.visual).toEqual({ kind: "sms", sender: "InfoSMS", body: "..." });
    expect(q.options).toHaveLength(2);
    expect(q.options[1].correct).toBe(true);
  });

  it("substitutes empty explanation (DB has no explanation column)", () => {
    const q = mapDbRowToQuestion(baseRow);
    expect(q.explanation).toBe("");
  });

  it("omits visual when DB row carries NULL visual", () => {
    const q = mapDbRowToQuestion({ ...baseRow, visual: null });
    expect(q.visual).toBeUndefined();
  });

  it("re-applies correct flags from the `correct` index array", () => {
    const row: QuickTestQuestionRow = {
      ...baseRow,
      options: [
        { id: "a", label: "Áno", correct: false, severity: "critical" },
        { id: "b", label: "Nie", correct: false, severity: null },
      ],
      correct: [1],
    };
    const q = mapDbRowToQuestion(row);
    expect(q.options[0].correct).toBe(false);
    expect(q.options[1].correct).toBe(true);
  });

  it("falls back to `scenario` for unknown branch_slug", () => {
    const q = mapDbRowToQuestion({ ...baseRow, branch_slug: "unknown" });
    expect(q.category).toBe("scenario");
  });

  it("falls back to `medium` for unknown difficulty", () => {
    const q = mapDbRowToQuestion({ ...baseRow, difficulty: "??" });
    expect(q.difficulty).toBe("medium");
  });
});

describe("mapDbRowsToQuestions", () => {
  it("maps an empty array to an empty array", () => {
    expect(mapDbRowsToQuestions([])).toEqual([]);
  });

  it("maps each row in order", () => {
    const rows = [baseRow, { ...baseRow, id: "row-2" }, { ...baseRow, id: "row-3" }];
    const out = mapDbRowsToQuestions(rows);
    expect(out.map((q) => q.id)).toEqual(["row-1", "row-2", "row-3"]);
  });
});
