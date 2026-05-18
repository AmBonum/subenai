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
    fireEvent.click(screen.getByTestId("new-test-wizard-question-add-button"));
    fireEvent.click(screen.getByTestId("new-test-wizard-step-3-next"));
    // useCreateTest is now async (Supabase INSERT); wait for the onSuccess
    // callback to flip the wizard to step 4 before asserting the share link.
    await waitFor(() => expect(searchState.step).toBe(4));
    rerender(<Page />);
    expect(screen.getByTestId("new-test-wizard-step-4-root")).toBeInTheDocument();
    const shareInput = screen.getByTestId("new-test-wizard-share-link-input") as HTMLInputElement;
    expect(shareInput.value).toMatch(/\/t\/[a-z0-9-]+$/);
  });
});
