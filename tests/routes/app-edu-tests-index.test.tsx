/**
 * E38 Phase F — `/app/edu-tests` claim list page.
 *
 * The route component is rendered in isolation (not via the router) so
 * the test scopes to RPC↔render glue. Four phases pinned:
 *  - unauthenticated visitor → "Sign in" empty state, no RPC fired
 *  - authenticated + RPC ok → list of claimed sets
 *  - authenticated + RPC empty → "you haven't linked any" empty state
 *  - authenticated + RPC error → error state
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

type RpcResult = { data: unknown; error: { message: string } | null };

const authStateRef = { current: { isAuthenticated: false, isAdmin: false } };
const rpcSpy = vi.fn<(...args: unknown[]) => Promise<RpcResult>>().mockResolvedValue({
  data: [],
  error: null,
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authStateRef.current,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcSpy(...args),
  },
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createLazyFileRoute: () => () => ({}),
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

import { EduTestsList } from "@/routes/app.edu-tests.index.lazy";

describe("/app/edu-tests — claim list page", () => {
  beforeEach(() => {
    rpcSpy.mockClear();
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
  });

  it("shows the unauthenticated empty state when no session is present", async () => {
    render(<EduTestsList />);
    expect(await screen.findByTestId("edu-tests-unauthenticated")).toBeInTheDocument();
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("renders the list when list_my_test_sets returns rows", async () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    rpcSpy.mockResolvedValueOnce({
      data: [
        {
          id: "set-1",
          creator_label: "Onboarding Q1 2026",
          passing_threshold: 70,
          question_count: 15,
          collects_responses: true,
          created_at: "2026-05-15T10:00:00.000Z",
          attempts_count: 7,
          last_attempt_at: "2026-05-19T12:00:00.000Z",
        },
      ],
      error: null,
    });
    render(<EduTestsList />);
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledWith("list_my_test_sets"));
    expect(await screen.findByTestId("edu-tests-list")).toBeInTheDocument();
    expect(screen.getByText("Onboarding Q1 2026")).toBeInTheDocument();
  });

  it("renders the empty state when RPC returns []", async () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    rpcSpy.mockResolvedValueOnce({ data: [], error: null });
    render(<EduTestsList />);
    expect(await screen.findByTestId("edu-tests-empty")).toBeInTheDocument();
  });

  it("renders the error state when RPC returns an error", async () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    rpcSpy.mockResolvedValueOnce({ data: null, error: { message: "rls denied" } });
    render(<EduTestsList />);
    expect(await screen.findByTestId("edu-tests-error")).toBeInTheDocument();
  });

  it("renders the untitled placeholder when creator_label is null", async () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    rpcSpy.mockResolvedValueOnce({
      data: [
        {
          id: "set-2",
          creator_label: null,
          passing_threshold: 60,
          question_count: 10,
          collects_responses: true,
          created_at: "2026-05-15T10:00:00.000Z",
          attempts_count: 0,
          last_attempt_at: null,
        },
      ],
      error: null,
    });
    render(<EduTestsList />);
    expect(await screen.findByTestId("edu-tests-item-set-2")).toBeInTheDocument();
    expect(screen.getByText("Edu test bez názvu")).toBeInTheDocument();
  });
});
