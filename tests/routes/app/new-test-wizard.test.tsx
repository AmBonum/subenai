import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigateMock,
    useSearch: () => ({ step: searchState.step, templateId: searchState.templateId }),
  };
});

// E44.fu1: the wizard now reads from useLibraryQuestions (real DB) and routes
// "Pridať otázky" through the QuestionPickerDialog. Stub the hook so step 3
// has a known dataset to drive the picker against.
vi.mock("@/lib/platform/queries", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/platform/queries")>("@/lib/platform/queries");
  return {
    ...actual,
    useLibraryQuestions: () => ({
      data: [
        {
          id: "stub-q-1",
          prompt: "Stub question prompt one",
          branch_slug: "phishing",
          difficulty: "easy",
          status: "approved",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "stub-q-2",
          prompt: "Stub question prompt two",
          branch_slug: "phishing",
          difficulty: "medium",
          status: "approved",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
    }),
  };
});

const searchState: { step: number; templateId?: string } = { step: 1 };

// Re-route navigate calls that change `search.step` into our local state so
// the next render reads the new step.
navigateMock.mockImplementation((arg: { search?: unknown; to?: string; params?: unknown }) => {
  if (typeof arg.search === "function") {
    const next = (arg.search as (p: typeof searchState) => typeof searchState)(searchState);
    searchState.step = next.step;
  } else if (arg.search && typeof arg.search === "object" && "step" in arg.search) {
    searchState.step = (arg.search as { step: number }).step;
  }
});

import { Route } from "@/routes/app.tests.new";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/tests/new (AH-5.2 wizard)", () => {
  beforeEach(() => {
    searchState.step = 1;
    searchState.templateId = undefined;
    navigateMock.mockClear();
    navigateMock.mockImplementation((arg: { search?: unknown; to?: string; params?: unknown }) => {
      if (typeof arg.search === "function") {
        const next = (arg.search as (p: typeof searchState) => typeof searchState)(searchState);
        searchState.step = next.step;
      }
    });
  });

  it("renders step 1 with disabled Next until title is filled", () => {
    render(<Page />);
    expect(screen.getByTestId("new-test-wizard-step-1-root")).toBeInTheDocument();
    expect(screen.getByTestId("new-test-wizard-progress")).toBeInTheDocument();
    const next = screen.getByTestId("new-test-wizard-step-1-next");
    expect(next).toBeDisabled();
    fireEvent.change(screen.getByTestId("new-test-wizard-title-input"), {
      target: { value: "My new test" },
    });
    expect(next).not.toBeDisabled();
  });

  it("step 1 → 2 → 3 advances via the Next buttons", () => {
    const { rerender } = render(<Page />);
    fireEvent.change(screen.getByTestId("new-test-wizard-title-input"), {
      target: { value: "Wizard test" },
    });
    fireEvent.click(screen.getByTestId("new-test-wizard-step-1-next"));
    rerender(<Page />);
    expect(screen.getByTestId("new-test-wizard-step-2-root")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("new-test-wizard-step-2-next"));
    rerender(<Page />);
    expect(screen.getByTestId("new-test-wizard-step-3-root")).toBeInTheDocument();
  });

  it("publish on step 3 creates a test and routes to step 4 with a share link", async () => {
    searchState.step = 3;
    const { rerender } = render(<Page />);
    // Title is empty on a fresh render but we set it earlier; populate step 1
    // by going back so the publish path has a valid title.
    fireEvent.click(screen.getByTestId("new-test-wizard-step-3-back"));
    rerender(<Page />);
    searchState.step = 1;
    rerender(<Page />);
    fireEvent.change(screen.getByTestId("new-test-wizard-title-input"), {
      target: { value: "Publish flow" },
    });
    fireEvent.click(screen.getByTestId("new-test-wizard-step-1-next"));
    rerender(<Page />);
    fireEvent.click(screen.getByTestId("new-test-wizard-step-2-next"));
    rerender(<Page />);
    // Empty state on step 3 — click the empty-state CTA to open the picker.
    fireEvent.click(screen.getByTestId("new-test-wizard-step-3-empty-cta"));
    // Picker dialog mounts. Tick the first question's checkbox and submit.
    fireEvent.click(screen.getByTestId("question-picker-row-stub-q-1-checkbox"));
    fireEvent.click(screen.getByTestId("question-picker-submit-button"));
    fireEvent.click(screen.getByTestId("new-test-wizard-step-3-next"));
    // useCreateTest is now async (Supabase INSERT); wait for the onSuccess
    // callback to flip the wizard to step 4 before asserting the share link.
    await waitFor(() => expect(searchState.step).toBe(4));
    rerender(<Page />);
    expect(screen.getByTestId("new-test-wizard-step-4-root")).toBeInTheDocument();
    const shareInput = screen.getByTestId("new-test-wizard-share-link-input") as HTMLInputElement;
    // share_id is now a 10-char base62 id (respondent regex compatible),
    // not a 36-char uuid.
    expect(shareInput.value).toMatch(/\/t\/[A-Za-z0-9]{6,12}$/);
  });
});
