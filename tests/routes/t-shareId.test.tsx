import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let currentShareId = "abcdefgh";

// AH-14 — the route resolves the test via the get_respondent_test_by_share_id
// RPC (anon SECURITY DEFINER). Mock the supabase client so we control the
// resolved payload without a live DB.
const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

// E45 Phase 2 — the route also preflight-fetches /api/tests/check-password
// before rendering the intake/gate. Stub fetch to resolve as "open" (no
// password) so the existing flow assertions still find the intake.
const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;
beforeEach(() => {
  rpcMock.mockReset();
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

import { Route } from "@/routes/t.$shareId";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

const PUBLISHED_SHARE_ID = "shareid12345";

function resolvedPayload() {
  return {
    data: {
      test: {
        id: "tst_1",
        title: "Sample test",
        description: "Desc",
        intake_fields: [{ id: "if_name", label: "Meno", type: "text", required: true, pii: true }],
        gdpr_purpose: "research",
        allow_behavioral_tracking: false,
        status: "published",
        question_order_mode: "fixed",
      },
      questions: [],
    },
    error: null,
  };
}

describe("/t/$shareId — public respondent flow", () => {
  it("renders not-found banner when shareId is malformed (too short)", async () => {
    currentShareId = "abc";
    render(<Page />);
    await waitFor(() =>
      expect(screen.getByTestId("respondent-flow-error-not-found")).toBeInTheDocument(),
    );
    // Malformed share id is rejected client-side before any RPC.
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("renders not-found banner when the RPC resolves no published test", async () => {
    currentShareId = PUBLISHED_SHARE_ID;
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    render(<Page />);
    await waitFor(() =>
      expect(screen.getByTestId("respondent-flow-error-not-found")).toBeInTheDocument(),
    );
  });

  it("renders the flow root + intake stage for a resolved published test", async () => {
    currentShareId = PUBLISHED_SHARE_ID;
    rpcMock.mockResolvedValueOnce(resolvedPayload());
    render(<Page />);
    await waitFor(() => expect(screen.getByTestId("respondent-flow-root")).toBeInTheDocument());
    expect(screen.getByTestId("respondent-flow-intake-consent-checkbox")).toBeInTheDocument();
    expect(screen.getByTestId("respondent-flow-intake-submit-button")).toBeInTheDocument();
  });

  it("blocks intake submission when consent is missing", async () => {
    currentShareId = PUBLISHED_SHARE_ID;
    rpcMock.mockResolvedValueOnce(resolvedPayload());
    render(<Page />);
    const submit = await screen.findByTestId("respondent-flow-intake-submit-button");
    fireEvent.click(submit);
    expect(screen.getByTestId("respondent-flow-intake-error")).toBeInTheDocument();
  });
});
