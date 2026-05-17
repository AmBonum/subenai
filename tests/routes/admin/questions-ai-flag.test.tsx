import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: () => async () => null }),
  }),
  useServerFn: () => async () => null,
}));

import { QuestionEditor } from "@/components/admin/QuestionEditor";

describe("AiQuestionGenerator flag gate", () => {
  it("does not render the AI button when aiEnabled is false (default)", () => {
    render(<QuestionEditor open onOpenChange={() => {}} question={null} />);
    expect(screen.queryByTestId("question-editor-ai-button")).not.toBeInTheDocument();
  });

  it("renders the AI button when aiEnabled is true", () => {
    render(<QuestionEditor open onOpenChange={() => {}} question={null} aiEnabled />);
    expect(screen.getByTestId("question-editor-ai-button")).toBeInTheDocument();
  });
});
