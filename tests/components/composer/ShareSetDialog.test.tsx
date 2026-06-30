import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const copyMock = vi.fn(async (_url: string) => true);
vi.mock("@/lib/browser/clipboard", () => ({ copyToClipboard: (v: string) => copyMock(v) }));

import { ShareSetDialog } from "@/components/composer/ShareSetDialog";

describe("ShareSetDialog (E58)", () => {
  beforeEach(() => copyMock.mockClear());

  const url = "https://subenai.sk/test/builder/set_abc";

  it("shows the shareable link and an open link", () => {
    render(<ShareSetDialog publicUrl={url} onClose={() => {}} />);
    expect(screen.getByTestId("composer-share-success-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("composer-share-link")).toHaveTextContent(url);
    expect(screen.getByTestId("composer-share-open-link")).toHaveAttribute("href", url);
  });

  it("copies the link when the copy button is clicked", async () => {
    render(<ShareSetDialog publicUrl={url} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("composer-share-copy-button"));
    await waitFor(() => expect(copyMock).toHaveBeenCalledWith(url));
  });

  it("calls onClose when the Done button is clicked", () => {
    const onClose = vi.fn();
    render(<ShareSetDialog publicUrl={url} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("composer-share-close-button"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
