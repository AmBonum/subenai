import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/app/account/security" }),
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

// AH-12.6: security card reads MFA factor state on mount. Stub the
// helpers so the page renders deterministically in the "no factor" state.
vi.mock("@/lib/auth/mfa", () => ({
  listFactors: vi.fn().mockResolvedValue({ totp: [] }),
  unenrollFactor: vi.fn().mockResolvedValue(undefined),
  generateBackupCodes: vi.fn().mockResolvedValue([]),
  remainingBackupCodes: vi.fn().mockResolvedValue(0),
}));

// Real password change goes through supabase.auth.updateUser; the
// OAuth-only gate reads supabase.auth.getUser.
const getUserMock = vi.fn();
const updateUserMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  },
}));

import { Route } from "@/routes/app.account.security";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function mockPasswordAccount() {
  getUserMock.mockResolvedValue({
    data: {
      user: {
        app_metadata: { providers: ["email"] },
        identities: [{ provider: "email" }],
      },
    },
    error: null,
  });
}

describe("/app/account/security", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    updateUserMock.mockReset();
    mockPasswordAccount();
    updateUserMock.mockResolvedValue({ data: { user: {} }, error: null });
  });

  it("renders password form and 2FA activate button; the mock sessions card is gone", async () => {
    render(<Page />);
    expect(screen.getByTestId("app-account-security-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-password-form")).toBeInTheDocument();
    expect(screen.queryByTestId("app-account-security-sessions-list")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-2fa-activate-button")).toBeInTheDocument();
    });
  });

  it("disables submit until both password inputs are non-empty", () => {
    render(<Page />);
    const submit = screen.getByTestId("app-account-security-submit-password") as HTMLButtonElement;
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Heslo123!" },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId("app-account-security-confirm-password"), {
      target: { value: "Heslo123!" },
    });
    expect(submit).not.toBeDisabled();
  });

  it("shows the mismatch error and does NOT call updateUser when passwords differ", async () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Heslo123!" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-confirm-password"), {
      target: { value: "Ine-Heslo-456" },
    });
    fireEvent.click(screen.getByTestId("app-account-security-submit-password"));
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-password-error")).toHaveTextContent(
        "Heslá sa nezhodujú.",
      );
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("shows the min-length error for a short password", async () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-confirm-password"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("app-account-security-submit-password"));
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-password-error")).toHaveTextContent(
        "Heslo musí mať aspoň 8 znakov.",
      );
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("calls supabase.auth.updateUser({ password }) and clears the fields on success", async () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Nove-Tajne-Heslo-2026" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-confirm-password"), {
      target: { value: "Nove-Tajne-Heslo-2026" },
    });
    fireEvent.click(screen.getByTestId("app-account-security-submit-password"));
    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: "Nove-Tajne-Heslo-2026" });
    });
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-new-password")).toHaveValue("");
      expect(screen.getByTestId("app-account-security-confirm-password")).toHaveValue("");
    });
  });

  it("maps the reauthentication error to a message linking /forgot-password", async () => {
    updateUserMock.mockResolvedValue({
      data: { user: null },
      error: { code: "reauthentication_needed", message: "Reauthentication needed." },
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Nove-Tajne-Heslo-2026" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-confirm-password"), {
      target: { value: "Nove-Tajne-Heslo-2026" },
    });
    fireEvent.click(screen.getByTestId("app-account-security-submit-password"));
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-password-error")).toBeInTheDocument();
    });
    const link = screen.getByTestId("app-account-security-reauth-forgot-link");
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("maps the same_password error to the dedicated Slovak message", async () => {
    updateUserMock.mockResolvedValue({
      data: { user: null },
      error: {
        code: "same_password",
        message: "New password should be different from the old password.",
      },
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Nove-Tajne-Heslo-2026" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-confirm-password"), {
      target: { value: "Nove-Tajne-Heslo-2026" },
    });
    fireEvent.click(screen.getByTestId("app-account-security-submit-password"));
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-password-error")).toHaveTextContent(
        "Nové heslo musí byť iné ako tvoje súčasné heslo.",
      );
    });
  });

  it("renders the fallback /forgot-password link under the form", () => {
    render(<Page />);
    expect(screen.getByTestId("app-account-security-forgot-link")).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("hides the password form for OAuth-only accounts and explains why", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          app_metadata: { providers: ["google"] },
          identities: [{ provider: "google" }],
        },
      },
      error: null,
    });
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("app-account-security-oauth-only")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("app-account-security-password-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-oauth-only")).toHaveTextContent(
      "Prihlasuješ sa cez Google",
    );
  });
});
