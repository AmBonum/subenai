import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { LibraryQuestion } from "@/lib/platform/types";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

const fixture = (over: Partial<LibraryQuestion> & { id: string }): LibraryQuestion => ({
  prompt: `Otázka ${over.id}`,
  type: "single",
  branch_slug: "phishing",
  difficulty: "easy",
  status: "approved",
  created_at: "2026-05-01T00:00:00Z",
  ...over,
});

const seeded: LibraryQuestion[] = [
  fixture({ id: "lq_1", prompt: "Falošná SMS z banky", branch_slug: "phishing" }),
  fixture({
    id: "lq_2",
    prompt: "Podozrivá doména e-shopu",
    branch_slug: "url",
    difficulty: "medium",
  }),
  fixture({
    id: "lq_3",
    prompt: "Vnuk volá z neznámeho čísla",
    branch_slug: "scenario",
    difficulty: "hard",
  }),
];

vi.mock("@/lib/platform/queries", () => ({
  useLibraryQuestions: () => ({ data: seeded, isLoading: false, error: null }),
}));

import { Route } from "@/routes/app.library";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/library", () => {
  it("renders seeded questions and the filter controls", () => {
    render(<Page />);
    expect(screen.getByTestId("library-root")).toBeInTheDocument();
    expect(screen.getByTestId("library-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("library-branch-filter")).toBeInTheDocument();
    expect(screen.getByTestId("library-difficulty-filter")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^library-row-/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("library-empty-state")).not.toBeInTheDocument();
  });

  it("renders the DB-backed fields on a card (prompt, type badge, branch, difficulty)", () => {
    render(<Page />);
    const row = screen.getByTestId("library-row-lq_1");
    expect(row).toHaveTextContent("Falošná SMS z banky");
    expect(screen.getByTestId("library-row-preview-lq_1")).toHaveTextContent("Jednovýber");
    expect(row).toHaveTextContent("phishing");
    expect(row).toHaveTextContent("Ľahká");
  });

  it("shows the empty state when search matches nothing", () => {
    render(<Page />);
    const input = screen.getByTestId("library-search-input");
    fireEvent.change(input, {
      target: { value: "zzz-no-question-will-match-this-string-xyz" },
    });
    expect(screen.getByTestId("library-empty-state")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^library-row-[^p]/).length).toBe(0);
  });
});
