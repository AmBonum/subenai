import { describe, it, expect } from "vitest";
import { parseAcademyBody } from "@/lib/academy/shortcodes";

describe("parseAcademyBody", () => {
  it("splits prose and a quiz shortcode into ordered blocks", () => {
    const blocks = parseAcademyBody("Úvod.\n\n[[quiz:p-sms-posta-1]]\n\nZáver.");
    expect(blocks).toEqual([
      { kind: "md", text: "Úvod." },
      { kind: "quiz", questionId: "p-sms-posta-1" },
      { kind: "md", text: "Záver." },
    ]);
  });

  it("returns a single md block when there are no shortcodes", () => {
    const blocks = parseAcademyBody("Len text.\nDruhý riadok.");
    expect(blocks).toEqual([{ kind: "md", text: "Len text.\nDruhý riadok." }]);
  });

  it("supports back-to-back quizzes", () => {
    const blocks = parseAcademyBody("[[quiz:a1]]\n[[quiz:b2]]");
    expect(blocks).toEqual([
      { kind: "quiz", questionId: "a1" },
      { kind: "quiz", questionId: "b2" },
    ]);
  });

  it("leaves an unrecognised shortcode as Markdown text (no crash)", () => {
    const blocks = parseAcademyBody("[[unknown:x]]");
    expect(blocks).toEqual([{ kind: "md", text: "[[unknown:x]]" }]);
  });
});
