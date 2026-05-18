import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const challengeAndVerify = vi.fn();
const consumeBackupCode = vi.fn();
const listFactors = vi.fn();
const navigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigate,
    useSearch: () => ({ redirect: "/admin" }),
    redirect: actual.redirect,
  };
});

vi.mock("@/lib/auth/mfa", () => ({
  challengeAndVerify: (...args: unknown[]) => challengeAndVerify(...args),
  consumeBackupCode: (code: string) => consumeBackupCode(code),
  listFactors: () => listFactors(),
  getAALStatus: vi.fn().mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal2" }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u" } } } }) },
  },
}));

import { Route } from "@/routes/login_.verify-2fa";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/login/verify-2fa", () => {
  it("verifies TOTP code and navigates to /admin", async () => {
    listFactors.mockResolvedValue({ totp: [{ id: "f1", status: "verified" }] });
    challengeAndVerify.mockResolvedValue(undefined);
    navigate.mockClear();

    render(<Page />);
    fireEvent.change(screen.getByTestId("verify-2fa-code-input"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-submit-button"));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: "/admin" });
    });
  });

  it("toggles to backup code input and consumes a code", async () => {
    consumeBackupCode.mockResolvedValue(true);
    navigate.mockClear();

    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    expect(screen.getByTestId("verify-2fa-backup-form")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("verify-2fa-backup-input"), {
      target: { value: "AAAA-BBBB" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-backup-submit-button"));
    await waitFor(() => {
      expect(consumeBackupCode).toHaveBeenCalledWith("AAAA-BBBB");
      expect(navigate).toHaveBeenCalledWith({ to: "/admin" });
    });
  });

  it("shows error when backup code is rejected", async () => {
    consumeBackupCode.mockResolvedValue(false);

    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    fireEvent.change(screen.getByTestId("verify-2fa-backup-input"), {
      target: { value: "BADC-ODEX" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-backup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-2fa-backup-error")).toBeInTheDocument();
    });
  });
});
