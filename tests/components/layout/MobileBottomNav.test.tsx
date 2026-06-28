import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";

const locationRef = { current: { pathname: "/" } };

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    useLocation: () => locationRef.current,
    Link: ({
      to,
      children,
      ...rest
    }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={to} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

describe("MobileBottomNav", () => {
  beforeEach(() => {
    locationRef.current = { pathname: "/" };
  });

  it("renders the five tabs with their routes", () => {
    render(<MobileBottomNav menuOpen={false} onOpenMenu={() => {}} />);
    expect(screen.getByTestId("mobile-bottomnav-item-home")).toHaveAttribute("href", "/");
    expect(screen.getByTestId("mobile-bottomnav-item-tests")).toHaveAttribute("href", "/tests");
    expect(screen.getByTestId("mobile-bottomnav-item-quicktest")).toHaveAttribute("href", "/test");
    expect(screen.getByTestId("mobile-bottomnav-item-academy")).toHaveAttribute("href", "/academy");
    expect(screen.getByTestId("mobile-bottomnav-item-menu")).toBeInTheDocument();
  });

  it("marks the active tab with aria-current on a matching subpath", () => {
    locationRef.current = { pathname: "/academy/email-phishing" };
    render(<MobileBottomNav menuOpen={false} onOpenMenu={() => {}} />);
    expect(screen.getByTestId("mobile-bottomnav-item-academy")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("mobile-bottomnav-item-home")).not.toHaveAttribute("aria-current");
  });

  it("does not mark /tests as active when on the /test quick-test route", () => {
    locationRef.current = { pathname: "/test" };
    render(<MobileBottomNav menuOpen={false} onOpenMenu={() => {}} />);
    expect(screen.getByTestId("mobile-bottomnav-item-tests")).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("mobile-bottomnav-item-quicktest")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens the menu sheet via the Menu tab", () => {
    const onOpenMenu = vi.fn();
    render(<MobileBottomNav menuOpen={false} onOpenMenu={onOpenMenu} />);
    fireEvent.click(screen.getByTestId("mobile-bottomnav-item-menu"));
    expect(onOpenMenu).toHaveBeenCalledOnce();
  });

  it("reflects the open state on the Menu tab (aria-expanded)", () => {
    render(<MobileBottomNav menuOpen={true} onOpenMenu={() => {}} />);
    expect(screen.getByTestId("mobile-bottomnav-item-menu")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("has no a11y violations", async () => {
    const { container } = render(<MobileBottomNav menuOpen={false} onOpenMenu={() => {}} />);
    await expectNoA11yViolations(container);
  });
});
