import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";

// vi.hoisted lets the mock factories below capture mutable state without
// running into the TDZ — vi.mock is hoisted above imports, plain `let`
// would be undefined when the factory runs.
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: { config: undefined as string | undefined },
  publishedPacks: [] as Array<{
    slug: string;
    title: string;
    industry: string;
    industryEmoji: string;
    questionIds: string[];
    passingThreshold: number;
    publishedAt: string;
    updatedAt: string;
    tagline: string;
    targetPersona: string;
  }>,
  testFlowProps: null as { config: { kind: string; questions: unknown[] } } | null,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
  useSearch: () => mocks.search,
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

vi.mock("@/integrations/supabase/client", () => {
  // Footer renders inside the page; satisfy its read-builder chain so the
  // unrelated footer_sponsors fetch doesn't crash the render.
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  };
  return { supabase: { from: () => builder } };
});

vi.mock("@/lib/platform/pack-queries", () => ({
  usePlatformPacks: () => ({ data: mocks.publishedPacks, isLoading: false }),
  usePlatformPackQuestionIds: () => ({
    data: new Map(mocks.publishedPacks.map((p) => [p.slug, p.questionIds])),
    isLoading: false,
  }),
}));

vi.mock("@/components/quiz/flow/TestFlow", () => ({
  TestFlow: (props: { config: { kind: string; questions: unknown[] } }) => {
    mocks.testFlowProps = props;
    return <div data-testid="test-flow">started:{props.config.kind}</div>;
  },
}));

const clipboardMock = vi.hoisted(() => ({
  write: vi.fn<(text: string) => Promise<boolean>>(async () => true),
}));
vi.mock("@/lib/browser/clipboard", () => ({
  copyToClipboard: (text: string) => clipboardMock.write(text),
}));

import { ComposerPage } from "@/routes/test.builder.index.lazy";
import { QUESTIONS } from "@/lib/quiz/bank/questions";
import { encodeConfig } from "@/lib/quiz/composer";

const realIds = QUESTIONS.slice(0, 12).map((q) => q.id);

beforeEach(() => {
  mocks.navigate.mockClear();
  mocks.search.config = undefined;
  mocks.publishedPacks = [];
  mocks.testFlowProps = null;
  clipboardMock.write.mockClear();
  clipboardMock.write.mockResolvedValue(true);
});

describe("ComposerPage — stale-pack toast (AC-13)", () => {
  it("surfaces a notice when a pre-loaded pack references missing IDs", async () => {
    mocks.publishedPacks = [
      {
        slug: "stale-mix",
        title: "Stale-mix",
        industry: "eshop",
        industryEmoji: "🧪",
        // Mix 5 real IDs + 2 obviously fake ones — togglePack should warn.
        questionIds: [...realIds.slice(0, 5), "q-vanished-1", "q-vanished-2"],
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    const user = userEvent.setup();
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Stale-mix/ }));
    expect(
      await screen.findByText(/2 otázok bolo premenovaných v banke/i, { exact: false }),
    ).toBeInTheDocument();
  });

  it("hides the notice when the user dismisses it", async () => {
    mocks.publishedPacks = [
      {
        slug: "stale-mix",
        title: "Stale-mix",
        industry: "eshop",
        industryEmoji: "🧪",
        questionIds: [...realIds.slice(0, 5), "q-gone-x"],
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    const user = userEvent.setup();
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Stale-mix/ }));
    const dismiss = await screen.findByRole("button", { name: /Zatvoriť upozornenie/i });
    await user.click(dismiss);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ComposerPage — incoming ?config= drift detection", () => {
  it("warns when the URL config references missing IDs", async () => {
    const draft = encodeConfig({
      questionIds: [...realIds.slice(0, 5), "q-renamed"],
      passingThreshold: 70,
      maxQuestions: 6,
      sourcePackSlugs: ["eshop"],
    });
    mocks.search.config = draft;
    render(<ComposerPage />);
    expect(await screen.findByText(/Z odkazu sa nepodarilo načítať/i)).toBeInTheDocument();
  });
});

describe("ComposerPage — inline self-run (AC-12)", () => {
  it("renders TestFlow with kind 'composer' when 'Spustiť pre seba' is clicked", async () => {
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "good",
        title: "Good pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 8),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Good pack/ }));
    await user.click(screen.getByRole("button", { name: /Spustiť pre seba/ }));
    await waitFor(() => {
      expect(screen.getByTestId("test-flow")).toHaveTextContent("started:composer");
    });
    expect(mocks.testFlowProps?.config.questions).toHaveLength(8);
  });
});

describe("ComposerPage — URL share-out (AC-12)", () => {
  it("shows the URL copy button only when ≤ 10 questions selected", async () => {
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "small",
        title: "Small pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 6),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Small pack/ }));
    expect(
      await screen.findByRole("button", { name: /Skopírovať draft cez URL/i }),
    ).toBeInTheDocument();
  });

  it("hides the URL copy button when > 10 questions selected", async () => {
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "big",
        title: "Big pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 12),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Big pack/ }));
    expect(
      screen.queryByRole("button", { name: /Skopírovať draft cez URL/i }),
    ).not.toBeInTheDocument();
  });

  it("writes a /test/builder?config=… URL via the clipboard helper on click", async () => {
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "small",
        title: "Small pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 6),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Small pack/ }));
    await user.click(await screen.findByRole("button", { name: /Skopírovať draft cez URL/i }));
    expect(clipboardMock.write).toHaveBeenCalledTimes(1);
    const written = clipboardMock.write.mock.calls[0][0] as string;
    expect(written).toContain("/test/builder?config=");
    expect(written.length).toBeGreaterThan(40);
    expect(await screen.findByText(/Odkaz s draftom skopírovaný/i)).toBeInTheDocument();
  });

  it("surfaces a clipboard_failed error when the helper returns false", async () => {
    clipboardMock.write.mockResolvedValueOnce(false);
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "small",
        title: "Small pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 6),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Small pack/ }));
    await user.click(await screen.findByRole("button", { name: /Skopírovať draft cez URL/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/clipboard_failed/);
  });
});

describe("ComposerPage — DB share submit", () => {
  it("POSTs to /api/test-sets and navigates to /test/builder/{id} on success", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "set_xyz" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "good",
        title: "Good pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 8),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Good pack/ }));
    await user.click(screen.getByRole("button", { name: /Zdieľať s tímom/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/test-sets",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/test/builder/$id",
        params: { id: "set_xyz" },
      });
    });
    fetchSpy.mockRestore();
  });

  it("surfaces a typed error when /api/test-sets rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
    );
    const user = userEvent.setup();
    mocks.publishedPacks = [
      {
        slug: "good",
        title: "Good pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: realIds.slice(0, 8),
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /Good pack/ }));
    await user.click(screen.getByRole("button", { name: /Zdieľať s tímom/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/rate_limited/);
  });
});

describe("ComposerPage — selection above the default cap stays publishable", () => {
  it("a pack larger than the default max cap keeps 'Spustiť pre seba' enabled", async () => {
    const user = userEvent.setup();
    // 20 questions > COMPOSER_LIMITS.defaultMax (15). Before the auto-raise
    // fix the "max questions" cap stayed at 15, meetsMax went false, and the
    // self-run/publish controls silently disabled with the only explanation
    // buried in the settings slider. The cap must follow the selection up.
    const bigIds = QUESTIONS.slice(0, 20).map((q) => q.id);
    mocks.publishedPacks = [
      {
        slug: "xl",
        title: "XL pack",
        industry: "eshop",
        industryEmoji: "🛒",
        questionIds: bigIds,
        passingThreshold: 70,
        publishedAt: "2026-04-28",
        updatedAt: "2026-04-28",
        tagline: "x",
        targetPersona: "x",
      },
    ];
    render(<ComposerPage />);
    await user.click(screen.getByRole("button", { name: /XL pack/ }));
    const selfRun = await screen.findByRole("button", { name: /Spustiť pre seba/ });
    expect(selfRun).toBeEnabled();
  });
});
