import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

beforeAll(() => {
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useRouterState: () => "/admin",
  };
});

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AdminSidebar />
    </SidebarProvider>,
  );
}

describe("AdminSidebar", () => {
  it("renders the sidebar root and all required nav links", () => {
    renderSidebar();
    expect(screen.getByTestId("admin-shell-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-users")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-questions")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-tests")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-support")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-settings")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-trainings")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell-sidebar-link-categories")).toBeInTheDocument();
  });
});
