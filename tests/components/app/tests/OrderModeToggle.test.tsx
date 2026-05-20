import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mutateMock = vi.fn();

vi.mock("@/lib/platform/queries", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/platform/queries")>("@/lib/platform/queries");
  return {
    ...actual,
    useUpdateTestOrderMode: () => ({
      mutate: mutateMock,
      isPending: false,
    }),
  };
});

import { OrderModeToggle } from "@/components/app/tests/OrderModeToggle";

describe("OrderModeToggle", () => {
  beforeEach(() => {
    mutateMock.mockClear();
  });

  it("renders both options and marks the current value as selected", () => {
    render(<OrderModeToggle testId="tst-1" value="fixed" />);
    expect(screen.getByTestId("test-editor-order-mode-root")).toBeInTheDocument();
    const fixedRadio = screen.getByTestId("test-editor-order-mode-radio-fixed");
    const randomRadio = screen.getByTestId("test-editor-order-mode-radio-random");
    expect(fixedRadio).toHaveAttribute("data-state", "checked");
    expect(randomRadio).toHaveAttribute("data-state", "unchecked");
  });

  it("fires the mutation when the user switches to random", () => {
    render(<OrderModeToggle testId="tst-1" value="fixed" />);
    fireEvent.click(screen.getByTestId("test-editor-order-mode-radio-random"));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toBe("random");
  });

  it("does NOT fire the mutation when the user clicks the already-selected option", () => {
    render(<OrderModeToggle testId="tst-1" value="fixed" />);
    fireEvent.click(screen.getByTestId("test-editor-order-mode-radio-fixed"));
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
