import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useCurrentProfile = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: { children: React.ReactNode; to?: string } & Record<string, unknown>) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/lib/platform/queries", () => ({
  useCurrentProfile: () => useCurrentProfile(),
}));

import { ProfileCompletionBanner } from "@/components/auth/ProfileCompletionBanner";

describe("ProfileCompletionBanner", () => {
  beforeEach(() => {
    useCurrentProfile.mockReset();
    window.localStorage.clear();
  });

  it("shows the banner when display_name equals the email's local part", () => {
    useCurrentProfile.mockReturnValue({
      data: {
        id: "user-1",
        email: "jane.doe@example.com",
        display_name: "jane.doe",
        avatar_initials: "JD",
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    render(<ProfileCompletionBanner />);
    expect(screen.getByTestId("app-profile-completion-banner")).toBeInTheDocument();
    expect(screen.getByTestId("app-profile-completion-cta")).toHaveAttribute(
      "href",
      "/app/account/profile",
    );
  });

  it("hides the banner when display_name is a proper full name", () => {
    useCurrentProfile.mockReturnValue({
      data: {
        id: "user-1",
        email: "jane.doe@example.com",
        display_name: "Jane Doe",
        avatar_initials: "JD",
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    render(<ProfileCompletionBanner />);
    expect(screen.queryByTestId("app-profile-completion-banner")).not.toBeInTheDocument();
  });

  it("stays hidden after dismiss persists to localStorage", () => {
    useCurrentProfile.mockReturnValue({
      data: {
        id: "user-1",
        email: "jane.doe@example.com",
        display_name: "jane.doe",
        avatar_initials: "JD",
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    const { unmount } = render(<ProfileCompletionBanner />);
    fireEvent.click(screen.getByTestId("app-profile-completion-dismiss"));
    expect(screen.queryByTestId("app-profile-completion-banner")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("subenai.profile-banner.dismissed.user-1")).toBe("1");
    unmount();
    render(<ProfileCompletionBanner />);
    expect(screen.queryByTestId("app-profile-completion-banner")).not.toBeInTheDocument();
  });

  it("renders nothing when profile is not loaded yet", () => {
    useCurrentProfile.mockReturnValue({ data: undefined });
    const { container } = render(<ProfileCompletionBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
