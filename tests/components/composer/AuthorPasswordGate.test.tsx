/**
 * E38 Phase F — claim affordance on the password gate.
 *
 * Asserts the two new copy variants render based on auth state and that
 * a successful submit fires the claim RPC when authenticated. The
 * pre-existing password-verify happy path is exercised by the
 * /verify-author-password CF function suite — this file scopes to the
 * E38-specific surface so failures point at the right place.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const authStateRef = { current: { isAuthenticated: false, isAdmin: false } };
const rpcSpy = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });

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

import { AuthorPasswordGate } from "@/components/composer/edu/dashboard/AuthorPasswordGate";

const SET_ID = "11111111-2222-3333-4444-555555555555";

function mockOkResponse() {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  ) as typeof fetch;
}

describe("<AuthorPasswordGate> — E38 claim affordance", () => {
  beforeEach(() => {
    rpcSpy.mockClear();
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
  });

  it("shows the anonymous sign-up nudge when the visitor is not signed in", () => {
    render(<AuthorPasswordGate setId={SET_ID} onAuthenticated={() => {}} />);
    expect(screen.getByTestId("vysledky-gate-claim-hint-anonymous")).toBeInTheDocument();
    const link = screen.getByTestId("vysledky-gate-claim-signup-link");
    expect(link.getAttribute("href")).toBe("/signup");
    expect(screen.queryByTestId("vysledky-gate-claim-hint-signed-in")).toBeNull();
  });

  it("shows the signed-in confirmation copy when the visitor is authenticated", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<AuthorPasswordGate setId={SET_ID} onAuthenticated={() => {}} />);
    expect(screen.getByTestId("vysledky-gate-claim-hint-signed-in")).toBeInTheDocument();
    expect(screen.queryByTestId("vysledky-gate-claim-hint-anonymous")).toBeNull();
  });

  it("does NOT fire claim_test_set when the password submit fails", async () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;
    render(<AuthorPasswordGate setId={SET_ID} onAuthenticated={() => {}} />);
    fireEvent.change(screen.getByTestId("vysledky-gate-password-input"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByTestId("vysledky-gate-submit-button"));
    await waitFor(() =>
      expect(screen.getByTestId("vysledky-gate-error-message")).toBeInTheDocument(),
    );
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("fires claim_test_set on successful submit when the visitor is signed in", async () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    mockOkResponse();
    const onAuth = vi.fn();
    render(<AuthorPasswordGate setId={SET_ID} onAuthenticated={onAuth} />);
    fireEvent.change(screen.getByTestId("vysledky-gate-password-input"), {
      target: { value: "the-author-password" },
    });
    fireEvent.click(screen.getByTestId("vysledky-gate-submit-button"));
    await waitFor(() => expect(onAuth).toHaveBeenCalledTimes(1));
    expect(rpcSpy).toHaveBeenCalledWith("claim_test_set", {
      set_id: SET_ID,
      password: "the-author-password",
    });
  });

  it("does NOT fire claim_test_set on successful submit when the visitor is anonymous", async () => {
    // Belt-and-braces — anonymous users shouldn't trigger a claim attempt
    // because the RPC requires auth.uid() server-side anyway; firing it
    // would just be a wasted round-trip with a guaranteed `not_authenticated`
    // response. Pinning client-side that we skip it entirely.
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    mockOkResponse();
    const onAuth = vi.fn();
    render(<AuthorPasswordGate setId={SET_ID} onAuthenticated={onAuth} />);
    fireEvent.change(screen.getByTestId("vysledky-gate-password-input"), {
      target: { value: "the-author-password" },
    });
    fireEvent.click(screen.getByTestId("vysledky-gate-submit-button"));
    await waitFor(() => expect(onAuth).toHaveBeenCalledTimes(1));
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
