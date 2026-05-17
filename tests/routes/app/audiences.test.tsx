import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/app.audiences";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/audiences (AH-5.4)", () => {
  it("renders the page with new-group button and import-emails disabled", () => {
    render(<Page />);
    expect(screen.getByTestId("audiences-root")).toBeInTheDocument();
    expect(screen.getByTestId("audiences-new-group-button")).toBeInTheDocument();
    const importBtn = screen.getByTestId("audiences-import-emails-button") as HTMLButtonElement;
    expect(importBtn).toBeDisabled();
  });

  it("opens the editor when New is clicked and exposes save/cancel", () => {
    render(<Page />);
    fireEvent.click(screen.getByTestId("audiences-new-group-button"));
    expect(screen.getByTestId("audiences-editor-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("audiences-editor-tag-input")).toBeInTheDocument();
    expect(screen.getByTestId("audiences-editor-save-button")).toBeInTheDocument();
    expect(screen.getByTestId("audiences-editor-cancel-button")).toBeInTheDocument();
    // Save is disabled with empty name
    expect(screen.getByTestId("audiences-editor-save-button")).toBeDisabled();
    fireEvent.change(screen.getByTestId("audiences-editor-name-input"), {
      target: { value: "Test group" },
    });
    expect(screen.getByTestId("audiences-editor-save-button")).not.toBeDisabled();
  });
});
