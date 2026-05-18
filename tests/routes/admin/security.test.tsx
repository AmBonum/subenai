import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const navigateMock = vi.fn();
const listFactorsMock = vi.fn();
const unenrollFactorMock = vi.fn();
const generateBackupCodesMock = vi.fn();
const remainingBackupCodesMock = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigateMock,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...rest}>{children}</a>
    ),
  };
});

vi.mock("@/lib/auth/mfa", () => ({
  listFactors: () => listFactorsMock(),
  unenrollFactor: (id: string) => unenrollFactorMock(id),
  generateBackupCodes: () => generateBackupCodesMock(),
  remainingBackupCodes: () => remainingBackupCodesMock(),
}));

import { Route } from "@/routes/admin/security";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFactorsMock.mockResolvedValue({
      totp: [
        {
          id: "factor-1",
          friendly_name: "Pixel 8 Authenticator",
          status: "verified",
          created_at: "2026-04-01T10:00:00Z",
          factor_type: "totp",
          updated_at: "2026-04-01T10:00:00Z",
        },
      ],
    });
    remainingBackupCodesMock.mockResolvedValue(5);
    unenrollFactorMock.mockResolvedValue(undefined);
    generateBackupCodesMock.mockResolvedValue([
      "AAAA-1111",
      "BBBB-2222",
      "CCCC-3333",
      "DDDD-4444",
      "EEEE-5555",
      "FFFF-6666",
      "GGGG-7777",
      "HHHH-8888",
    ]);
  });

  it("renders factor status and remaining backup-code count", async () => {
    render(<Page />);
    expect(screen.getByTestId("admin-security-page-header-root")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("admin-security-factor-friendly-name")).toHaveTextContent(
        "Pixel 8 Authenticator",
      );
    });
    expect(screen.getByTestId("admin-security-factor-status")).toHaveTextContent("Aktívne");
    expect(screen.getByTestId("admin-security-backup-count")).toHaveTextContent(
      "Zostáva 5 záložných kódov",
    );
    expect(screen.queryByTestId("admin-security-backup-warning")).not.toBeInTheDocument();
  });

  it("reset button opens confirm dialog; confirm unenrolls and navigates to enroll-2fa", async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("admin-security-factor-reset-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("admin-security-factor-reset-button"));
    expect(screen.getByTestId("app-shell-confirm-dialog-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-confirm-dialog-title")).toHaveTextContent(
      "Resetovať autentifikátor?",
    );

    fireEvent.click(screen.getByTestId("app-shell-confirm-dialog-confirm"));
    await waitFor(() => {
      expect(unenrollFactorMock).toHaveBeenCalledWith("factor-1");
    });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/login/enroll-2fa" });
  });

  it("regenerate button confirms then generates and reveals plaintext codes", async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("admin-security-backup-regen-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("admin-security-backup-regen-button"));
    expect(screen.getByTestId("app-shell-confirm-dialog-title")).toHaveTextContent(
      "Vygenerovať nové kódy?",
    );

    fireEvent.click(screen.getByTestId("app-shell-confirm-dialog-confirm"));
    await waitFor(() => {
      expect(generateBackupCodesMock).toHaveBeenCalled();
    });

    expect(await screen.findByTestId("admin-security-new-codes-panel")).toBeInTheDocument();
    expect(screen.getByTestId("admin-security-new-code-AAAA-1111")).toBeInTheDocument();
    expect(screen.getByTestId("admin-security-new-codes-copy")).toBeInTheDocument();
    expect(screen.getByTestId("admin-security-new-codes-download")).toBeInTheDocument();
  });

  it("shows low-backup warning when fewer than 3 codes remain", async () => {
    remainingBackupCodesMock.mockResolvedValue(1);
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("admin-security-backup-warning")).toBeInTheDocument();
    });
    expect(screen.getByTestId("admin-security-backup-count")).toHaveTextContent(
      "Zostáva 1 záložných kódov",
    );
  });

  it("shows empty-state CTA when no factor is registered", async () => {
    listFactorsMock.mockResolvedValue({ totp: [] });
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("admin-security-factor-none")).toBeInTheDocument();
    });
    expect(screen.getByTestId("admin-security-factor-none-cta")).toHaveAttribute(
      "to",
      "/login/enroll-2fa",
    );
    expect(screen.queryByTestId("admin-security-factor-reset-button")).not.toBeInTheDocument();
  });
});
