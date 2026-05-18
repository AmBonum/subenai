// AH-15.7: QuestionEditor sk|en|cs tabs preserve form state across
// switches and the save callback receives the per-locale fields so the
// mutation can write to questions.prompt_en/_cs etc.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual, createFileRoute: () => (config: unknown) => config };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: () => async () => null }),
  }),
  useServerFn: () => async () => null,
}));

import { QuestionEditor } from "@/components/admin/QuestionEditor";
import type { AdminQuestion } from "@/lib/admin/types";

const fixture: AdminQuestion = {
  id: "q1",
  title: "Falošná SMS",
  excerpt: "...",
  body: "Slovenský prompt",
  author_id: "",
  author_name: "",
  categories: ["phishing"],
  status: "published",
  answers_count: 0,
  votes: 0,
  reports_count: 0,
  created_at: new Date().toISOString(),
  answer_set_id: "set-1",
  correct_answer_ids: ["a1"],
  incorrect_answer_ids: ["a2", "a3"],
  body_en: "English prompt",
  body_cs: "",
  options_en: "",
  options_cs: "",
  visual_en: "",
  visual_cs: "",
};

describe("QuestionEditor locale tabs", () => {
  it("renders sk|en|cs tabs with a coverage badge each", () => {
    render(<QuestionEditor open onOpenChange={() => {}} question={fixture} />);
    expect(screen.getByTestId("question-editor-tab-sk")).toBeInTheDocument();
    expect(screen.getByTestId("question-editor-tab-en")).toBeInTheDocument();
    expect(screen.getByTestId("question-editor-tab-cs")).toBeInTheDocument();
    expect(screen.getByTestId("question-editor-tab-status-sk")).toBeInTheDocument();
    expect(screen.getByTestId("question-editor-tab-status-en")).toBeInTheDocument();
    expect(screen.getByTestId("question-editor-tab-status-cs")).toBeInTheDocument();
  });

  it("preserves form state when switching tabs and exposes per-locale fields on save", () => {
    const onSave = vi.fn();
    render(<QuestionEditor open onOpenChange={() => {}} question={fixture} onSave={onSave} />);

    fireEvent.click(screen.getByTestId("question-editor-tab-en"));
    const enBody = screen.getByTestId("question-editor-body-en-input") as HTMLTextAreaElement;
    expect(enBody.value).toBe("English prompt");
    fireEvent.change(enBody, { target: { value: "Updated EN" } });

    fireEvent.click(screen.getByTestId("question-editor-tab-cs"));
    const csBody = screen.getByTestId("question-editor-body-cs-input") as HTMLTextAreaElement;
    expect(csBody.value).toBe("");
    fireEvent.change(csBody, { target: { value: "Český překlad" } });

    fireEvent.click(screen.getByTestId("question-editor-tab-en"));
    expect((screen.getByTestId("question-editor-body-en-input") as HTMLTextAreaElement).value).toBe(
      "Updated EN",
    );

    fireEvent.click(screen.getByTestId("question-editor-save-button"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.body).toBe("Slovenský prompt");
    expect(payload.body_en).toBe("Updated EN");
    expect(payload.body_cs).toBe("Český překlad");
  });

  it("blocks save when a locale options JSON is malformed", () => {
    const onSave = vi.fn();
    render(<QuestionEditor open onOpenChange={() => {}} question={fixture} onSave={onSave} />);
    fireEvent.click(screen.getByTestId("question-editor-tab-en"));
    fireEvent.change(screen.getByTestId("question-editor-options-en-input"), {
      target: { value: "{ not valid json" },
    });
    fireEvent.click(screen.getByTestId("question-editor-save-button"));
    expect(onSave).not.toHaveBeenCalled();
  });
});
