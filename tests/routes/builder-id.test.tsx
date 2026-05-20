import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({ id: "fixture-set" }),
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  createLazyFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({ openPreferences: vi.fn(), record: null }),
}));

vi.mock("@/components/quiz/flow/TestFlow", () => ({
  TestFlow: ({ config }: { config: { kind: string; testSetId?: string } }) => (
    <div data-testid="test-flow">
      started:{config.kind}:{config.testSetId ?? ""}
    </div>
  ),
}));

// Shared mock state must be hoisted so vi.mock's factory (which runs
// before module imports) can reference it. A plain `let` is in TDZ at
// factory time and would resolve to `undefined`.
const mocks = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
}));

vi.mock("@/integrations/supabase/client", () => {
  // PostgREST-style chainable builder. Every chainable method must return
  // `builder` so any call sequence (.select().eq().maybeSingle(), or the
  // Footer's .select().order().limit()) terminates correctly. Async leaf
  // methods read from the hoisted mock state.
  const builder: {
    select: () => typeof builder;
    eq: () => typeof builder;
    order: () => typeof builder;
    limit: () => Promise<{ data: unknown; error: unknown }>;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  } = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => mocks.result,
  };
  return {
    supabase: {
      from: () => builder,
    },
  };
});

// `BuilderSetView` moved from `test.builder.$id.lazy` to
// `test.builder.$id.index.lazy` on 2026-05-19 (Outlet refactor — parent
// now renders <Outlet /> and the page content lives in the index sibling).
// E33 — renamed export + file from ZostavaView to BuilderSetView (URL
// rebrand to `/test/builder/$id`).
import { BuilderSetView } from "@/routes/test.builder.$id.index.lazy";
import { QUESTIONS } from "@/lib/quiz/bank/questions";

const realIds = QUESTIONS.slice(0, 6).map((q) => q.id);

function setMockResult(value: { data: unknown; error: unknown }) {
  mocks.result = value;
}

describe("BuilderSetView (/test/builder/$id)", () => {
  it("shows loading state initially then renders intro on success", async () => {
    setMockResult({
      data: {
        id: "fixture-set",
        question_ids: realIds,
        passing_threshold: 75,
        max_questions: realIds.length,
        creator_label: "E-shop Q1 2026",
        source_pack_slugs: ["eshop"],
        created_at: "2026-04-28T00:00:00Z",
      },
      error: null,
    });
    render(<BuilderSetView id="fixture-set" />);
    expect(screen.getByText(/Načítavam zostavu/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "E-shop Q1 2026" })).toBeInTheDocument();
    });
    // Threshold + percent are split across text nodes (interpolated value);
    // assert via the parent paragraph's textContent.
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/Vyhovenie pri skóre ≥\s*75\s*%/);
    expect(screen.getByText(/Zostavené z packu: eshop/i)).toBeInTheDocument();
  });

  it("shows generic heading when creator_label is null", async () => {
    setMockResult({
      data: {
        id: "fixture-set",
        question_ids: realIds,
        passing_threshold: 70,
        max_questions: realIds.length,
        creator_label: null,
        source_pack_slugs: null,
        created_at: "2026-04-28T00:00:00Z",
      },
      error: null,
    });
    render(<BuilderSetView id="fixture-set" />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Pripravený test pre teba/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows not_found state when DB returns no row", async () => {
    setMockResult({ data: null, error: null });
    render(<BuilderSetView id="fixture-set" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Test nenájdený/i })).toBeInTheDocument();
    });
  });

  it("shows error state when DB returns an error", async () => {
    setMockResult({ data: null, error: { message: "boom" } });
    render(<BuilderSetView id="fixture-set" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Niečo sa pokazilo/i })).toBeInTheDocument();
    });
  });

  it("warns about missing question IDs in the resolved set (AC-13)", async () => {
    setMockResult({
      data: {
        id: "fixture-set",
        question_ids: [...realIds.slice(0, 5), "q-vanished-after-rename"],
        passing_threshold: 70,
        max_questions: 6,
        creator_label: null,
        source_pack_slugs: null,
        created_at: "2026-04-28T00:00:00Z",
      },
      error: null,
    });
    render(<BuilderSetView id="fixture-set" />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Z pôvodnej zostavy chýba 1 otázka/);
    });
  });

  it("disables Start button when zero questions resolve (set fully drifted)", async () => {
    setMockResult({
      data: {
        id: "fixture-set",
        question_ids: ["q-gone-1", "q-gone-2", "q-gone-3", "q-gone-4", "q-gone-5"],
        passing_threshold: 70,
        max_questions: 5,
        creator_label: null,
        source_pack_slugs: null,
        created_at: "2026-04-28T00:00:00Z",
      },
      error: null,
    });
    render(<BuilderSetView id="fixture-set" />);
    await waitFor(() => {
      const startBtn = screen.getByRole("button", { name: /Spustiť test/i });
      expect(startBtn).toBeDisabled();
    });
  });
});
