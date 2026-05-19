import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/user/AppShell";

const authStateRef = { current: { isAuthenticated: true, isAdmin: true } };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authStateRef.current,
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      className,
      children,
      ...rest
    }: {
      to: string;
      className?: string;
      children: React.ReactNode;
      [k: string]: unknown;
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: "/app" }),
  };
});

describe("AppShell", () => {
  it("renders sidebar grouped into Tvorba / Výsledky / footer with expected links", () => {
    render(
      <AppShell>
        <div data-testid="child">child</div>
      </AppShell>,
    );
    expect(screen.getByTestId("app-shell-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-group-tvorba")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-group-vysledky")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-group-footer")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-tests")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-templates")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-library")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-audiences")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-history")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-notifications")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-teams")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-account-profile")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-help")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-logout")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar-link-admin")).toBeInTheDocument();
  });

  it("does not render the legacy flat sidebar links (security / dsr / tests_new)", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    expect(screen.queryByTestId("app-shell-sidebar-link-account-security")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-shell-sidebar-link-dsr")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-shell-sidebar-link-tests-new")).not.toBeInTheDocument();
  });

  it("renders the 'Pre lektorov' brand subtitle in the header", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    expect(screen.getByTestId("app-shell-header-brand-subtitle").textContent).toContain(
      "Pre lektorov",
    );
  });

  it("renders provided children inside main", () => {
    render(
      <AppShell>
        <div data-testid="content">hello</div>
      </AppShell>,
    );
    const main = screen.getByTestId("app-shell-main");
    expect(main).toContainElement(screen.getByTestId("content"));
  });

  it("renders current user display name from mock store", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    expect(screen.getByTestId("app-shell-header-user-name").textContent).toBeTruthy();
  });

  it("uses Slovak nav labels from i18n", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    expect(screen.getByTestId("app-shell-sidebar-link-tests").textContent).toContain("Moje testy");
    expect(screen.getByTestId("app-shell-sidebar-link-teams").textContent).toContain("Tím");
  });

  it("hides admin sidebar link for non-admin users", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    try {
      render(
        <AppShell>
          <div />
        </AppShell>,
      );
      expect(screen.queryByTestId("app-shell-sidebar-link-admin")).not.toBeInTheDocument();
    } finally {
      authStateRef.current = { isAuthenticated: true, isAdmin: true };
    }
  });
});
