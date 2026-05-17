import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders title + default confirm/cancel labels when open", () => {
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Naozaj zmazať?" onConfirm={vi.fn()} />,
    );
    expect(screen.getByTestId("app-shell-confirm-dialog-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-confirm-dialog-title").textContent).toBe("Naozaj zmazať?");
    expect(screen.getByTestId("app-shell-confirm-dialog-confirm").textContent).toBe("Potvrdiť");
    expect(screen.getByTestId("app-shell-confirm-dialog-cancel").textContent).toBe("Zrušiť");
  });

  it("fires onConfirm and closes when confirm is clicked", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="X" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("app-shell-confirm-dialog-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not fire onConfirm when cancel is clicked", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="X" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("app-shell-confirm-dialog-cancel"));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("uses custom labels when provided", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="X"
        confirmLabel="Áno"
        cancelLabel="Nie"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByTestId("app-shell-confirm-dialog-confirm").textContent).toBe("Áno");
    expect(screen.getByTestId("app-shell-confirm-dialog-cancel").textContent).toBe("Nie");
  });
});
