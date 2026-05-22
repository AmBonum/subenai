import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const params: { testId: string } = { testId: "tst_unknown" };
const searchState: {
  tab: "results" | "analytics" | "questions" | "settings";
  share?: string;
} = {
  tab: "results",
};

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useParams: () => params,
    useSearch: () => searchState,
    useNavigate: () => (arg: { search?: unknown }) => {
      if (typeof arg.search === "function") {
        const next = (arg.search as (p: typeof searchState) => typeof searchState)(searchState);
        searchState.tab = next.tab;
      }
    },
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, string>)}>{children}</a>
    ),
    Outlet: () => null,
  };
});

import { Route } from "@/routes/app.tests.$testId";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/tests/$testId (AH-5.3 editor)", () => {
  beforeEach(() => {
    searchState.tab = "results";
    searchState.share = undefined;
  });

  it("renders the not-found state for an unknown id", () => {
    params.testId = "tst_does_not_exist_xyz";
    render(<Page />);
    expect(screen.getByTestId("test-editor-not-found")).toBeInTheDocument();
  });

  it("renders the editor with tabs for a real test", () => {
    // tst_001 is the first SEED_TESTS row owned by usr_me.
    params.testId = "tst_002";
    render(<Page />);
    expect(screen.getByTestId("test-editor-root")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-tabs-results")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-tabs-analytics")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-tabs-questions")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-tabs-settings")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-share-button")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-publish-button")).toBeInTheDocument();
  });

  it("renders the Questions tab editor with count + add button", () => {
    params.testId = "tst_002";
    searchState.tab = "questions";
    render(<Page />);
    expect(screen.getByTestId("test-editor-questions-panel")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-questions-root")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-questions-count")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-questions-add-button")).toBeInTheDocument();
  });

  it("renders the Order Mode toggle on the Settings tab with both options", () => {
    params.testId = "tst_002";
    searchState.tab = "settings";
    render(<Page />);
    expect(screen.getByTestId("test-editor-order-mode-root")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-order-mode-option-fixed")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-order-mode-option-random")).toBeInTheDocument();
  });

  it("renders the Invite button on published tests, gated as coming-soon", () => {
    // tst_002 is published in SEED_TESTS, so the invite button is shown.
    params.testId = "tst_002";
    render(<Page />);
    const invite = screen.getByTestId("test-editor-invite-button");
    expect(invite).toBeInTheDocument();
    // Today email_invites is gated as "coming_soon" in FEATURE_GATES.
    // The button must be disabled + carry the gate sentinel + render
    // the ComingSoon badge (NOT the PRO badge). Tooltip trigger wraps
    // the button so keyboard focus + hover both surface the
    // explanatory copy.
    expect(invite).toBeDisabled();
    expect(invite.getAttribute("data-gate")).toBe("coming_soon");
    expect(screen.getByTestId("coming-soon-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("pro-badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("test-editor-invite-tooltip-trigger")).toBeInTheDocument();
  });

  it("does not render the Invite button on draft / archived tests", () => {
    // tst_004 is draft per the SEED_TESTS status cycle ([published x3, draft, archived]).
    params.testId = "tst_004";
    render(<Page />);
    expect(screen.queryByTestId("test-editor-invite-button")).not.toBeInTheDocument();
  });

  it("settings tab exposes title input + save button", () => {
    params.testId = "tst_002";
    searchState.tab = "settings";
    render(<Page />);
    expect(screen.getByTestId("test-editor-title-input")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-save-button")).toBeInTheDocument();
    const titleInput = screen.getByTestId("test-editor-title-input") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Updated title" } });
    fireEvent.click(screen.getByTestId("test-editor-save-button"));
  });
});
