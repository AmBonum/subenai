// E49 Phase 1 — SessionsList component contract:
// - empty + loading + paginated rendering branches
// - filter change resets page to 0 and re-invokes the query
// - row "open detail" anchor points at the side-sheet route

import type { ComponentProps, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { Session, TestSessionsPage } from "@/lib/platform/types";

const useTestSessionsMock = vi.fn();

vi.mock("@/lib/platform/queries", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/platform/queries")>("@/lib/platform/queries");
  return {
    ...actual,
    useTestSessions: (
      testId: string | undefined,
      opts?: Parameters<typeof actual.useTestSessions>[1],
    ) => useTestSessionsMock(testId, opts),
  };
});

vi.mock("@tanstack/react-router", () => ({
  // Minimal Link shim — exposes `to` + params on data-attrs so the test
  // can assert the navigation target without booting a router.
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: unknown;
    params?: Record<string, string>;
    children: ReactNode;
  } & ComponentProps<"a">) => (
    <a
      role="link"
      data-to={typeof to === "string" ? to : ""}
      data-params={params ? JSON.stringify(params) : ""}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const copyToClipboardMock = vi.fn(async (_text: string) => true);
vi.mock("@/lib/browser/clipboard", () => ({
  copyToClipboard: (text: string) => copyToClipboardMock(text),
}));

import { SessionsList } from "@/components/app/tests/SessionsList";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-1",
    test_id: "test-1",
    version: 1,
    respondent_id: "",
    intake_data: { name: "Anna Nováková", email: "anna@example.com" },
    consent_given: true,
    answers: [],
    started_at: "2026-05-01T10:00:00Z",
    finished_at: "2026-05-01T10:05:00Z",
    score: 78,
    status: "completed",
    segment: null,
    ip_hash: "abcd1234",
    ...overrides,
  };
}

function mkResp(rows: Session[], total = rows.length, pageSize = 20): TestSessionsPage {
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

beforeEach(() => {
  useTestSessionsMock.mockReset();
});

describe("SessionsList", () => {
  it("renders the loading skeleton while the query is pending", () => {
    useTestSessionsMock.mockReturnValue({ data: undefined, isLoading: true });
    render(<SessionsList testId="test-1" />);
    expect(screen.getByTestId("test-sessions-list-loading")).toBeInTheDocument();
  });

  it("renders the no-data empty state when there are no sessions and no filter", () => {
    useTestSessionsMock.mockReturnValue({
      data: mkResp([], 0),
      isLoading: false,
    });
    render(<SessionsList testId="test-1" />);
    const empty = screen.getByTestId("test-sessions-list-empty");
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toMatch(/zatiaľ nemá respondentov/i);
  });

  // E50 review fix (7) — zero-sessions empty state surfaces the share link
  // for published tests and a publish CTA for drafts.
  it("published + 0 sessions: shows the share-link CTA and copies the /t/ URL", async () => {
    useTestSessionsMock.mockReturnValue({ data: mkResp([], 0), isLoading: false });
    render(<SessionsList testId="test-1" status="published" shareId="abc123XYZ0" />);
    expect(screen.getByTestId("test-sessions-list-empty-published-title").textContent).toBe(
      "Test zatiaľ nemá respondentov.",
    );
    fireEvent.click(screen.getByTestId("test-sessions-list-empty-copy-link-button"));
    await waitFor(() => expect(copyToClipboardMock).toHaveBeenCalledTimes(1));
    expect(copyToClipboardMock.mock.calls[0][0]).toMatch(/\/t\/abc123XYZ0$/);
  });

  it("draft + 0 sessions: shows the needs-publishing copy and fires the publish CTA", () => {
    useTestSessionsMock.mockReturnValue({ data: mkResp([], 0), isLoading: false });
    const onRequestPublish = vi.fn();
    render(
      <SessionsList
        testId="test-1"
        status="draft"
        shareId="abc123XYZ0"
        onRequestPublish={onRequestPublish}
      />,
    );
    expect(screen.getByTestId("test-sessions-list-empty-draft-title").textContent).toBe(
      "Test ešte nie je publikovaný.",
    );
    expect(
      screen.queryByTestId("test-sessions-list-empty-copy-link-button"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("test-sessions-list-empty-publish-button"));
    expect(onRequestPublish).toHaveBeenCalledTimes(1);
  });

  it("renders rows with respondent identity, score, and a link to the detail route", () => {
    useTestSessionsMock.mockReturnValue({
      data: mkResp([makeSession()]),
      isLoading: false,
    });
    render(<SessionsList testId="test-1" />);
    const row = screen.getByTestId("test-sessions-list-row-sess-1");
    expect(row).toBeInTheDocument();
    expect(row.textContent).toContain("Anna Nováková");
    expect(row.textContent).toContain("78%");

    // With `Button asChild` + Link, the test-id propagates to the inner
    // anchor element rather than a wrapper. Accept either shape.
    const openEl = screen.getByTestId("test-sessions-list-row-sess-1-open");
    const anchor = openEl.tagName === "A" ? openEl : openEl.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("data-to")).toBe("/app/tests/$testId/sessions/$sessionId");
    expect(anchor!.getAttribute("data-params")).toBe(
      JSON.stringify({ testId: "test-1", sessionId: "sess-1" }),
    );
  });

  it("falls back to email then anonymous label when name is missing", () => {
    useTestSessionsMock.mockReturnValue({
      data: mkResp([
        makeSession({ id: "sess-a", intake_data: { email: "bob@example.com" } }),
        makeSession({ id: "sess-b", intake_data: {} }),
      ]),
      isLoading: false,
    });
    render(<SessionsList testId="test-1" />);
    expect(screen.getByTestId("test-sessions-list-row-sess-a").textContent).toContain(
      "bob@example.com",
    );
    expect(screen.getByTestId("test-sessions-list-row-sess-b").textContent).toContain(
      "Anonymný respondent",
    );
  });

  it("re-invokes useTestSessions with page=0 after the debounced search commits", async () => {
    useTestSessionsMock.mockReturnValue({ data: mkResp([]), isLoading: false });
    render(<SessionsList testId="test-1" />);

    // First render: defaults
    expect(useTestSessionsMock).toHaveBeenCalled();
    const firstOpts = useTestSessionsMock.mock.calls[0][1] as {
      page: number;
      search: string;
    };
    expect(firstOpts.page).toBe(0);
    expect(firstOpts.search).toBe("");

    fireEvent.change(screen.getByTestId("test-sessions-list-search-input"), {
      target: { value: "anna" },
    });

    // Debounced: the keystroke itself must NOT reach the query.
    const immediately = useTestSessionsMock.mock.calls.at(-1)![1] as { search: string };
    expect(immediately.search).toBe("");

    await waitFor(() => {
      const last = useTestSessionsMock.mock.calls.at(-1)![1] as {
        page: number;
        search: string;
      };
      expect(last.search).toBe("anna");
      expect(last.page).toBe(0);
    });
  });

  it("disables Prev on the first page and Next on the last page", () => {
    useTestSessionsMock.mockReturnValue({
      data: mkResp([makeSession()], 1, 20),
      isLoading: false,
    });
    render(<SessionsList testId="test-1" />);
    const prev = screen.getByTestId("test-sessions-list-pagination-prev");
    const next = screen.getByTestId("test-sessions-list-pagination-next");
    expect((prev as HTMLButtonElement).disabled).toBe(true);
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("test-sessions-list-pagination-info").textContent).toMatch(/1–1 z 1/);
  });
});
