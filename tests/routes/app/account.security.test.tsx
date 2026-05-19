import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/app/account/security" }),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

// AH-12.6: security card now reads MFA factor state on mount. Stub the
// helpers so the page renders deterministically in the "no factor" state.
vi.mock("@/lib/auth/mfa", () => ({
  listFactors: vi.fn().mockResolvedValue({ totp: [] }),
  unenrollFactor: vi.fn().mockResolvedValue(undefined),
  generateBackupCodes: vi.fn().mockResolvedValue([]),
  remainingBackupCodes: vi.fn().mockResolvedValue(0),
}));

import { Route } from "@/routes/app.account.security";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/account/security", () => {
  it("renders password form, sessions list, and 2FA activate button when no factor", async () => {
    render(<Page />);
    expect(screen.getByTestId("app-account-security-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-password-form")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-sessions-list")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-2fa-activate-button")).toBeInTheDocument();
    });
  });

  it("disables submit-password until both inputs match and non-empty", () => {
    render(<Page />);
    const submit = screen.getByTestId("app-account-security-submit-password") as HTMLButtonElement;
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId("app-account-security-current-password"), {
      target: { value: "Heslo123!" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Heslo123!" },
    });
    expect(submit).not.toBeDisabled();
  });
});
