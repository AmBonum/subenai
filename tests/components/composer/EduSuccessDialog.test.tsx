import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EduSuccessDialog } from "@/components/composer/edu/intake/EduSuccessDialog";

vi.mock("@/lib/browser/clipboard", () => ({
  copyToClipboard: vi.fn(async () => true),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EduSuccessDialog — author copy-out flow", () => {
  function setup() {
    const onClose = vi.fn();
    render(
      <EduSuccessDialog
        publicUrl="https://subenai.sk/test/builder/abc123"
        resultsUrl="https://subenai.sk/test/builder/abc123/results"
        password="strong-author-pw-9"
        onClose={onClose}
      />,
    );
    return { onClose, user: userEvent.setup() };
  }

  it("shows public link, results link and password verbatim", () => {
    setup();
    expect(screen.getByText("https://subenai.sk/test/builder/abc123")).toBeInTheDocument();
    expect(screen.getByText("https://subenai.sk/test/builder/abc123/results")).toBeInTheDocument();
    expect(screen.getByText("strong-author-pw-9")).toBeInTheDocument();
  });

  it("close button is disabled until author ticks the acknowledgement checkbox", async () => {
    const { onClose, user } = setup();
    const closeBtn = screen.getByRole("button", { name: /Hotovo, zatvoriť/i });
    expect(closeBtn).toBeDisabled();
    await user.click(closeBtn);
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox"));
    expect(closeBtn).not.toBeDisabled();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("copy buttons exist for all three fields", () => {
    setup();
    const copyButtons = screen.getAllByRole("button", { name: /Skopírovať/i });
    expect(copyButtons).toHaveLength(3);
  });

  it("clicking a copy button calls clipboard with the right value", async () => {
    const clipboardMod = await import("@/lib/browser/clipboard");
    const { user } = setup();
    const passwordCopy = screen.getByRole("button", { name: /Skopírovať Heslo/i });
    await user.click(passwordCopy);
    expect(clipboardMod.copyToClipboard).toHaveBeenCalledWith("strong-author-pw-9");
  });
});
