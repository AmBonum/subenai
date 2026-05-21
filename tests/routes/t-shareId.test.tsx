import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, waitFor } from "@testing-library/react";

let currentShareId = "abcdefgh";

// E45 Phase 2 — the route now preflight-fetches /api/tests/check-password
// before rendering the intake/gate. Stub fetch to resolve as "open" (no
// password) so the existing flow assertions still find the intake.
const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ has_password: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => {
      const r = config as Record<string, unknown>;
      return { ...r, useParams: () => ({ shareId: currentShareId }) };
    },
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
    useNavigate: () => () => undefined,
  };
});

import { useTests } from "@/lib/platform/mock-store";
import { Route } from "@/routes/t.$shareId";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function firstPublishedShareId(): string {
  const tests = renderHook(() => useTests()).result.current;
  const t = tests.find((x) => x.status === "published");
  if (!t) throw new Error("seed missing a published test");
  return t.share_id;
}

describe("/t/$shareId — public respondent flow", () => {
  it("renders not-found banner when shareId is too short", () => {
    currentShareId = "abc";
    render(<Page />);
    expect(screen.getByTestId("respondent-flow-error-not-found")).toBeInTheDocument();
  });

  it("renders not-found banner when shareId doesn't match any test", () => {
    currentShareId = "no-such-share-id";
    render(<Page />);
    expect(screen.getByTestId("respondent-flow-error-not-found")).toBeInTheDocument();
  });

  it("renders the flow root + intake stage for a valid published shareId", async () => {
    currentShareId = firstPublishedShareId();
    render(<Page />);
    // Preflight resolves asynchronously to "open" → intake then renders.
    await waitFor(() => expect(screen.getByTestId("respondent-flow-root")).toBeInTheDocument());
    expect(screen.getByTestId("respondent-flow-intake-consent-checkbox")).toBeInTheDocument();
    expect(screen.getByTestId("respondent-flow-intake-submit-button")).toBeInTheDocument();
  });

  it("blocks intake submission when consent is missing", async () => {
    currentShareId = firstPublishedShareId();
    render(<Page />);
    const submit = await screen.findByTestId("respondent-flow-intake-submit-button");
    fireEvent.click(submit);
    expect(screen.getByTestId("respondent-flow-intake-error")).toBeInTheDocument();
  });
});
