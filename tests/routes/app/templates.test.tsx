import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Template } from "@/lib/platform/types";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigateMock,
    useSearch: () => ({ tab: "public" }),
  };
});

const fixture = (over: Partial<Template>): Template => ({
  id: "tpl_test_1",
  title: "Phishing 101",
  description: "Test description",
  question_ids: ["q1", "q2", "q3"],
  gdpr_purpose: "education",
  owner_id: null,
  visibility: "public",
  fork_of: null,
  status: "published",
  license: "cc-by-4.0",
  author_display_name: null,
  age_rating: "all",
  slug: "phishing-101",
  published_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  created_at: "2026-05-01T00:00:00Z",
  ...over,
});

const publicData: Template[] = [
  fixture({ id: "tpl_a", title: "Phishing 101", gdpr_purpose: "education" }),
  fixture({ id: "tpl_b", title: "HR Screening", gdpr_purpose: "recruitment" }),
];

vi.mock("@/lib/platform/queries", () => ({
  usePublicTemplates: () => ({ data: publicData, isLoading: false }),
  useMyTemplates: () => ({ data: [], isLoading: false }),
  useCurrentProfile: () => ({ data: { id: "test-user-id" } }),
  useDuplicateTemplate: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
  useUpdateOwnTemplate: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
  useDeleteOwnTemplate: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

import { Route } from "@/routes/app.templates";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

const renderPage = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <Page />
    </QueryClientProvider>,
  );
};

describe("/app/templates (E39)", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders the page header and the templates root", () => {
    renderPage();
    expect(screen.getByTestId("templates-root")).toBeInTheDocument();
    expect(screen.getByTestId("templates-page-header")).toBeInTheDocument();
  });

  it("renders both tabs and search/filter controls", () => {
    renderPage();
    expect(screen.getByTestId("templates-tab-public")).toBeInTheDocument();
    expect(screen.getByTestId("templates-tab-mine")).toBeInTheDocument();
    expect(screen.getByTestId("templates-list-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("templates-list-category-filter")).toBeInTheDocument();
  });

  it("renders public templates as cards on the default tab", () => {
    renderPage();
    expect(screen.getByTestId("templates-card-tpl_a")).toBeInTheDocument();
    expect(screen.getByTestId("templates-card-tpl_b")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    renderPage();
    fireEvent.change(screen.getByTestId("templates-list-search-input"), {
      target: { value: "phishing" },
    });
    expect(screen.getByTestId("templates-card-tpl_a")).toBeInTheDocument();
    expect(screen.queryByTestId("templates-card-tpl_b")).not.toBeInTheDocument();
  });

  it("shows a per-tab empty state when search matches nothing", () => {
    renderPage();
    fireEvent.change(screen.getByTestId("templates-list-search-input"), {
      target: { value: "zzz-no-template-matches-xyz" },
    });
    expect(
      screen.queryByTestId("templates-list-empty-state-public-filter") ??
        screen.queryByTestId("templates-list-empty-state-public") ??
        screen.queryByTestId("templates-list-empty-state"),
    ).toBeInTheDocument();
  });

  it("clicking Použiť navigates to /app/tests/new with templateId search param", () => {
    renderPage();
    const card = screen.getByTestId("templates-card-tpl_a");
    const useButton =
      within(card).queryByTestId("templates-card-tpl_a-use-button") ??
      within(card).queryByTestId("templates-row-use-tpl_a") ??
      within(card).getByRole("button", { name: /použ/i });
    fireEvent.click(useButton);
    expect(navigateMock).toHaveBeenCalled();
    const args = navigateMock.mock.calls[0]?.[0] as {
      to?: string;
      search?: { templateId?: string };
    };
    expect(args.to).toBe("/app/tests/new");
    expect(args.search?.templateId).toBe("tpl_a");
  });

  it("never renders gdpr_purpose as a raw enum value (BLOCKER fix from Appendix D)", () => {
    renderPage();
    const card = screen.getByTestId("templates-card-tpl_a");
    expect(within(card).queryByText("education")).not.toBeInTheDocument();
    expect(within(card).queryByText("internal_training")).not.toBeInTheDocument();
    expect(within(card).queryByText("recruitment")).not.toBeInTheDocument();
  });
});
