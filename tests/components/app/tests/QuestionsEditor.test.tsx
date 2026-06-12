import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { LibraryQuestion } from "@/lib/platform/types";

const addMutateMock = vi.fn();
const removeMutateMock = vi.fn();
const reorderMutateMock = vi.fn();

const LIBRARY: LibraryQuestion[] = [
  {
    id: "q-a",
    prompt: "Question A — first",
    type: "single",
    branch_slug: "phishing",
    difficulty: "easy",
    status: "approved",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "q-b",
    prompt: "Question B — second",
    type: "single",
    branch_slug: "phishing",
    difficulty: "medium",
    status: "approved",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "q-c",
    prompt: "Question C — third (not in test)",
    type: "single",
    branch_slug: "phishing",
    difficulty: "easy",
    status: "approved",
    created_at: "2026-01-01T00:00:00Z",
  },
];

vi.mock("@/lib/platform/queries", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/platform/queries")>("@/lib/platform/queries");
  return {
    ...actual,
    useLibraryQuestions: () => ({ data: LIBRARY, isLoading: false, error: null }),
    useAddQuestionsToTest: () => ({ mutate: addMutateMock, isPending: false }),
    useRemoveQuestionFromTest: () => ({ mutate: removeMutateMock, isPending: false }),
    useUpdateTestQuestionOrder: () => ({ mutate: reorderMutateMock, isPending: false }),
  };
});

import { QuestionsEditor } from "@/components/app/tests/QuestionsEditor";

describe("QuestionsEditor", () => {
  beforeEach(() => {
    addMutateMock.mockReset();
    removeMutateMock.mockReset();
    reorderMutateMock.mockReset();
  });

  it("renders the empty state with a CTA when the test has no questions", () => {
    render(<QuestionsEditor testId="tst-1" questionIds={[]} />);
    expect(screen.getByTestId("test-editor-questions-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-questions-empty-cta")).toBeInTheDocument();
  });

  it("renders existing questions in order with library-resolved prompts", () => {
    render(<QuestionsEditor testId="tst-1" questionIds={["q-a", "q-b"]} />);
    const list = screen.getByTestId("test-editor-questions-list");
    expect(list).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-questions-row-q-a-prompt").textContent).toContain(
      "Question A",
    );
    expect(screen.getByTestId("test-editor-questions-row-q-b-prompt").textContent).toContain(
      "Question B",
    );
  });

  it("opens the picker and forwards selected ids to the add mutation", () => {
    render(<QuestionsEditor testId="tst-1" questionIds={["q-a"]} />);
    fireEvent.click(screen.getByTestId("test-editor-questions-add-button"));
    expect(screen.getByTestId("question-picker-dialog")).toBeInTheDocument();
    // q-a is already in the test → excluded. q-b + q-c are pickable.
    fireEvent.click(screen.getByTestId("question-picker-row-q-c-checkbox"));
    fireEvent.click(screen.getByTestId("question-picker-submit-button"));
    expect(addMutateMock).toHaveBeenCalledTimes(1);
    expect(addMutateMock.mock.calls[0][0]).toEqual(["q-c"]);
  });

  it("calls the remove mutation when the trash button is clicked", () => {
    render(<QuestionsEditor testId="tst-1" questionIds={["q-a", "q-b"]} />);
    fireEvent.click(screen.getByTestId("test-editor-questions-row-q-a-remove"));
    expect(removeMutateMock).toHaveBeenCalledTimes(1);
    expect(removeMutateMock.mock.calls[0][0]).toBe("q-a");
  });

  it("calls the reorder mutation with the swapped order when 'down' is clicked", () => {
    render(<QuestionsEditor testId="tst-1" questionIds={["q-a", "q-b"]} />);
    fireEvent.click(screen.getByTestId("test-editor-questions-row-q-a-down"));
    expect(reorderMutateMock).toHaveBeenCalledTimes(1);
    expect(reorderMutateMock.mock.calls[0][0]).toEqual(["q-b", "q-a"]);
  });

  it("disables 'up' on the first item and 'down' on the last item", () => {
    render(<QuestionsEditor testId="tst-1" questionIds={["q-a", "q-b"]} />);
    expect(screen.getByTestId("test-editor-questions-row-q-a-up")).toBeDisabled();
    expect(screen.getByTestId("test-editor-questions-row-q-b-down")).toBeDisabled();
  });
});
