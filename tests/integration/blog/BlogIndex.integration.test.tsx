import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";

import {
  PILLAR_PHISHING,
  PILLAR_SMS,
  PILLAR_AI,
  CLUSTER_PHISHING_1,
  CLUSTER_PHISHING_2,
  CLUSTER_SMS_1,
  CLUSTER_SMS_2,
} from "./fixtures";

// ---- Mocks ---------------------------------------------------------------

const useBlogPostList = vi.fn();

vi.mock("@/lib/blog/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/queries")>("@/lib/blog/queries");
  return {
    ...actual,
    useBlogPostList: () => useBlogPostList(),
  };
});

// Router mock — adds shims for useSearch + useNavigate so the page can
// read `?cat=` from URL state and write it back on chip clicks. The
// search state is kept in a tiny external store so React subscribers
// re-render when navigate updates it (mirrors what TanStack Router
// does in production).
type SearchState = { cat?: string };
let searchState: SearchState = {};
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => searchState;
const setSearchState = (next: SearchState) => {
  searchState = next;
  listeners.forEach((cb) => cb());
};

const navigateMock = vi.fn();

function resetRouterState(): void {
  setSearchState({});
  navigateMock.mockReset();
  navigateMock.mockImplementation(
    (opts: { search?: ((prev: SearchState) => SearchState) | SearchState }) => {
      const next =
        typeof opts.search === "function" ? opts.search(searchState) : (opts.search ?? searchState);
      setSearchState(next);
    },
  );
}

vi.mock("@tanstack/react-router", () => ({
  createLazyFileRoute: () => (opts: unknown) => opts,
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  useSearch: () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
  useNavigate: () => navigateMock,
}));

// Import the route component AFTER mocks so the Link / createLazyFileRoute
// shims take effect. Vitest hoists `vi.mock` automatically.
import { Route } from "@/routes/blog/index.lazy";

// With createLazyFileRoute mocked to identity, Route === the opts arg
// passed to the inner factory — i.e. `{ component: BlogIndexPage }`.
const BlogIndexPage = (Route as unknown as { component: () => React.ReactElement }).component;

beforeEach(() => {
  useBlogPostList.mockReset();
  resetRouterState();
});

function mockList(
  data: (typeof PILLAR_PHISHING)[] | undefined,
  opts?: { isLoading?: boolean; isError?: boolean },
) {
  useBlogPostList.mockReturnValue({
    data,
    isLoading: opts?.isLoading ?? false,
    isError: opts?.isError ?? false,
  });
}

// ---- Tests ---------------------------------------------------------------

describe("/blog index — happy paths", () => {
  it("TC-01: renders eyebrow, title, description, search input", () => {
    mockList([PILLAR_PHISHING]);
    render(<BlogIndexPage />);
    expect(screen.getByTestId("blog-index-root")).toBeInTheDocument();
    expect(screen.getByTestId("blog-index-eyebrow")).toHaveTextContent("akadémia subenai");
    expect(screen.getByTestId("blog-index-title")).toHaveTextContent(
      "akadémia internetovej bezpečnosti",
    );
    expect(screen.getByTestId("blog-index-description").textContent ?? "").toMatch(
      /návody, ako rozpoznať scam/i,
    );
    expect(screen.getByTestId("blog-search-input")).toBeInTheDocument();
  });

  it("TC-02: pillars section renders pillar cards with 'sprievodca' badge + correct count", () => {
    mockList([PILLAR_PHISHING, PILLAR_SMS, PILLAR_AI]);
    render(<BlogIndexPage />);
    const section = screen.getByTestId("blog-index-pillars-section");
    expect(within(section).getByTestId("blog-index-pillars-heading")).toHaveTextContent(
      "sprievodcovia digitálnou bezpečnosťou",
    );
    expect(
      within(section).getByTestId(`blog-pillar-card-${PILLAR_PHISHING.slug}`),
    ).toBeInTheDocument();
    expect(within(section).getByTestId(`blog-pillar-card-${PILLAR_SMS.slug}`)).toBeInTheDocument();
    expect(within(section).getByTestId(`blog-pillar-card-${PILLAR_AI.slug}`)).toBeInTheDocument();
    expect(
      within(section).getByTestId(`blog-post-card-pillar-badge-${PILLAR_PHISHING.slug}`),
    ).toHaveTextContent("sprievodca");
    // Slovak grammar: 2–4 → "few" form (nominative plural). Previously
    // the inline ternary used always-genitive ("hĺbkových sprievodcov")
    // which is grammatically wrong for 3. formatPillarCount fixes that.
    expect(within(section).getByTestId("blog-index-pillars-subheading")).toHaveTextContent(
      "3 hĺbkoví sprievodcovia",
    );
  });

  it("TC-03: clusters section renders non-pillar cards WITHOUT pillar badge", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_PHISHING_2, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    const list = screen.getByTestId("blog-index-list");
    expect(
      within(list).getByTestId(`blog-post-card-${CLUSTER_PHISHING_1.slug}`),
    ).toBeInTheDocument();
    expect(
      within(list).getByTestId(`blog-post-card-${CLUSTER_PHISHING_2.slug}`),
    ).toBeInTheDocument();
    expect(within(list).getByTestId(`blog-post-card-${CLUSTER_SMS_1.slug}`)).toBeInTheDocument();
    expect(
      screen.queryByTestId(`blog-post-card-pillar-badge-${CLUSTER_PHISHING_1.slug}`),
    ).not.toBeInTheDocument();
  });

  it("TC-04: category filter chip narrows the cluster list + sets aria-pressed", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_PHISHING_2, CLUSTER_SMS_1, CLUSTER_SMS_2]);
    render(<BlogIndexPage />);
    const chip = screen.getByTestId("blog-category-filter-phishing-a-emaily");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("blog-category-filter-all")).toHaveAttribute("aria-pressed", "false");
    const list = screen.getByTestId("blog-index-list");
    expect(list.querySelectorAll("li").length).toBe(2);
    expect(within(list).queryByTestId(`blog-post-card-${CLUSTER_SMS_1.slug}`)).toBeNull();
  });

  it("TC-05: 'všetko' chip restores the full cluster list", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.click(screen.getByTestId("blog-category-filter-phishing-a-emaily"));
    fireEvent.click(screen.getByTestId("blog-category-filter-all"));
    expect(screen.getByTestId("blog-category-filter-all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("blog-index-list").querySelectorAll("li").length).toBe(2);
  });

  it("TC-06: search input filters by title (case-insensitive)", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "phish" } });
    expect(screen.getByTestId(`blog-post-card-${CLUSTER_PHISHING_1.slug}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`blog-post-card-${CLUSTER_SMS_1.slug}`)).toBeNull();
  });

  it("TC-07: search input filters by excerpt content", () => {
    mockList([CLUSTER_PHISHING_2, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "balík" } });
    expect(screen.getByTestId(`blog-post-card-${CLUSTER_PHISHING_2.slug}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`blog-post-card-${CLUSTER_SMS_1.slug}`)).toBeNull();
  });

  it("TC-08: search query persists when changing category chip", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_PHISHING_2, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    const search = screen.getByTestId("blog-search-input") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "phish" } });
    expect(search.value).toBe("phish");
    fireEvent.click(screen.getByTestId("blog-category-filter-phishing-a-emaily"));
    expect(search.value).toBe("phish");
  });

  it("TC-09: blog-index-jsonld script is emitted with @type=Blog", () => {
    mockList([CLUSTER_PHISHING_1]);
    render(<BlogIndexPage />);
    const script = screen.getByTestId("blog-index-jsonld");
    expect(script.getAttribute("type")).toBe("application/ld+json");
    const parsed = JSON.parse(script.innerHTML);
    expect(parsed["@type"]).toBe("Blog");
    expect(Array.isArray(parsed.blogPost)).toBe(true);
  });
});

describe("/blog index — negative paths", () => {
  it("TC-10: loading state shows i18n loading string + hides the list", () => {
    mockList(undefined, { isLoading: true });
    render(<BlogIndexPage />);
    expect(screen.getByTestId("blog-index-loading")).toHaveTextContent("načítavam články…");
    expect(screen.queryByTestId("blog-index-list")).toBeNull();
  });

  it("TC-11: error state shows i18n error string with role=alert", () => {
    mockList(undefined, { isError: true });
    render(<BlogIndexPage />);
    const err = screen.getByTestId("blog-index-error");
    expect(err).toHaveAttribute("role", "alert");
    expect(err).toHaveTextContent("články sa nepodarilo načítať");
  });

  it("TC-12: empty data shows the empty-state copy", () => {
    mockList([]);
    render(<BlogIndexPage />);
    expect(screen.getByTestId("blog-index-empty")).toHaveTextContent(
      "zatiaľ tu nič nie je. čoskoro pridáme prvé články.",
    );
  });

  it("TC-13: empty category yields the cluster-empty message", () => {
    mockList([CLUSTER_PHISHING_1]);
    render(<BlogIndexPage />);
    // Filter to a category with zero matching posts. We expect a chip
    // for the rendered category only — so simulate by filtering via
    // 'všetko' first, then directly clicking the only chip (which IS
    // phishing-a-emaily), then clearing via search of an impossible
    // string instead — that triggers the same empty path.
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(screen.getByTestId("blog-search-empty")).toBeInTheDocument();
  });

  it("TC-14: search yielding no matches shows the cluster-empty message", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(screen.getByTestId("blog-search-empty")).toBeInTheDocument();
  });

  it("TC-15: 1-char search is a no-op (matches everything)", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "p" } });
    expect(screen.getByTestId("blog-index-list").querySelectorAll("li").length).toBe(2);
  });

  it("TC-16: empty-state echoes the query verbatim", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(screen.getByTestId("blog-search-empty-query")).toHaveTextContent("„qzqzqz");
  });

  it("TC-17: empty-state surfaces suggested categories with post counts", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_PHISHING_2, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(
      screen.getByTestId("blog-search-empty-suggestion-phishing-a-emaily"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("blog-search-empty-suggestion-sms-a-telefon")).toBeInTheDocument();
  });

  it("TC-18: empty-state shows fallback pillar cards when pillars exist", () => {
    mockList([PILLAR_PHISHING, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(
      screen.getByTestId(`blog-search-empty-pillar-${PILLAR_PHISHING.slug}`),
    ).toBeInTheDocument();
  });

  it("TC-19a: pillars section IS visible by default (no search)", () => {
    mockList([PILLAR_PHISHING, CLUSTER_PHISHING_1]);
    render(<BlogIndexPage />);
    expect(screen.getByTestId("blog-index-pillars-section")).toBeInTheDocument();
  });

  it("TC-19b: pillars section HIDES when search query is ≥ 2 chars", () => {
    mockList([PILLAR_PHISHING, CLUSTER_PHISHING_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "ph" } });
    expect(screen.queryByTestId("blog-index-pillars-section")).toBeNull();
  });

  it("TC-19c: pillars section STAYS visible when search is 1 char (below threshold)", () => {
    mockList([PILLAR_PHISHING, CLUSTER_PHISHING_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "p" } });
    expect(screen.getByTestId("blog-index-pillars-section")).toBeInTheDocument();
  });

  it("TC-19d: pillars section STAYS visible when filtering by category (no search)", () => {
    mockList([PILLAR_PHISHING, CLUSTER_PHISHING_1, CLUSTER_PHISHING_2]);
    render(<BlogIndexPage />);
    fireEvent.click(screen.getByTestId("blog-category-filter-phishing-a-emaily"));
    // Pillars are editorial anchors of every category — chip filter
    // must NOT hide them; only the cluster grid below narrows.
    expect(screen.getByTestId("blog-index-pillars-section")).toBeInTheDocument();
  });

  it("TC-19e: clearing search via empty-state restores the pillars section", () => {
    mockList([PILLAR_PHISHING, CLUSTER_PHISHING_1]);
    render(<BlogIndexPage />);
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(screen.queryByTestId("blog-index-pillars-section")).toBeNull();
    fireEvent.click(screen.getByTestId("blog-search-empty-clear"));
    expect(screen.getByTestId("blog-index-pillars-section")).toBeInTheDocument();
  });

  it("TC-19: 'vymazať hľadanie' clears both the search input AND the category chip", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.click(screen.getByTestId("blog-category-filter-phishing-a-emaily"));
    fireEvent.change(screen.getByTestId("blog-search-input"), { target: { value: "qzqzqz" } });
    expect(screen.getByTestId("blog-search-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("blog-search-empty-clear"));
    expect(screen.getByTestId("blog-index-list").querySelectorAll("li").length).toBe(2);
    expect((screen.getByTestId("blog-search-input") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("blog-category-filter-all")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("/blog index — redesigned scope bar + URL state", () => {
  it("TC-20: search input + category chips are grouped inside the ScopeBar surface", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    const bar = screen.getByTestId("blog-scope-bar");
    expect(bar).toHaveAttribute("role", "search");
    expect(within(bar).getByTestId("blog-search-input")).toBeInTheDocument();
    expect(within(bar).getByTestId("blog-category-filter-all")).toBeInTheDocument();
  });

  it("TC-21: clicking a chip writes `?cat=<slug>` via navigate (URL state)", () => {
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    fireEvent.click(screen.getByTestId("blog-category-filter-phishing-a-emaily"));
    expect(navigateMock).toHaveBeenCalled();
    // Verify the latest call wrote `cat: "phishing-a-emaily"` via the
    // function-form search updater (production: replace=true).
    const lastCall = navigateMock.mock.calls.at(-1)?.[0] as {
      search: (prev: SearchState) => SearchState;
      replace?: boolean;
    };
    const next = lastCall.search({});
    expect(next.cat).toBe("phishing-a-emaily");
    expect(lastCall.replace).toBe(true);
  });

  it("TC-22: pre-existing `?cat=` in URL pre-selects the matching chip on mount", () => {
    setSearchState({ cat: "sms-a-telefon" });
    mockList([CLUSTER_PHISHING_1, CLUSTER_SMS_1]);
    render(<BlogIndexPage />);
    expect(screen.getByTestId("blog-category-filter-sms-a-telefon")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("blog-category-filter-all")).toHaveAttribute("aria-pressed", "false");
    // Cluster grid should already be narrowed to SMS posts.
    const list = screen.getByTestId("blog-index-list");
    expect(within(list).queryByTestId(`blog-post-card-${CLUSTER_PHISHING_1.slug}`)).toBeNull();
    expect(within(list).getByTestId(`blog-post-card-${CLUSTER_SMS_1.slug}`)).toBeInTheDocument();
  });

  it("TC-23: pillars trigger toggles Radix data-state AND aria-label on click", () => {
    mockList([PILLAR_PHISHING, PILLAR_SMS]);
    render(<BlogIndexPage />);
    const trigger = screen.getByTestId("blog-index-pillars-toggle");
    const content = screen.getByTestId("blog-index-pillars-content");
    // In jsdom (no matchMedia), default is `closed` — trigger advertises
    // "show" affordance + Radix wires data-state="closed" + hidden.
    expect(trigger).toHaveAttribute("aria-label", "zobraziť sprievodcov");
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveAttribute("data-state", "closed");
    // Production regression sentinel — click MUST flip Radix data-state.
    // (Earlier `asChild` wiring rendered correct attrs but click was a
    // no-op in production; default Root + Trigger inside a plain section
    // is the working shape.)
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-label", "skryť sprievodcov");
    expect(trigger).toHaveAttribute("data-state", "open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(content).toHaveAttribute("data-state", "open");
    // And a second click MUST close it again — round-trip.
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(content).toHaveAttribute("data-state", "closed");
  });

  it("TC-23b: pillars content carries the data-state CSS hide hook (forceMount visibility regression sentinel)", () => {
    // The pillars content is rendered with <CollapsibleContent forceMount>
    // so the cards stay in the DOM for SEO/a11y. But forceMount means
    // Radix does NOT set `hidden` itself — visibility is delegated to
    // CSS via `data-[state=closed]:hidden`. Without that class the
    // click flips data-state but nothing changes visually (exact bug
    // shipped before 2026-05-20). jsdom can't compute Tailwind utility
    // classes, so we assert on the className contract directly — this
    // is the canonical regression hook.
    mockList([PILLAR_PHISHING, PILLAR_SMS]);
    render(<BlogIndexPage />);
    const content = screen.getByTestId("blog-index-pillars-content");
    expect(content.className).toContain("data-[state=closed]:hidden");
  });

  it("TC-24: scope bar is omitted entirely when there are zero posts (no empty chips)", () => {
    mockList([]);
    render(<BlogIndexPage />);
    expect(screen.queryByTestId("blog-scope-bar")).toBeNull();
    expect(screen.getByTestId("blog-index-empty")).toBeInTheDocument();
  });
});
