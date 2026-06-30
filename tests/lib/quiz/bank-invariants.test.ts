import { describe, it, expect } from "vitest";
import { QUESTIONS } from "@/lib/quiz/bank/questions";

// E60 — structural integrity guards for the question bank. These hold for
// the whole bank and protect the targeted content upgrade from regressions
// (a typo'd `correct` flag, a missing severity, a duplicate id, an empty
// prompt). Content quality is reviewed separately; this is the schema floor.

describe("question bank invariants (E60)", () => {
  it("has unique question ids", () => {
    const ids = QUESTIONS.map((q) => q.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("every question has a non-empty prompt and explanation", () => {
    const bad = QUESTIONS.filter((q) => !q.prompt?.trim() || !q.explanation?.trim());
    expect(bad.map((q) => q.id)).toEqual([]);
  });

  it("every question has at least two options", () => {
    const bad = QUESTIONS.filter((q) => q.options.length < 2);
    expect(bad.map((q) => q.id)).toEqual([]);
  });

  it("every question has exactly one correct option", () => {
    const bad = QUESTIONS.filter((q) => q.options.filter((o) => o.correct).length !== 1);
    expect(bad.map((q) => q.id)).toEqual([]);
  });

  it("the correct option carries no severity; every wrong option carries one", () => {
    const badCorrect = QUESTIONS.filter((q) =>
      q.options.some((o) => o.correct && o.severity !== null),
    );
    const badWrong = QUESTIONS.filter((q) =>
      q.options.some((o) => !o.correct && o.severity === null),
    );
    expect(badCorrect.map((q) => q.id)).toEqual([]);
    expect(badWrong.map((q) => q.id)).toEqual([]);
  });

  it("option ids are unique within each question", () => {
    const bad = QUESTIONS.filter((q) => {
      const ids = q.options.map((o) => o.id);
      return new Set(ids).size !== ids.length;
    });
    expect(bad.map((q) => q.id)).toEqual([]);
  });

  it("difficulty leans toward medium/hard (harder bank)", () => {
    const easy = QUESTIONS.filter((q) => q.difficulty === "easy").length;
    // Easy questions must stay a minority of the bank.
    expect(easy / QUESTIONS.length).toBeLessThan(0.25);
  });
});
