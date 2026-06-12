import type { JSX } from "react";
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

  it("renders the not-found state for an unknown id", async () => {
    params.testId = "tst_does_not_exist_xyz";
    render(<Page />);
    // The id is not in the seeded cache, so the route shows the loading
    // skeleton until the (stubbed) fetch resolves to null.
    expect(await screen.findByTestId("test-editor-not-found")).toBeInTheDocument();
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
  });

  // E50 status machine: publish only from draft, unpublish only from
  // published, unarchive only from archived. SEED_TESTS status cycle is
  // [published, published, published, draft, archived] → tst_002 published,
  // tst_004 draft, tst_005 archived.
  it("published test: shows Unpublish + Archive, hides Publish + Unarchive", () => {
    params.testId = "tst_002";
    render(<Page />);
    expect(screen.getByTestId("test-editor-unpublish-button")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-archive-button")).toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-publish-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-unarchive-button")).not.toBeInTheDocument();
  });

  it("draft test: shows Publish + Archive, hides Unpublish + Unarchive", () => {
    params.testId = "tst_004";
    render(<Page />);
    expect(screen.getByTestId("test-editor-publish-button")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-archive-button")).toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-unpublish-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-unarchive-button")).not.toBeInTheDocument();
  });

  it("archived test: shows only Unarchive among lifecycle actions", () => {
    params.testId = "tst_005";
    render(<Page />);
    expect(screen.getByTestId("test-editor-unarchive-button")).toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-publish-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-unpublish-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-archive-button")).not.toBeInTheDocument();
  });

  it("archive button opens the warning ConfirmDialog instead of mutating directly", () => {
    params.testId = "tst_004";
    render(<Page />);
    fireEvent.click(screen.getByTestId("test-editor-archive-button"));
    const dialog = screen.getByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("data-severity")).toBe("warning");
  });

  it("unpublish button opens the warning ConfirmDialog with the dead-link copy", () => {
    params.testId = "tst_002";
    render(<Page />);
    fireEvent.click(screen.getByTestId("test-editor-unpublish-button"));
    const dialog = screen.getByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("data-severity")).toBe("warning");
    expect(screen.getByTestId("app-shell-confirm-dialog-description").textContent).toMatch(
      /odkaz prestane/i,
    );
  });

  it("settings tab renders the intake-fields card and the audience chip", () => {
    params.testId = "tst_002";
    searchState.tab = "settings";
    render(<Page />);
    expect(screen.getByTestId("test-editor-intake-root")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-intake-name-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-intake-email-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-audience-chip")).toBeInTheDocument();
    // SEED_TESTS rows have audience_group_id: null → fallback chip copy.
    expect(screen.getByTestId("test-editor-audience-chip").textContent).toMatch(/Bez skupiny/);
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
