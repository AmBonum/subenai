import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const enrollTotp = vi.fn();
const challengeAndVerify = vi.fn();
const generateBackupCodes = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => vi.fn(),
    redirect: actual.redirect,
  };
});

vi.mock("@/lib/auth/mfa", () => ({
  enrollTotp: (...args: unknown[]) => enrollTotp(...args),
  challengeAndVerify: (...args: unknown[]) => challengeAndVerify(...args),
  generateBackupCodes: () => generateBackupCodes(),
  listFactors: vi.fn().mockResolvedValue({ totp: [] }),
  getAALStatus: vi.fn().mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal2" }),
  ISSUER_ADMIN: "subenai.sk admin",
  ISSUER_USER: "subenai.sk",
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u" } } } }) },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  },
}));

import { Route } from "@/routes/login_.enroll-2fa";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/login/enroll-2fa", () => {
  it("walks step 1 -> step 2 -> renders QR", async () => {
    enrollTotp.mockResolvedValue({
      factorId: "f1",
      qrCode: "data:image/png;base64,QR",
      secret: "JBSWY3DPEHPK3PXP",
      uri: "otpauth://...",
    });

    render(<Page />);
    expect(screen.getByTestId("enroll-2fa-step-1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("enroll-2fa-step-1-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("enroll-2fa-qr-image")).toBeInTheDocument();
    });
    expect(screen.getByTestId("enroll-2fa-manual-secret").textContent).toBe("JBSWY3DPEHPK3PXP");
  });

  it("verifies code 123456, shows backup codes on success", async () => {
    enrollTotp.mockResolvedValue({
      factorId: "f1",
      qrCode: "QR",
      secret: "S",
      uri: "U",
    });
    challengeAndVerify.mockResolvedValue(undefined);
    generateBackupCodes.mockResolvedValue([
      "AAAA-BBBB",
      "CCCC-DDDD",
      "EEEE-FFFF",
      "GGGG-HHHH",
      "IIII-JJJJ",
      "KKKK-LLLL",
      "MMMM-NNNN",
      "OOOO-PPPP",
    ]);

    render(<Page />);
    fireEvent.click(screen.getByTestId("enroll-2fa-step-1-continue"));
    await waitFor(() => screen.getByTestId("enroll-2fa-qr-image"));
    fireEvent.click(screen.getByTestId("enroll-2fa-step-2-continue"));
    expect(screen.getByTestId("enroll-2fa-step-3")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("enroll-2fa-code-input"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByTestId("enroll-2fa-verify-button"));
    await waitFor(() => {
      expect(screen.getByTestId("enroll-2fa-step-4")).toBeInTheDocument();
    });
    expect(screen.getByTestId("enroll-2fa-backup-codes-list").children).toHaveLength(8);
  });

  it("shows error on verify failure", async () => {
    enrollTotp.mockResolvedValue({ factorId: "f1", qrCode: "QR", secret: "S", uri: "U" });
    challengeAndVerify.mockRejectedValue(new Error("Invalid code"));

    render(<Page />);
    fireEvent.click(screen.getByTestId("enroll-2fa-step-1-continue"));
    await waitFor(() => screen.getByTestId("enroll-2fa-qr-image"));
    fireEvent.click(screen.getByTestId("enroll-2fa-step-2-continue"));
    fireEvent.change(screen.getByTestId("enroll-2fa-code-input"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByTestId("enroll-2fa-verify-button"));
    await waitFor(() => {
      expect(screen.getByTestId("enroll-2fa-error")).toBeInTheDocument();
    });
  });
});
