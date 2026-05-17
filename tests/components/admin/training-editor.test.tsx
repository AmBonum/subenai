import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
  return { ...actual };
});

import { TrainingEditor } from "@/components/admin/TrainingEditor";

describe("TrainingEditor", () => {
  it("disables save when title is empty and enables it once a title is typed", () => {
    render(<TrainingEditor open onOpenChange={() => {}} training={null} />);
    const save = screen.getByTestId("training-editor-save-button") as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    const title = screen.getByTestId("training-editor-title-input") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Nový kurz" } });
    expect(save.disabled).toBe(false);
  });

  it("can add and remove module rows", () => {
    render(<TrainingEditor open onOpenChange={() => {}} training={null} />);
    fireEvent.click(screen.getByTestId("training-editor-module-add-button"));
    expect(screen.getByTestId("training-editor-module-row-0")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("training-editor-module-remove-0"));
    expect(screen.queryByTestId("training-editor-module-row-0")).toBeNull();
  });
});
