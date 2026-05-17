import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ShareDialog } from "@/components/user/ShareDialog";

describe("ShareDialog", () => {
  it("copies a /t/<shareId>-shaped URL to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ShareDialog open={true} onOpenChange={() => {}} shareId="ab12cd34" />);
    expect(screen.getByTestId("share-dialog-root")).toBeInTheDocument();
    const input = screen.getByTestId("share-dialog-url-input") as HTMLInputElement;
    expect(input.value).toMatch(/^https?:\/\/[^/]+\/t\/[a-z0-9-]+$/);

    fireEvent.click(screen.getByTestId("share-dialog-copy-link-button"));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toMatch(/^https?:\/\/[^/]+\/t\/[a-z0-9-]+$/);
  });
});
