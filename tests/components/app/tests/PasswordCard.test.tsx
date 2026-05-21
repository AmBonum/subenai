import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const setMutate = vi.fn();
const clearMutate = vi.fn();

vi.mock("@/lib/platform/queries", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/platform/queries")>("@/lib/platform/queries");
  return {
    ...actual,
    useSetTestPassword: () => ({ mutate: setMutate, isPending: false }),
    useClearTestPassword: () => ({ mutate: clearMutate, isPending: false }),
  };
});

import { PasswordCard } from "@/components/app/tests/PasswordCard";

describe("PasswordCard", () => {
  beforeEach(() => {
    setMutate.mockReset();
    clearMutate.mockReset();
  });

  it("shows the 'unset' status + only the Set button when test has no password", () => {
    render(<PasswordCard testId="tst-1" hasPassword={false} />);
    expect(
      screen.getByTestId("test-editor-password-status").getAttribute("data-has-password"),
    ).toBe("false");
    expect(screen.getByTestId("test-editor-password-submit-button")).toBeInTheDocument();
    expect(screen.queryByTestId("test-editor-password-clear-button")).not.toBeInTheDocument();
  });

  it("shows the 'set' status + Clear button when test has a password", () => {
    render(<PasswordCard testId="tst-1" hasPassword={true} />);
    expect(
      screen.getByTestId("test-editor-password-status").getAttribute("data-has-password"),
    ).toBe("true");
    expect(screen.getByTestId("test-editor-password-clear-button")).toBeInTheDocument();
  });

  it("disables Submit when password is shorter than 8 chars", () => {
    render(<PasswordCard testId="tst-1" hasPassword={false} />);
    const pwd = screen.getByTestId("test-editor-password-input");
    fireEvent.change(pwd, { target: { value: "short" } });
    expect(screen.getByTestId("test-editor-password-submit-button")).toBeDisabled();
    expect(screen.getByTestId("test-editor-password-hint").textContent).toMatch(/8/);
  });

  it("disables Submit when password and confirm don't match", () => {
    render(<PasswordCard testId="tst-1" hasPassword={false} />);
    fireEvent.change(screen.getByTestId("test-editor-password-input"), {
      target: { value: "longenoughpwd" },
    });
    fireEvent.change(screen.getByTestId("test-editor-password-confirm"), {
      target: { value: "differentpwd" },
    });
    expect(screen.getByTestId("test-editor-password-submit-button")).toBeDisabled();
  });

  it("calls the set mutation with the password when Submit is clicked", () => {
    render(<PasswordCard testId="tst-1" hasPassword={false} />);
    fireEvent.change(screen.getByTestId("test-editor-password-input"), {
      target: { value: "valid-password-1" },
    });
    fireEvent.change(screen.getByTestId("test-editor-password-confirm"), {
      target: { value: "valid-password-1" },
    });
    fireEvent.click(screen.getByTestId("test-editor-password-submit-button"));
    expect(setMutate).toHaveBeenCalledTimes(1);
    expect(setMutate.mock.calls[0][0]).toBe("valid-password-1");
  });

  it("calls the clear mutation when Clear is clicked (only on hasPassword=true)", () => {
    render(<PasswordCard testId="tst-1" hasPassword={true} />);
    fireEvent.click(screen.getByTestId("test-editor-password-clear-button"));
    expect(clearMutate).toHaveBeenCalledTimes(1);
  });
});
