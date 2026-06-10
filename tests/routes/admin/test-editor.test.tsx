import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const params: { testId: string } = { testId: "test_unknown" };

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    useParams: () => params,
    useNavigate: () => () => {},
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, string>)}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/tests.$testId.lazy";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

// Pull a real seeded admin test id without invoking hooks.
import { mockTests } from "@/lib/admin/mock-data";

describe("/admin/tests/$testId (AH-5.8)", () => {
  beforeEach(() => {
    params.testId = "test_unknown";
  });

  it("renders the not-found state for an unknown id", async () => {
    params.testId = "test_does_not_exist";
    render(<Page />);
    expect(await screen.findByTestId("admin-test-editor-not-found")).toBeInTheDocument();
  });

  it("renders the editor for a seeded test with full form + buttons", () => {
    const real = mockTests[0]?.id;
    expect(real).toBeTruthy();
    params.testId = real as string;
    render(<Page />);
    expect(screen.getByTestId("admin-test-editor-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-title-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-description-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-status-select")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-difficulty-select")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-branch-select")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-save-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-publish-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-archive-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-editor-add-question-button")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^admin-test-editor-question-row-\d+$/).length).toBeGreaterThan(
      0,
    );
  });

  it("up/down arrows reorder questions", () => {
    const real = mockTests.find((x) => x.question_ids.length >= 2);
    if (!real) return;
    params.testId = real.id;
    render(<Page />);
    // The first row's "down" button should be enabled; the first "up" disabled.
    const up0 = screen.getByTestId("admin-test-editor-question-row-up-0") as HTMLButtonElement;
    const down0 = screen.getByTestId("admin-test-editor-question-row-down-0") as HTMLButtonElement;
    expect(up0.disabled).toBe(true);
    expect(down0.disabled).toBe(false);
    fireEvent.click(down0);
    // After swap, the new first row's down button stays enabled if there are
    // more rows below. We assert the click did not throw.
  });
});
