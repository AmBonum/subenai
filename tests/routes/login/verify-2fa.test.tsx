import type { JSX } from "react";
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
    consumeBackupCode.mockResolvedValue("ok");
    navigate.mockClear();

    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    expect(screen.getByTestId("verify-2fa-backup-form")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("verify-2fa-backup-input"), {
      target: { value: "ABCD1234-EF567890" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-backup-submit-button"));
    await waitFor(() => {
      expect(consumeBackupCode).toHaveBeenCalledWith("ABCD1234-EF567890");
      expect(navigate).toHaveBeenCalledWith({ to: "/admin" });
    });
  });

  it("shows error when backup code is rejected", async () => {
    consumeBackupCode.mockResolvedValue("invalid");

    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    fireEvent.change(screen.getByTestId("verify-2fa-backup-input"), {
      target: { value: "BADC0DE5-12345678" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-backup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-2fa-backup-error")).toBeInTheDocument();
    });
  });

  it("renders Slovak invalid-code message when TOTP verify rejects with 'invalid' and does not navigate", async () => {
    listFactors.mockResolvedValue({ totp: [{ id: "f1", status: "verified" }] });
    challengeAndVerify.mockRejectedValue(new Error("Invalid TOTP code"));
    navigate.mockClear();

    render(<Page />);
    fireEvent.change(screen.getByTestId("verify-2fa-code-input"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-2fa-error").textContent).toBe("Kód nie je správny.");
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("renders generic Slovak error on non-invalid (e.g. rate-limit) failure", async () => {
    listFactors.mockResolvedValue({ totp: [{ id: "f1", status: "verified" }] });
    challengeAndVerify.mockRejectedValue(new Error("429 Too Many Requests"));
    navigate.mockClear();

    render(<Page />);
    fireEvent.change(screen.getByTestId("verify-2fa-code-input"), {
      target: { value: "555555" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-2fa-error").textContent).toBe(
        "Nastala chyba. Skúste to znova.",
      );
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("uppercases backup-code input as the user types", () => {
    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    const input = screen.getByTestId("verify-2fa-backup-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abcd1234-ef567890" } });
    expect(input.value).toBe("ABCD1234-EF567890");
  });

  it("shows the refresh-failed message and does NOT navigate when the session refresh fails after consume", async () => {
    consumeBackupCode.mockResolvedValue("refresh_failed");
    navigate.mockClear();

    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    fireEvent.change(screen.getByTestId("verify-2fa-backup-input"), {
      target: { value: "ABCD1234-EF567890" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-backup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-2fa-backup-error").textContent).toContain(
        "obnovenie prihlásenia zlyhalo",
      );
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("renders generic error when consumeBackupCode throws (network failure)", async () => {
    consumeBackupCode.mockRejectedValue(new Error("network down"));
    navigate.mockClear();

    render(<Page />);
    fireEvent.click(screen.getByTestId("verify-2fa-use-backup-link"));
    fireEvent.change(screen.getByTestId("verify-2fa-backup-input"), {
      target: { value: "FFFFEEEE-11112222" },
    });
    fireEvent.click(screen.getByTestId("verify-2fa-backup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-2fa-backup-error").textContent).toBe(
        "Nastala chyba. Skúste to znova.",
      );
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});
