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

const fixture = (id: string, prompt: string): LibraryQuestion => ({
  id,
  prompt,
  type: "single",
  branch_slug: "phishing",
  difficulty: "easy",
  status: "approved",
  created_at: "2026-05-01T00:00:00Z",
});

const seeded: LibraryQuestion[] = [
  fixture("lq_1", "Phishingová SMS z banky"),
  fixture("lq_2", "Podozrivá doména e-shopu"),
  fixture("lq_3", "Vnuk volá z neznámeho čísla"),
];

vi.mock("@/lib/platform/queries", () => ({
  useLibraryQuestions: () => ({ data: seeded, isLoading: false, error: null }),
}));

import { Route } from "@/routes/app.library";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/library — search filtering", () => {
  it("typing into the search input narrows the visible rows", () => {
    render(<Page />);
    const allRowsBefore = screen.queryAllByTestId(/^library-row-(?!preview-)/).length;
    expect(allRowsBefore).toBe(3);

    const input = screen.getByTestId("library-search-input");
    fireEvent.change(input, { target: { value: "phish" } });

    const allRowsAfter = screen.queryAllByTestId(/^library-row-(?!preview-)/).length;
    expect(allRowsAfter).toBe(1);
    expect(screen.getByTestId("library-row-lq_1")).toBeInTheDocument();
  });
});
